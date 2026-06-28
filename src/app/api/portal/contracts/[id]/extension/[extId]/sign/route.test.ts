import { describe, it, expect, vi, beforeEach } from "vitest";

// Steuerbare Rückgaben für die gemockten Module (vi.hoisted → in den Factories
// verfügbar).
const h = vi.hoisted(() => ({
  session: null as null | { org_id: string; customer_id: string },
  admin: null as unknown,
}));

vi.mock("@/lib/portal-auth", () => ({
  getPortalSession: async () => h.session,
  ipFromHeaders: () => "9.9.9.9",
}));
vi.mock("@/lib/supabase/server", () => ({
  createAdminClient: () => h.admin,
}));
// PDF-Assembly/Erzeugung wird isoliert (Kontrollfluss der Route testen, nicht
// das Stamping/Chrome).
vi.mock("@/lib/nachtrag-input", () => ({ buildNachtragInput: async () => ({}) }));
vi.mock("@/lib/nachtrag-pdf", () => ({ generateNachtragPdf: async () => Buffer.from("PDF") }));

import { POST } from "./route";

// Gültige PNG-Data-URL mit >1024 dekodierten Bytes (besteht isPngDataUrl+hasInk).
const validPng = "data:image/png;base64," + Buffer.alloc(2000).toString("base64");

type AdminCfg = {
  extension: Record<string, unknown> | null;
  updateRows?: { id: string }[];
  uploadErr?: { message: string } | null;
  acceptanceErr?: { code?: string } | null;
};

function makeAdmin(cfg: AdminCfg) {
  const eqCalls: [string, unknown][] = [];
  const uploadSpy = vi.fn(async () => ({ error: cfg.uploadErr ?? null }));
  const removeSpy = vi.fn(async () => ({ error: null }));
  const insertSpy = vi.fn();

  const single = (data: unknown) => {
    const b: Record<string, unknown> = {};
    b.select = () => b;
    b.eq = () => b;
    b.maybeSingle = async () => ({ data, error: null });
    return b;
  };

  const extBuilder = () => {
    let upd = false;
    const b: Record<string, unknown> = {};
    b.select = () => b;
    b.update = () => {
      upd = true;
      return b;
    };
    b.eq = (col: string, val: unknown) => {
      if (!upd) eqCalls.push([col, val]); // nur die Lade-Query (Scope) erfassen
      return b;
    };
    b.is = () => b;
    b.maybeSingle = async () => ({ data: cfg.extension, error: null });
    b.then = (resolve: (v: unknown) => void) =>
      resolve({ data: cfg.updateRows ?? [], error: null });
    return b;
  };

  const accBuilder = () => {
    const b: Record<string, unknown> = {};
    b.insert = (rows: unknown) => {
      insertSpy(rows);
      return b;
    };
    b.then = (resolve: (v: unknown) => void) => resolve({ error: cfg.acceptanceErr ?? null });
    return b;
  };

  const admin = {
    from: (t: string) =>
      t === "contract_extensions"
        ? extBuilder()
        : t === "organizations"
          ? single({ name: "Org", city: "M", logo_path: null, brand_color: null, landlord_signature_data: null })
          : t === "contracts"
            ? single({ contract_nr: "MV-1", renter_name: "R", plate: "P", vehicle_id: null, vehicle_type: null, daily_rate: 10 })
            : t === "contract_acceptances"
              ? accBuilder()
              : single(null),
    storage: { from: () => ({ upload: uploadSpy, remove: removeSpy }) },
  };
  return { admin, eqCalls, uploadSpy, removeSpy, insertSpy };
}

const req = (body: unknown) =>
  new Request("http://t/api", { method: "POST", body: JSON.stringify(body) });
const ctx = { params: { id: "ct1", extId: "ext1" } };

const signedExtension = {
  status: "bestaetigt",
  addendum_pdf_path: "org1/ct1/nachtrag-x.pdf",
  addendum_signed_at: null,
};

beforeEach(() => {
  h.session = { org_id: "o1", customer_id: "c1" };
  h.admin = null;
});

describe("Nachtrag-Sign-Route — Sicherheit", () => {
  it("ohne Session → 401", async () => {
    h.session = null;
    const res = await POST(req({ signature_data: validPng }), ctx);
    expect(res.status).toBe(401);
  });

  it("ungültige PNG → 400", async () => {
    const res = await POST(req({ signature_data: "kein-png" }), ctx);
    expect(res.status).toBe(400);
  });

  it("NEGATIV/SCOPE: fremde Kunden-Session (Zeile nicht gefunden) → 404", async () => {
    const m = makeAdmin({ extension: null });
    h.admin = m.admin;
    const res = await POST(req({ signature_data: validPng }), ctx);
    expect(res.status).toBe(404);
    // Beleg: alle vier Scope-Filter wurden auf die Lade-Query angewandt.
    expect(m.eqCalls).toContainEqual(["id", "ext1"]);
    expect(m.eqCalls).toContainEqual(["contract_id", "ct1"]);
    expect(m.eqCalls).toContainEqual(["org_id", "o1"]);
    expect(m.eqCalls).toContainEqual(["customer_id", "c1"]);
  });

  it("noch nicht genehmigt → 409", async () => {
    h.admin = makeAdmin({ extension: { ...signedExtension, status: "angefragt" } }).admin;
    const res = await POST(req({ signature_data: validPng }), ctx);
    expect(res.status).toBe(409);
  });

  it("bereits signiert (Früh-Check) → 409", async () => {
    h.admin = makeAdmin({
      extension: { ...signedExtension, addendum_signed_at: "2026-06-28T00:00:00Z" },
    }).admin;
    const res = await POST(req({ signature_data: validPng }), ctx);
    expect(res.status).toBe(409);
  });

  it("Happy Path → 200, Audit-Insert mit extension_id, kein Orphan-Cleanup", async () => {
    const m = makeAdmin({ extension: { ...signedExtension }, updateRows: [{ id: "ext1" }] });
    h.admin = m.admin;
    const res = await POST(req({ signature_data: validPng }), ctx);
    expect(res.status).toBe(200);
    expect(m.uploadSpy).toHaveBeenCalledTimes(1);
    expect(m.insertSpy).toHaveBeenCalledTimes(1);
    expect(m.insertSpy.mock.calls[0][0][0]).toMatchObject({
      extension_id: "ext1",
      contract_id: "ct1",
      org_id: "o1",
      customer_id: "c1",
      block_key: "addendum",
    });
    expect(m.removeSpy).not.toHaveBeenCalled();
  });

  it("TOCTOU: guarded Update trifft 0 Zeilen → 409 + Orphan-Cleanup, kein Audit", async () => {
    const m = makeAdmin({ extension: { ...signedExtension }, updateRows: [] });
    h.admin = m.admin;
    const res = await POST(req({ signature_data: validPng }), ctx);
    expect(res.status).toBe(409);
    expect(m.uploadSpy).toHaveBeenCalledTimes(1);
    expect(m.removeSpy).toHaveBeenCalledTimes(1); // verwaistes PDF weggeräumt
    expect(m.insertSpy).not.toHaveBeenCalled();
  });
});

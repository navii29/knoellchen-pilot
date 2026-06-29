import { describe, it, expect } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { applyTakeover } from "./contract-takeover-service";

// Mock-admin: chainable + thenable. Zeichnet die contracts-.in()-Aufrufe auf
// (Chunk-Größen) und liefert pro Chunk die passenden Vertrags-Rows. Kunden-Pool
// leer → jeder Vertrag wird neu angelegt (sequenzielle ids). plate=null → der
// Fahrzeug-Backfill-Schritt läuft gar nicht.
type Cfg = { rowsById: Map<string, Record<string, unknown>>; errorIds?: Set<string> };

function makeAdmin(cfg: Cfg) {
  const inCalls: string[][] = [];
  let custSeq = 0;
  const from = (table: string) => {
    const state = { op: "select" as "select" | "update" | "insert" };
    const b: Record<string, unknown> = {};
    b.select = () => b;
    b.update = () => ((state.op = "update"), b);
    b.insert = () => ((state.op = "insert"), b);
    b.eq = () => b;
    b.is = () => b;
    b.order = () => b;
    b.in = (_col: string, arr: string[]) => {
      inCalls.push(arr);
      if (cfg.errorIds && arr.some((id) => cfg.errorIds!.has(id)))
        return Promise.resolve({ data: null, error: { code: "PGRST", message: "Bad Request" } });
      return Promise.resolve({
        data: arr.map((id) => cfg.rowsById.get(id)).filter(Boolean),
        error: null,
      });
    };
    b.maybeSingle = async () => ({ data: null, error: null });
    b.single = async () => {
      if (table === "customers" && state.op === "insert") {
        custSeq++;
        return { data: { id: `cust-${custSeq}` }, error: null };
      }
      return { data: null, error: null };
    };
    b.then = (resolve: (v: unknown) => void) =>
      table === "customers" && state.op === "select"
        ? resolve({ data: [], error: null }) // leerer Kunden-Pool
        : resolve({ data: null, error: null }); // contracts.update(link) etc.
    return b;
  };
  return { admin: { from } as unknown as SupabaseClient, inCalls };
}

const makeRows = (n: number) => {
  const m = new Map<string, Record<string, unknown>>();
  const ids: string[] = [];
  for (let i = 1; i <= n; i++) {
    const id = `ct-${i}`;
    ids.push(id);
    m.set(id, { id, pickup_date: "2026-01-01", plate: null, renter_name: `Kunde ${i}` });
  }
  return { m, ids };
};

describe("applyTakeover — gechunktes Laden (Fix für 700→0-Kunden)", () => {
  it("250 IDs → 3 Chunk-Selects (100/100/50), alle Kunden angelegt", async () => {
    const { m, ids } = makeRows(250);
    const { admin, inCalls } = makeAdmin({ rowsById: m });
    const res = await applyTakeover(admin, "org-1", ids);
    expect(inCalls.length).toBe(3);
    expect(inCalls.map((c) => c.length)).toEqual([100, 100, 50]);
    expect(res.contractsRequested).toBe(250);
    expect(res.contractsLoaded).toBe(250);
    expect(res.customersCreated).toBe(250);
    expect(res.loadFailed).toBe(false);
  });

  it("Chunk-Fehler → loadFailed=true, wirft NICHT, andere Chunks laufen weiter", async () => {
    const { m, ids } = makeRows(250);
    const { admin } = makeAdmin({ rowsById: m, errorIds: new Set(["ct-150"]) }); // im 2. Chunk
    const res = await applyTakeover(admin, "org-1", ids);
    expect(res.loadFailed).toBe(true);
    expect(res.contractsLoaded).toBe(150); // Chunk 1 (100) + Chunk 3 (50)
    expect(res.customersCreated).toBe(150);
  });

  it("leere ID-Liste → kein Call, loadFailed false", async () => {
    const { admin, inCalls } = makeAdmin({ rowsById: new Map() });
    const res = await applyTakeover(admin, "org-1", []);
    expect(inCalls.length).toBe(0);
    expect(res).toEqual({
      contractsRequested: 0,
      contractsLoaded: 0,
      customersCreated: 0,
      loadFailed: false,
    });
  });
});

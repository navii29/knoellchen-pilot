import { NextResponse } from "next/server";
import { getPortalSession, ipFromHeaders } from "@/lib/portal-auth";
import { createAdminClient } from "@/lib/supabase/server";
import { generateContractPdf } from "@/lib/contract-pdf";
import type { Contract, Organization } from "@/lib/types";
import { isPngDataUrl } from "@/lib/utils";
import {
  loadCurrentTireForVehicle,
  loadCustomerForContract,
  loadSpecialTermsForContract,
  loadVehicleForContract,
} from "@/lib/contract-loaders";
import { runRiskCheck } from "@/lib/risk-check.server";

const loadLogoBase64 = async (
  admin: ReturnType<typeof createAdminClient>,
  logoPath: string | null | undefined
): Promise<string | null> => {
  if (!logoPath) return null;
  if (logoPath.toLowerCase().endsWith(".svg")) return null;
  const { data, error } = await admin.storage.from("brand").download(logoPath);
  if (error || !data) return null;
  const mime =
    logoPath.toLowerCase().endsWith(".jpg") ||
    logoPath.toLowerCase().endsWith(".jpeg")
      ? "image/jpeg"
      : "image/png";
  const buf = Buffer.from(await data.arrayBuffer());
  return `data:${mime};base64,${buf.toString("base64")}`;
};

export const maxDuration = 30;

type Ctx = { params: { id: string } };

// Eine leere/blanke Canvas erzeugt zwar eine gültige PNG-Data-URL, enthält aber
// kaum Daten. Mindestgröße der dekodierten Bytes erzwingen.
const hasInk = (dataUrl: string): boolean => {
  const b64 = dataUrl.slice(dataUrl.indexOf(",") + 1);
  return Buffer.from(b64, "base64").length > 1024;
};

export const POST = async (req: Request, { params }: Ctx) => {
  const session = await getPortalSession();
  if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const body = (await req.json().catch(() => ({}))) as {
    signature_data?: string;
    risk_consent?: boolean;
  };
  const sig = body.signature_data;
  // Längenlimit ZUERST — verhindert, dass ein riesiger Base64-String unnötig
  // verarbeitet (und persistiert) wird (~2 MB Data-URL).
  if (typeof sig === "string" && sig.length > 2_000_000) {
    return NextResponse.json(
      { error: "Unterschrift zu groß." },
      { status: 400 }
    );
  }
  if (!isPngDataUrl(sig)) {
    return NextResponse.json(
      { error: "Ungültige Unterschrift" },
      { status: 400 }
    );
  }
  if (!hasInk(sig)) {
    return NextResponse.json(
      { error: "Unterschrift fehlt." },
      { status: 400 }
    );
  }

  const admin = createAdminClient();
  const { data: contract } = await admin
    .from("contracts")
    .select("*")
    .eq("id", params.id)
    .eq("org_id", session.org_id)
    .eq("customer_id", session.customer_id)
    .maybeSingle();
  if (!contract)
    return NextResponse.json({ error: "Vertrag nicht gefunden" }, { status: 404 });
  const c = contract as Contract;
  if (c.signed_at) {
    return NextResponse.json({ error: "Bereits unterschrieben" }, { status: 409 });
  }

  const { data: org } = await admin
    .from("organizations")
    .select("*")
    .eq("id", session.org_id)
    .single();
  if (!org)
    return NextResponse.json({ error: "Organisation fehlt" }, { status: 500 });
  const orgRow = org as Organization;

  const [customer, vehicle, specialTerms, logoPngBase64] = await Promise.all([
    loadCustomerForContract(admin, session.org_id, session.customer_id),
    loadVehicleForContract(admin, session.org_id, c.vehicle_id, c.plate),
    loadSpecialTermsForContract(admin, session.org_id, c.selected_special_terms),
    loadLogoBase64(admin, orgRow.logo_path),
  ]);
  const tires = await loadCurrentTireForVehicle(admin, vehicle?.id ?? null);

  const signedAt = new Date().toISOString();
  const signedIp = ipFromHeaders();

  const snapshot: Contract = { ...c, signed_at: signedAt, signed_ip: signedIp };

  const pdfBuf = await generateContractPdf({
    org: orgRow,
    contract: snapshot,
    customer,
    vehicle,
    tires,
    logoPngBase64,
    signaturePngBase64: sig,
    specialTerms,
    brandColor: orgRow.brand_color,
  });

  const stamp = Date.now().toString(36);
  const path = `${session.org_id}/${c.id}/${stamp}.pdf`;
  const { error: upErr } = await admin.storage
    .from("generated-docs")
    .upload(path, pdfBuf, {
      contentType: "application/pdf",
      upsert: true,
    });
  if (upErr) return NextResponse.json({ error: upErr.message }, { status: 500 });

  // TOCTOU-sicher: nur schreiben, solange signed_at NULL ist. Bei parallelem
  // Doppel-Signieren gewinnt der erste Request; der zweite trifft 0 Zeilen → 409.
  const { data: updatedRows, error: updErr } = await admin
    .from("contracts")
    .update({
      signed_contract_path: path,
      signature_data: sig,
      signed_at: signedAt,
      signed_ip: signedIp,
      // Kunden-Unterschrift = letzter Self-Check-in-Schritt → Check-in fertig.
      // (Der Abschluss-Status hängt am checkin_step, nicht an signed_at, damit
      // ein Betreiber-/Dashboard-Signieren den Self-Check-in NICHT vorab als
      // "abgeschlossen" markiert.)
      checkin_step: 5,
    })
    .eq("id", c.id)
    .eq("org_id", session.org_id)
    .is("signed_at", null)
    .select("id");
  if (updErr) return NextResponse.json({ error: updErr.message }, { status: 500 });
  if (!updatedRows || updatedRows.length === 0) {
    return NextResponse.json({ error: "Bereits unterschrieben" }, { status: 409 });
  }

  // Pro-Block-Zustimmung revisionssicher erfassen (AGB + Sondervereinbarungen):
  // Text-Snapshot + Zeitstempel + IP, parallel zur Signatur.
  const rentalTerms = (orgRow as { rental_terms?: string | null }).rental_terms ?? null;
  await admin.from("contract_acceptances").insert([
    {
      contract_id: c.id,
      customer_id: session.customer_id,
      org_id: session.org_id,
      block_key: "agb",
      block_title: "Allgemeine Mietbedingungen",
      text_snapshot: rentalTerms,
      accepted_at: signedAt,
      ip: signedIp,
    },
    ...specialTerms.map((t) => ({
      contract_id: c.id,
      customer_id: session.customer_id,
      org_id: session.org_id,
      block_key: `special:${t.id}`,
      block_title: t.title,
      text_snapshot: t.text,
      accepted_at: signedAt,
      ip: signedIp,
    })),
  ]);

  // Best-effort risk check — MUST NOT fail the sign response, but the persisted
  // risk-consent record is GDPR-relevant, so it must actually complete.
  // Next.js 14.2.35 does NOT ship `unstable_after`/`after` (verified: absent from
  // next/server and the whole next dist tree), so a floating promise would be
  // dropped when the serverless instance freezes after the response. We therefore
  // AWAIT the guarded call: errors are swallowed (never blocks/fails the sign),
  // but completion is guaranteed before the instance can freeze.
  // Only runs when the customer explicitly gave risk-consent during sign.
  if (body.risk_consent === true) {
    await runRiskCheck(admin, session.org_id, c.id, { setConsent: true }).catch(
      () => undefined
    );
  }

  return NextResponse.json({ ok: true, signed_at: signedAt });
};

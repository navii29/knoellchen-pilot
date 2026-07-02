import { NextResponse } from "next/server";
import { getPortalSession, ipFromHeaders } from "@/lib/portal-auth";
import { createAdminClient } from "@/lib/supabase/server";
import { hasInk, isPngDataUrl, fmtDate } from "@/lib/utils";
import { buildNachtragInput } from "@/lib/nachtrag-input";
import { generateNachtragPdf } from "@/lib/nachtrag-pdf";

// Mieter signiert seinen genehmigten "Nachtrag zum Mietvertrag" digital im
// Portal. Spiegelt die Vertrags-Signatur-Route mit den Verbesserungen aus der
// Landkarte: geprüfter Audit-Insert, Orphan-Cleanup bei verlorenem Race.
// Geteilte Helfer (getPortalSession, isPngDataUrl, hasInk, ipFromHeaders,
// buildNachtragInput, generateNachtragPdf) — keine Kopie.

export const maxDuration = 30;

type Ctx = { params: { id: string; extId: string } };

export const POST = async (req: Request, { params }: Ctx) => {
  // 1. AUTH
  const session = await getPortalSession();
  if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  // 2. PNG-Validierung — Reihenfolge exakt wie Vertrags-Route.
  const body = (await req.json().catch(() => ({}))) as { signature_data?: string };
  const sig = body.signature_data;
  if (typeof sig === "string" && sig.length > 2_000_000) {
    return NextResponse.json({ error: "Unterschrift zu groß." }, { status: 400 });
  }
  if (!isPngDataUrl(sig)) {
    return NextResponse.json({ error: "Ungültige Unterschrift" }, { status: 400 });
  }
  if (!hasInk(sig)) {
    return NextResponse.json({ error: "Unterschrift fehlt." }, { status: 400 });
  }

  const admin = createAdminClient();

  // 3. SCOPE — Verlängerung STRENG laden: eigene Verlängerung (extId) des
  // eigenen Vertrags (id) der eigenen Org + des eigenen Mieters (4 .eq).
  const { data: extension } = await admin
    .from("contract_extensions")
    .select("*")
    .eq("id", params.extId)
    .eq("contract_id", params.id)
    .eq("org_id", session.org_id) // SECURITY: Mandanten-Isolation
    .eq("customer_id", session.customer_id) // SECURITY: nur eigene Verlängerung
    .maybeSingle();
  if (!extension) {
    return NextResponse.json({ error: "Nachtrag nicht gefunden" }, { status: 404 });
  }

  // 4. VORBEDINGUNGEN (Früh-Check).
  if (extension.status !== "bestaetigt") {
    return NextResponse.json({ error: "Nachtrag noch nicht genehmigt." }, { status: 409 });
  }
  if (!extension.addendum_pdf_path) {
    return NextResponse.json({ error: "Kein Nachtrag-PDF vorhanden." }, { status: 409 });
  }
  if (extension.addendum_signed_at) {
    return NextResponse.json({ error: "Bereits unterschrieben" }, { status: 409 });
  }

  // 5. Daten laden (org-scoped) — inkl. Vermieter-Signatur.
  const { data: org } = await admin
    .from("organizations")
    .select("name, city, logo_path, brand_color, landlord_signature_data")
    .eq("id", session.org_id)
    .maybeSingle();
  const { data: contract } = await admin
    .from("contracts")
    .select("contract_nr, renter_name, plate, vehicle_id, vehicle_type, daily_rate, weekly_rate, monthly_rate")
    .eq("id", params.id)
    .eq("org_id", session.org_id)
    .maybeSingle();
  if (!org || !contract) {
    return NextResponse.json({ error: "Vertrag/Organisation nicht ladbar." }, { status: 500 });
  }

  const signedAt = new Date().toISOString();
  const signedIp = ipFromHeaders();

  // Signiertes Nachtrag-PDF: gleiche Assembly wie approve + Mieter-/Vermieter-
  // Signatur (geteilter buildNachtragInput).
  const input = await buildNachtragInput(admin, {
    orgId: session.org_id,
    org: org as {
      name: string | null;
      city: string | null;
      logo_path: string | null;
      brand_color: string | null;
    },
    contract: contract as {
      contract_nr: string | null;
      renter_name: string | null;
      plate: string | null;
      vehicle_id: string | null;
      vehicle_type: string | null;
      daily_rate: number | null;
      weekly_rate: number | null;
      monthly_rate: number | null;
    },
    extension: extension as {
      customer_id: string | null;
      current_return_date: string | null;
      requested_return_date: string | null;
      extra_days: number | null;
    },
    dateStr: fmtDate(signedAt),
    signatureDataUri: sig,
    landlordSignatureDataUri: (org.landlord_signature_data as string | null) ?? null,
  });
  const pdfBuf = await generateNachtragPdf(input);

  // 6/7. Upload ZUERST → addendum_signed_path zeigt nie auf ein fehlendes
  // Objekt. Eigener Pfad, GETRENNT vom unsignierten addendum_pdf_path.
  const stamp = Date.now().toString(36);
  const path = `${session.org_id}/${params.id}/nachtrag-signed-${stamp}.pdf`;
  const { error: upErr } = await admin.storage
    .from("generated-docs")
    .upload(path, pdfBuf, { contentType: "application/pdf", upsert: true });
  if (upErr) return NextResponse.json({ error: upErr.message }, { status: 500 });

  // 8. TOCTOU-Guard: nur schreiben, solange addendum_signed_at NULL ist. Voller
  // Scope ERNEUT (Defense-in-Depth) + status-Guard. 0 Zeilen = verloren/doppelt.
  const { data: updatedRows, error: updErr } = await admin
    .from("contract_extensions")
    .update({
      addendum_signature_data: sig,
      addendum_signed_at: signedAt,
      addendum_signed_ip: signedIp,
      addendum_signed_path: path,
    })
    .eq("id", params.extId)
    .eq("contract_id", params.id)
    .eq("org_id", session.org_id)
    .eq("customer_id", session.customer_id)
    .eq("status", "bestaetigt")
    .is("addendum_signed_at", null)
    .select("id");
  if (updErr) return NextResponse.json({ error: updErr.message }, { status: 500 });
  if (!updatedRows || updatedRows.length === 0) {
    // Race verloren / schon signiert → frisch hochgeladenes Orphan-PDF best-
    // effort wegräumen: kein toter Pfad UND kein Orphan.
    await admin.storage.from("generated-docs").remove([path]).catch(() => {});
    return NextResponse.json({ error: "Bereits unterschrieben" }, { status: 409 });
  }

  // 9. AUDIT (geprüft + PII-frei): Nachtrag-Zustimmung mit extension_id
  // (Migration 071). best-effort — Fehler kippt die Signatur NICHT, wird aber
  // sichtbar geloggt (nur error.code + UUID, keine PII).
  const { error: accErr } = await admin.from("contract_acceptances").insert([
    {
      contract_id: params.id,
      customer_id: session.customer_id,
      org_id: session.org_id,
      extension_id: params.extId,
      block_key: "addendum",
      block_title: "Nachtrag zum Mietvertrag (Verlängerung)",
      text_snapshot: null,
      accepted_at: signedAt,
      ip: signedIp,
    },
  ]);
  if (accErr) {
    console.error(
      "[addendum-sign] acceptance insert fehlgeschlagen (extension_id=" +
        params.extId +
        "):",
      accErr.code ?? ""
    );
  }

  return NextResponse.json({ ok: true, signed_at: signedAt });
};

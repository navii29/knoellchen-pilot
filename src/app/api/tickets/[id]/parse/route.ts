import { NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { parseTicketImage } from "@/lib/anthropic";
import { normalizePlate } from "@/lib/plate";
import { computeCharge } from "@/lib/charge";

export const maxDuration = 60;

export const POST = async (
  _req: Request,
  { params }: { params: { id: string } }
) => {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const { data: profile } = await supabase
    .from("users")
    .select("org_id")
    .eq("id", user.id)
    .single();
  if (!profile) return NextResponse.json({ error: "No profile" }, { status: 401 });

  const admin = createAdminClient();
  const { data: ticket, error: tErr } = await admin
    .from("tickets")
    .select("*")
    .eq("id", params.id)
    .single();
  // Mandanten-Isolation: Ticket muss zur Organisation des Aufrufers gehören.
  // Ohne diese Prüfung könnte ein eingeloggter Nutzer fremde Strafzettel
  // auslesen (PII), deren Daten überschreiben und fremdes KI-Budget verbrauchen.
  if (tErr || !ticket || ticket.org_id !== profile.org_id) {
    return NextResponse.json({ error: "Ticket nicht gefunden" }, { status: 404 });
  }
  if (!ticket.upload_path)
    return NextResponse.json({ error: "Kein Upload vorhanden" }, { status: 400 });

  const { data: file, error: dlErr } = await admin.storage
    .from("ticket-uploads")
    .download(ticket.upload_path);
  if (dlErr || !file) return NextResponse.json({ error: dlErr?.message || "Download fehlgeschlagen" }, { status: 500 });

  const buf = Buffer.from(await file.arrayBuffer());
  const base64 = buf.toString("base64");
  const ext = ticket.upload_path.split(".").pop()?.toLowerCase();
  const mediaType =
    ext === "pdf"
      ? "application/pdf"
      : ext === "png"
      ? "image/png"
      : ext === "webp"
      ? "image/webp"
      : "image/jpeg";

  let parsed;
  try {
    parsed = await parseTicketImage(base64, mediaType as "image/jpeg" | "image/png" | "image/webp" | "application/pdf");
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: `Software-Auslesen fehlgeschlagen: ${msg}` }, { status: 500 });
  }

  const d = parsed.data;

  // Org-Default für Bearbeitungsgebühr (jetzt als NETTO interpretiert)
  const { data: org } = await admin
    .from("organizations")
    .select("processing_fee, kleinunternehmer")
    .eq("id", ticket.org_id)
    .maybeSingle();
  const feeNet = Number(org?.processing_fee ?? 25) || 25;
  const breakdown = computeCharge({
    fineAmount: d.fine_amount ?? 0,
    chargeFine: ticket.charge_fine ?? true,
    feeNet,
    chargeFee: ticket.charge_fee ?? true,
    vatRate: org?.kleinunternehmer ? 0 : undefined,
  });

  await admin
    .from("tickets")
    .update({
      reference_nr: d.reference_nr || null,
      authority: d.authority || null,
      authority_street: d.authority_street || null,
      authority_zip: d.authority_zip || null,
      authority_city: d.authority_city || null,
      plate: normalizePlate(d.plate) || null,
      vehicle_type: d.vehicle_type || null,
      offense_date: d.offense_date || null,
      offense_time: d.offense_time || null,
      location: d.location || null,
      offense: d.offense || null,
      offense_details: d.offense_details || null,
      fine_amount: d.fine_amount ?? null,
      points: d.points ?? 0,
      deadline: d.deadline || null,
      ai_confidence: d.confidence ?? 0.9,
      ai_raw_response: parsed.raw as Record<string, unknown>,
      // Charge-Aufschlüsselung initialisieren falls noch leer
      ...(ticket.fee_net == null
        ? {
            fee_net: breakdown.fee_net,
            fee_vat: breakdown.fee_vat,
            fee_gross: breakdown.fee_gross,
            total_charge: breakdown.total_charge,
            processing_fee: breakdown.fee_gross,
          }
        : {}),
      updated_at: new Date().toISOString(),
    })
    .eq("id", ticket.id);

  await admin.from("ticket_logs").insert({
    ticket_id: ticket.id,
    action: "parsed",
    details: { confidence: d.confidence ?? 0.9 },
  });

  return NextResponse.json({ ok: true, data: d });
};

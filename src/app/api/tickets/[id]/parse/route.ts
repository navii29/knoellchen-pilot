import { NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { parseTicketImage } from "@/lib/anthropic";

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

  const admin = createAdminClient();
  const { data: ticket, error: tErr } = await admin
    .from("tickets")
    .select("*")
    .eq("id", params.id)
    .single();
  if (tErr || !ticket) return NextResponse.json({ error: "Ticket nicht gefunden" }, { status: 404 });
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
    return NextResponse.json({ error: `Claude Vision fehlgeschlagen: ${msg}` }, { status: 500 });
  }

  const d = parsed.data;
  await admin
    .from("tickets")
    .update({
      reference_nr: d.reference_nr || null,
      authority: d.authority || null,
      plate: d.plate || null,
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

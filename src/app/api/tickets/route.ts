import { NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { nextTicketNr } from "@/lib/utils";

export const POST = async (req: Request) => {
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

  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Datei fehlt" }, { status: 400 });
  }
  if (file.size > 12 * 1024 * 1024) {
    return NextResponse.json({ error: "Datei zu groß (max 12 MB)" }, { status: 400 });
  }

  const admin = createAdminClient();
  const ext = (file.name.split(".").pop() || "bin").toLowerCase();
  const arrayBuffer = await file.arrayBuffer();

  // Insert mit Retry-Schleife: nextTicketNr() kann (selten) mit
  // UNIQUE(org_id, ticket_nr) kollidieren (Postgres 23505). In dem Fall ziehen
  // wir eine neue Ticket-Nr und versuchen es erneut — ohne 500 für den Nutzer.
  // Die Datei wird erst NACH erfolgreichem Insert hochgeladen, damit eine
  // fehlgeschlagene Anlage keine verwaiste Upload-Datei hinterlässt.
  let ticket: { id: string; ticket_nr: string } | null = null;
  let path = "";
  for (let attempt = 0; attempt < 5; attempt++) {
    const ticketNr = nextTicketNr();
    path = `${profile.org_id}/${ticketNr}/upload.${ext}`;
    const { data, error: insertErr } = await admin
      .from("tickets")
      .insert({
        org_id: profile.org_id,
        ticket_nr: ticketNr,
        status: "neu",
        upload_path: path,
        source: "upload",
        processing_fee: 25,
      })
      .select("id, ticket_nr")
      .single();
    if (!insertErr && data) {
      ticket = data;
      break;
    }
    // 23505 = unique_violation → neue Nr ziehen und erneut versuchen.
    if (insertErr?.code === "23505") continue;
    if (insertErr) {
      // Anderer Fehler — nicht die Rohmeldung durchreichen.
      return NextResponse.json(
        { error: "Ticket konnte nicht angelegt werden" },
        { status: 500 }
      );
    }
  }
  if (!ticket) {
    return NextResponse.json(
      { error: "Ticket konnte nicht angelegt werden — bitte erneut versuchen" },
      { status: 500 }
    );
  }

  // Datei hochladen. Schlägt der Upload fehl, das gerade angelegte Ticket wieder
  // entfernen (Kompensation) — kein Ticket ohne Upload-Datei stehen lassen.
  const { error: upErr } = await admin.storage
    .from("ticket-uploads")
    .upload(path, arrayBuffer, { contentType: file.type, upsert: true });
  if (upErr) {
    await admin.from("tickets").delete().eq("id", ticket.id);
    return NextResponse.json(
      { error: "Datei konnte nicht gespeichert werden" },
      { status: 500 }
    );
  }

  await admin.from("ticket_logs").insert({
    ticket_id: ticket.id,
    action: "upload",
    details: { filename: file.name, size: file.size },
  });

  return NextResponse.json({ ok: true, ticket });
};

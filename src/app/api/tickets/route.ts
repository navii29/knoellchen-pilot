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
  const ticketNr = nextTicketNr();
  const ext = (file.name.split(".").pop() || "bin").toLowerCase();
  const path = `${profile.org_id}/${ticketNr}/upload.${ext}`;

  const arrayBuffer = await file.arrayBuffer();
  const { error: upErr } = await admin.storage
    .from("ticket-uploads")
    .upload(path, arrayBuffer, { contentType: file.type, upsert: true });
  if (upErr) return NextResponse.json({ error: upErr.message }, { status: 500 });

  const { data: ticket, error: insertErr } = await admin
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
  if (insertErr) return NextResponse.json({ error: insertErr.message }, { status: 500 });

  await admin.from("ticket_logs").insert({
    ticket_id: ticket.id,
    action: "upload",
    details: { filename: file.name, size: file.size },
  });

  return NextResponse.json({ ok: true, ticket });
};

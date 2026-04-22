import { NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import {
  generateInvoicePdf,
  generateLetterPdf,
  generateQuestionnairePdf,
} from "@/lib/pdf-generator";
import type { Contract, Organization, Ticket } from "@/lib/types";

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
  const [{ data: ticket }, { data: org }] = await Promise.all([
    admin.from("tickets").select("*").eq("id", params.id).single(),
    admin.from("organizations").select("*").eq("id", profile.org_id).single(),
  ]);
  if (!ticket || ticket.org_id !== profile.org_id)
    return NextResponse.json({ error: "Ticket nicht gefunden" }, { status: 404 });
  if (!org) return NextResponse.json({ error: "Organisation nicht gefunden" }, { status: 404 });

  const t = ticket as Ticket;
  const o = org as Organization;

  const { data: contractData } = t.contract_id
    ? await admin.from("contracts").select("*").eq("id", t.contract_id).maybeSingle()
    : { data: null };
  const contract = (contractData as Contract | null) ?? null;

  const letter = generateLetterPdf(o, t, contract);
  const invoice = generateInvoicePdf(o, t, contract);
  const questionnaire = generateQuestionnairePdf(o, t, contract);

  const base = `${t.org_id}/${t.ticket_nr}`;
  const paths = {
    letter_path: `${base}/anschreiben.pdf`,
    invoice_path: `${base}/rechnung.pdf`,
    questionnaire_path: `${base}/zeugenfragebogen.pdf`,
  };

  const uploads = await Promise.all([
    admin.storage.from("generated-docs").upload(paths.letter_path, letter, {
      contentType: "application/pdf",
      upsert: true,
    }),
    admin.storage.from("generated-docs").upload(paths.invoice_path, invoice, {
      contentType: "application/pdf",
      upsert: true,
    }),
    admin.storage.from("generated-docs").upload(paths.questionnaire_path, questionnaire, {
      contentType: "application/pdf",
      upsert: true,
    }),
  ]);
  const errored = uploads.find((u) => u.error);
  if (errored?.error)
    return NextResponse.json({ error: errored.error.message }, { status: 500 });

  await admin.from("tickets").update({ ...paths, updated_at: new Date().toISOString() }).eq("id", t.id);
  await admin.from("ticket_logs").insert({
    ticket_id: t.id,
    action: "documents",
    details: paths,
  });

  return NextResponse.json({ ok: true, paths });
};

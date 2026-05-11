import { NextResponse } from "next/server";
import { getPortalSession } from "@/lib/portal-auth";
import { createAdminClient } from "@/lib/supabase/server";

export type PortalDocument = {
  kind: "contract" | "ticket_letter" | "ticket_invoice" | "ticket_questionnaire";
  title: string;
  subtitle: string;
  date: string;
  download_url: string;
};

export const GET = async () => {
  const session = await getPortalSession();
  if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const admin = createAdminClient();

  const [{ data: contracts }, { data: tickets }] = await Promise.all([
    admin
      .from("contracts")
      .select(
        "id, contract_nr, plate, signed_contract_path, signed_at, pickup_date"
      )
      .eq("org_id", session.org_id)
      .eq("customer_id", session.customer_id)
      .order("pickup_date", { ascending: false }),
    admin
      .from("tickets")
      .select(
        "id, ticket_nr, plate, letter_path, invoice_path, questionnaire_path, contract_id, created_at, contracts!inner(customer_id)"
      )
      .eq("org_id", session.org_id)
      .eq("contracts.customer_id", session.customer_id)
      .order("created_at", { ascending: false }),
  ]);

  const docs: PortalDocument[] = [];
  for (const c of contracts ?? []) {
    if (c.signed_contract_path) {
      docs.push({
        kind: "contract",
        title: `Mietvertrag ${c.contract_nr}`,
        subtitle: c.plate,
        date: c.signed_at ?? c.pickup_date,
        download_url: `/api/portal/contracts/${c.id}/contract-pdf`,
      });
    }
  }

  for (const t of tickets ?? []) {
    if (t.letter_path)
      docs.push({
        kind: "ticket_letter",
        title: `Strafzettel-Anschreiben ${t.ticket_nr}`,
        subtitle: t.plate ?? "",
        date: t.created_at,
        download_url: `/api/portal/tickets/${t.id}/file?kind=letter`,
      });
    if (t.invoice_path)
      docs.push({
        kind: "ticket_invoice",
        title: `Rechnung ${t.ticket_nr}`,
        subtitle: t.plate ?? "",
        date: t.created_at,
        download_url: `/api/portal/tickets/${t.id}/file?kind=invoice`,
      });
    if (t.questionnaire_path)
      docs.push({
        kind: "ticket_questionnaire",
        title: `Zeugenfragebogen ${t.ticket_nr}`,
        subtitle: t.plate ?? "",
        date: t.created_at,
        download_url: `/api/portal/tickets/${t.id}/file?kind=questionnaire`,
      });
  }

  docs.sort((a, b) => (a.date < b.date ? 1 : -1));
  return NextResponse.json({ ok: true, documents: docs });
};

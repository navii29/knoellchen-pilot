import { Download, FileText } from "lucide-react";
import { getPortalCustomer } from "@/lib/portal-auth";
import { createAdminClient } from "@/lib/supabase/server";
import { fmtDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

type Doc = {
  kind: string;
  title: string;
  subtitle: string;
  date: string;
  url: string;
};

export default async function PortalDocumentsPage() {
  const ctx = await getPortalCustomer();
  if (!ctx) return null;

  const admin = createAdminClient();
  const [{ data: contracts }, { data: tickets }] = await Promise.all([
    admin
      .from("contracts")
      .select(
        "id, contract_nr, plate, signed_contract_path, signed_at, pickup_date"
      )
      .eq("org_id", ctx.session.org_id)
      .eq("customer_id", ctx.session.customer_id)
      .order("pickup_date", { ascending: false }),
    admin
      .from("tickets")
      .select(
        "id, ticket_nr, plate, letter_path, invoice_path, questionnaire_path, contract_id, created_at, contracts!inner(customer_id)"
      )
      .eq("org_id", ctx.session.org_id)
      .eq("contracts.customer_id", ctx.session.customer_id)
      .order("created_at", { ascending: false }),
  ]);

  const docs: Doc[] = [];
  for (const c of contracts ?? []) {
    if (c.signed_contract_path) {
      docs.push({
        kind: "Mietvertrag",
        title: `Mietvertrag ${c.contract_nr}`,
        subtitle: c.plate,
        date: c.signed_at ?? c.pickup_date,
        url: `/api/portal/contracts/${c.id}/contract-pdf`,
      });
    }
  }
  for (const t of tickets ?? []) {
    const items = [
      { col: t.letter_path, kind: "Anschreiben", q: "letter" },
      { col: t.invoice_path, kind: "Rechnung", q: "invoice" },
      { col: t.questionnaire_path, kind: "Zeugenfragebogen", q: "questionnaire" },
    ];
    for (const it of items) {
      if (it.col) {
        docs.push({
          kind: it.kind,
          title: `${it.kind} ${t.ticket_nr}`,
          subtitle: t.plate ?? "",
          date: t.created_at,
          url: `/api/portal/tickets/${t.id}/file?kind=${it.q}`,
        });
      }
    }
  }
  docs.sort((a, b) => (a.date < b.date ? 1 : -1));

  return (
    <div className="px-5 py-3 space-y-3">
      <h1 className="font-display text-[22px] tracking-tight font-medium text-stone-900 mb-1">
        Dokumente
      </h1>

      {docs.length === 0 ? (
        <div className="rounded-2xl bg-white ring-1 ring-stone-200 px-5 py-8 text-center">
          <FileText size={24} className="mx-auto text-stone-300 mb-2" />
          <div className="text-sm text-stone-500">Noch keine Dokumente vorhanden.</div>
        </div>
      ) : (
        <div className="rounded-2xl bg-white ring-1 ring-stone-200 divide-y divide-stone-100 overflow-hidden">
          {docs.map((d, i) => (
            <a
              key={`${d.url}-${i}`}
              href={d.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 px-4 py-3 hover:bg-stone-50"
            >
              <div className="w-9 h-9 rounded-lg bg-stone-100 flex items-center justify-center shrink-0">
                <FileText size={15} className="text-stone-600" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[14px] font-medium text-stone-900 truncate">
                  {d.title}
                </div>
                <div className="text-[12px] text-stone-500 mt-0.5">
                  {d.subtitle && (
                    <>
                      <span className="font-mono">{d.subtitle}</span>
                      <span className="mx-1.5">·</span>
                    </>
                  )}
                  <span className="tabular-nums">{fmtDate(d.date)}</span>
                </div>
              </div>
              <Download size={14} className="text-stone-400 shrink-0" />
            </a>
          ))}
        </div>
      )}
    </div>
  );
}

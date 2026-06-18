import { Download, FileText } from "lucide-react";
import { getPortalCustomer } from "@/lib/portal-auth";
import { createAdminClient } from "@/lib/supabase/server";
import { fmtDate } from "@/lib/utils";
import { Plate } from "@/components/ui/Plate";
import { Surface } from "@/components/portal/kit/Surface";
import { EmptyState } from "@/components/portal/kit/EmptyState";

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
      .select("id, contract_nr, plate, signed_contract_path, signed_at, pickup_date")
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
    <div className="px-5 py-4 space-y-4">
      <h1 className="font-display text-[22px] tracking-tightest font-bold text-ink px-1">
        Dokumente
      </h1>

      {docs.length === 0 ? (
        <Surface>
          <EmptyState
            Icon={FileText}
            title="Keine Dokumente"
            text="Hier erscheinen Verträge und Strafzettel-Dokumente."
          />
        </Surface>
      ) : (
        <Surface padding="p-0" className="overflow-hidden">
          <div className="divide-y divide-hairline">
            {docs.map((d, i) => (
              <a
                key={`${d.url}-${i}`}
                href={d.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 px-4 py-3 hover:bg-paper/40 transition-colors"
              >
                <div className="w-9 h-9 rounded-xl bg-signal-soft text-signal-ink flex items-center justify-center shrink-0">
                  <FileText size={15} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[14px] font-medium text-ink truncate">{d.title}</div>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    {d.subtitle && <Plate value={d.subtitle} size="sm" />}
                    <span className="text-[12px] text-ink-muted font-mono tnum">
                      {fmtDate(d.date)}
                    </span>
                  </div>
                </div>
                <Download size={13} className="text-ink-muted shrink-0" />
              </a>
            ))}
          </div>
        </Surface>
      )}
    </div>
  );
}

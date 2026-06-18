import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Download } from "lucide-react";
import { requirePortal } from "@/lib/portal-auth";
import { fmtDate, fmtEur } from "@/lib/utils";
import { Surface } from "@/components/portal/kit/Surface";
import { SectionLabel } from "@/components/portal/kit/SectionLabel";
import { AmountRow } from "@/components/portal/kit/AmountRow";
import { StatusBadge } from "@/components/portal/kit/StatusBadge";
import { StatusTimeline, type TimelineStep } from "@/components/portal/kit/StatusTimeline";
import { TicketActions } from "@/components/portal/TicketActions";

export const dynamic = "force-dynamic";

type TDetail = {
  id: string;
  ticket_nr: string | null;
  status: string;
  offense: string | null;
  offense_details: string | null;
  location: string | null;
  offense_date: string | null;
  offense_time: string | null;
  authority: string | null;
  reference_nr: string | null;
  fine_amount: number | null;
  deadline: string | null;
  charge_fine: boolean | null;
  charge_fee: boolean | null;
  fee_net: number | null;
  fee_vat: number | null;
  total_charge: number | null;
  paid: boolean | null;
  payment_status: string | null;
  letter_path: string | null;
  invoice_path: string | null;
  acknowledged_at: string | null;
  dispute_status: string | null;
};

export default async function PortalTicketDetail({ params }: { params: { id: string } }) {
  const ctx = await requirePortal();
  if (!ctx) return null;

  const { data: ticket } = await ctx.supa
    .from("tickets")
    .select(
      "id, ticket_nr, status, offense, offense_details, location, offense_date, offense_time, authority, reference_nr, fine_amount, deadline, charge_fine, charge_fee, fee_net, fee_vat, total_charge, paid, payment_status, letter_path, invoice_path, acknowledged_at, dispute_status, contracts!inner(customer_id)"
    )
    .eq("id", params.id)
    .eq("org_id", ctx.session.org_id)
    .eq("contracts.customer_id", ctx.session.customer_id)
    .maybeSingle();
  if (!ticket) notFound();
  const t = ticket as unknown as TDetail;

  const paid = !!t.paid || t.payment_status === "bezahlt";
  const steps: TimelineStep[] = [
    { label: "Eingegangen", done: true },
    {
      label: "Fahrer zugeordnet",
      done: ["zugeordnet", "weiterbelastet", "bezahlt"].includes(t.status),
    },
    { label: "Weiterbelastet", done: ["weiterbelastet", "bezahlt"].includes(t.status) },
    { label: "Bezahlt", done: paid },
  ];
  const cur = steps.findIndex((s) => !s.done);
  if (cur >= 0) steps[cur].current = true;

  const docs = [
    t.letter_path ? { label: "Anschreiben", q: "letter" } : null,
    t.invoice_path ? { label: "Rechnung", q: "invoice" } : null,
  ].filter(Boolean) as { label: string; q: string }[];

  return (
    <div className="px-5 py-4 space-y-4">
      <Link
        href="/portal/strafzettel"
        className="inline-flex items-center gap-1.5 text-[13px] text-ink-muted hover:text-ink transition-colors"
      >
        <ArrowLeft size={13} /> Alle Strafzettel
      </Link>

      <div>
        <div className="flex items-center gap-2 flex-wrap mb-1">
          <span className="font-mono text-[12px] text-ink-muted">{t.ticket_nr || "—"}</span>
          <StatusBadge status={paid ? "bezahlt" : t.status} />
        </div>
        <h1 className="font-display text-[22px] tracking-tightest font-bold text-ink">
          {t.offense || "Strafzettel"}
        </h1>
      </div>

      <Surface>
        {t.offense_details && (
          <p className="text-[13px] text-ink-soft mb-2 leading-snug">{t.offense_details}</p>
        )}
        <div className="space-y-1.5">
          {t.offense_date && (
            <InfoRow
              label="Datum"
              value={`${fmtDate(t.offense_date)}${t.offense_time ? ` · ${t.offense_time}` : ""}`}
            />
          )}
          {t.location && <InfoRow label="Ort" value={t.location} />}
          {t.authority && <InfoRow label="Behörde" value={t.authority} />}
          {t.reference_nr && <InfoRow label="Aktenzeichen" value={t.reference_nr} />}
          {t.deadline && <InfoRow label="Frist" value={fmtDate(t.deadline)} />}
        </div>
      </Surface>

      {t.total_charge != null && (
        <div>
          <SectionLabel>Betrag</SectionLabel>
          <Surface>
            {t.charge_fine && t.fine_amount != null && (
              <AmountRow label="Bußgeld" value={fmtEur(t.fine_amount)} />
            )}
            {t.charge_fee && t.fee_net != null && (
              <AmountRow label="Bearbeitungsgebühr (netto)" value={fmtEur(t.fee_net)} />
            )}
            {t.charge_fee && t.fee_vat != null && (
              <AmountRow label="MwSt 19 %" value={fmtEur(t.fee_vat)} />
            )}
            <div className="border-t border-hairline mt-1.5 pt-1.5">
              <AmountRow label="Gesamt" value={fmtEur(t.total_charge)} strong />
            </div>
          </Surface>
        </div>
      )}

      <TicketActions
        ticketId={t.id}
        acknowledged={!!t.acknowledged_at}
        disputeStatus={t.dispute_status ?? null}
      />

      <div>
        <SectionLabel>Status</SectionLabel>
        <Surface>
          <StatusTimeline steps={steps} />
        </Surface>
      </div>

      {docs.length > 0 && (
        <div>
          <SectionLabel>Dokumente</SectionLabel>
          <Surface padding="p-0" className="overflow-hidden">
            <div className="divide-y divide-hairline">
              {docs.map((d) => (
                <a
                  key={d.q}
                  href={`/api/portal/tickets/${t.id}/file?kind=${d.q}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 px-4 py-3 hover:bg-paper/40 transition-colors"
                >
                  <span className="text-[14px] text-ink font-medium flex-1">{d.label}</span>
                  <Download size={14} className="text-ink-muted shrink-0" />
                </a>
              ))}
            </div>
          </Surface>
        </div>
      )}
    </div>
  );
}

const InfoRow = ({ label, value }: { label: string; value: string }) => (
  <div className="grid grid-cols-[110px_1fr] gap-2 text-[13px]">
    <span className="text-ink-muted">{label}</span>
    <span className="text-ink">{value}</span>
  </div>
);

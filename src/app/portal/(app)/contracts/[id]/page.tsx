import Link from "next/link";
import { notFound } from "next/navigation";
import {
  AlertTriangle,
  ArrowLeft,
  CalendarPlus,
  Check,
  ChevronRight,
  FileSignature,
  FileText,
  KeyRound,
  LogOut,
  type LucideIcon,
} from "lucide-react";
import { requirePortal } from "@/lib/portal-auth";
import { fmtDate, fmtEur } from "@/lib/utils";
import type { Contract } from "@/lib/types";
import { ButtonLink } from "@/components/ui/Button";
import { RentalHero } from "@/components/portal/kit/RentalHero";
import { Surface } from "@/components/portal/kit/Surface";
import { SectionLabel } from "@/components/portal/kit/SectionLabel";
import { AmountRow } from "@/components/portal/kit/AmountRow";
import { StatusTimeline, type TimelineStep } from "@/components/portal/kit/StatusTimeline";

export const dynamic = "force-dynamic";

export default async function PortalContractDetail({
  params,
}: {
  params: { id: string };
}) {
  const ctx = await requirePortal();
  if (!ctx) return null;

  const { data: contract } = await ctx.supa
    .from("contracts")
    .select("*")
    .eq("id", params.id)
    .eq("org_id", ctx.session.org_id)
    .eq("customer_id", ctx.session.customer_id)
    .maybeSingle();
  if (!contract) notFound();
  const c = contract as Contract;

  // Bestätigte Verlängerungen mit erzeugtem Nachtrag — eigene Verlängerungen
  // über RLS ("portal own extensions": customer_id + org_id). Nur Zeilen mit
  // gesetztem addendum_pdf_path → Download-Link.
  const { data: addendumRows } = await ctx.supa
    .from("contract_extensions")
    .select(
      "id, requested_return_date, addendum_pdf_path, addendum_signed_at, addendum_signed_path, created_at"
    )
    .eq("contract_id", c.id)
    .eq("status", "bestaetigt")
    .not("addendum_pdf_path", "is", null)
    .order("created_at", { ascending: false });
  const addendumExtensions = (addendumRows ?? []) as {
    id: string;
    requested_return_date: string;
    addendum_pdf_path: string | null;
    addendum_signed_at: string | null;
    addendum_signed_path: string | null;
    created_at: string;
  }[];

  const signed = !!c.signed_at;
  const checkedIn = (c.checkin_step ?? 0) >= 5;
  const returned =
    !!c.actual_return_date || (c.checkout_step ?? 0) >= 4 || c.status === "abgeschlossen";
  const closed = c.status === "abgeschlossen";

  const steps: TimelineStep[] = [
    { label: "Reserviert", done: true },
    { label: "Unterschrieben", done: signed, date: c.signed_at ? fmtDate(c.signed_at) : null },
    { label: "Abgeholt", done: checkedIn },
    {
      label: "Zurückgegeben",
      done: returned,
      date: c.actual_return_date ? fmtDate(c.actual_return_date) : null,
    },
    { label: "Abgeschlossen", done: closed },
  ];
  const cur = steps.findIndex((s) => !s.done);
  if (cur >= 0) steps[cur].current = true;

  const showCheckin = c.status === "aktiv" && (c.checkin_step ?? 0) < 5;
  const showCheckout =
    c.status === "aktiv" && signed && (c.checkin_step ?? 0) >= 5 && (c.checkout_step ?? 0) < 4;

  return (
    <div className="px-5 py-4 space-y-4">
      <Link
        href="/portal/contracts"
        className="inline-flex items-center gap-1.5 text-[13px] text-ink-muted hover:text-ink transition-colors"
      >
        <ArrowLeft size={13} /> Alle Mieten
      </Link>

      <RentalHero
        plate={c.plate}
        vehicleType={c.vehicle_type}
        status={c.status}
        dateLine={`${fmtDate(c.pickup_date)} → ${fmtDate(c.return_date)}`}
      />

      {!signed ? (
        <ButtonLink
          href={`/portal/contracts/${c.id}/sign`}
          variant="signal"
          size="lg"
          className="w-full"
        >
          <FileSignature size={16} />
          Vertrag unterschreiben
        </ButtonLink>
      ) : (
        <Surface className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <Check size={18} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="kicker text-ink-muted mb-0.5">Unterschrieben</div>
            <div className="text-[14px] text-ink font-semibold leading-tight">
              {c.signed_at ? `am ${fmtDate(c.signed_at)}` : ""}
            </div>
          </div>
          <a
            href={`/api/portal/contracts/${c.id}/contract-pdf`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[12px] font-medium px-3 py-2 rounded-btn bg-paper border border-hairline text-ink-soft hover:text-ink transition-colors shrink-0"
          >
            PDF ↗
          </a>
        </Surface>
      )}

      {addendumExtensions.map((ext) => {
        const addendumSigned = ext.addendum_signed_at != null;
        return (
          <Surface key={ext.id} className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-signal-soft text-signal-ink flex items-center justify-center shrink-0">
                {addendumSigned ? <Check size={18} /> : <FileText size={18} />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="kicker text-ink-muted mb-0.5">Nachtrag zur Verlängerung</div>
                <div className="text-[14px] text-ink font-semibold leading-tight">
                  {addendumSigned
                    ? `Signiert am ${fmtDate(ext.addendum_signed_at)}`
                    : `Neues Rückgabedatum: ${fmtDate(ext.requested_return_date)}`}
                </div>
              </div>
              <a
                href={`/api/portal/contracts/${c.id}/extension/${ext.id}/addendum`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[12px] font-medium px-3 py-2 rounded-btn bg-paper border border-hairline text-ink-soft hover:text-ink transition-colors shrink-0"
              >
                PDF ↗
              </a>
            </div>
            {/* Sign-Button NUR wenn unsigniert (status=bestaetigt + addendum_pdf_path
                via Query bereits sichergestellt). */}
            {!addendumSigned && (
              <ButtonLink
                href={`/portal/contracts/${c.id}/extension/${ext.id}/sign`}
                variant="signal"
                size="lg"
                className="w-full"
              >
                <FileSignature size={16} />
                Nachtrag unterschreiben
              </ButtonLink>
            )}
          </Surface>
        );
      })}

      {showCheckin && (
        <ActionDark
          href={`/portal/contracts/${c.id}/checkin`}
          Icon={KeyRound}
          title={(c.checkin_step ?? 0) > 0 ? "Check-in fortsetzen" : "Self-Check-in starten"}
          subtitle={
            (c.checkin_step ?? 0) > 0
              ? `Schritt ${c.checkin_step ?? 0} von 5 erledigt`
              : "Führerschein, Ausweis, Fotos, Unterschrift — in 5 Schritten."
          }
        />
      )}
      {showCheckout && (
        <ActionDark
          href={`/portal/contracts/${c.id}/checkout`}
          Icon={LogOut}
          title={(c.checkout_step ?? 0) > 0 ? "Check-out fortsetzen" : "Self-Check-out starten"}
          subtitle="Fotos · Kilometerstand · Tank — in 4 Schritten."
        />
      )}

      {c.status === "aktiv" && (
        <Link
          href={`/portal/contracts/${c.id}/verlaengern`}
          className="glass-card rounded-card px-4 py-3 flex items-center gap-3 hover:bg-paper/40 transition-colors"
        >
          <div className="w-9 h-9 rounded-xl bg-signal-soft text-signal-ink flex items-center justify-center shrink-0">
            <CalendarPlus size={16} />
          </div>
          <span className="flex-1 text-[14px] font-medium text-ink">Miete verlängern</span>
          <ChevronRight size={14} className="text-ink-muted shrink-0" />
        </Link>
      )}

      {c.status === "aktiv" && (
        <Link
          href={`/portal/contracts/${c.id}/schaden`}
          className="glass-card rounded-card px-4 py-3 flex items-center gap-3 hover:bg-paper/40 transition-colors"
        >
          <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
            <AlertTriangle size={16} />
          </div>
          <span className="flex-1 text-[14px] font-medium text-ink">Schaden melden</span>
          <ChevronRight size={14} className="text-ink-muted shrink-0" />
        </Link>
      )}

      <div>
        <SectionLabel>Status</SectionLabel>
        <Surface>
          <StatusTimeline steps={steps} />
        </Surface>
      </div>

      {(c.daily_rate != null ||
        c.total_amount != null ||
        (c.deposit != null && c.deposit > 0)) && (
        <div>
          <SectionLabel>Kosten</SectionLabel>
          <Surface>
            {c.daily_rate != null && <AmountRow label="Tagespreis" value={fmtEur(c.daily_rate)} />}
            {c.total_amount != null && (
              <AmountRow label="Gesamtbetrag" value={fmtEur(c.total_amount)} strong />
            )}
            {c.deposit != null && c.deposit > 0 && (
              <AmountRow label="Kaution" value={fmtEur(c.deposit)} />
            )}
          </Surface>
        </div>
      )}
    </div>
  );
}

const ActionDark = ({
  href,
  Icon,
  title,
  subtitle,
}: {
  href: string;
  Icon: LucideIcon;
  title: string;
  subtitle: string;
}) => (
  <Link
    href={href}
    className="bg-ink text-white rounded-card p-4 flex items-center gap-3 hover:bg-ink-soft transition-colors shadow-raised"
  >
    <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center shrink-0">
      <Icon size={18} />
    </div>
    <div className="flex-1 min-w-0">
      <div className="text-[15px] font-semibold leading-tight">{title}</div>
      <div className="text-[12px] text-white/70 mt-0.5">{subtitle}</div>
    </div>
  </Link>
);

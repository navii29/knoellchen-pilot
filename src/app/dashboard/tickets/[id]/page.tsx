import { notFound } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, Mail, ScanText, Send, UserCheck, UserSearch, Wallet } from "lucide-react";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { Topbar } from "@/components/dashboard/Topbar";
import { ConfidenceBanner } from "@/components/ticket/ConfidenceBanner";
import { TicketActions } from "@/components/ticket/TicketActions";
import { ChargeEditor } from "@/components/ticket/ChargeEditor";
import { PageHeader } from "@/components/ui/PageHeader";
import { Panel, PanelHeader } from "@/components/ui/Panel";
import { StatusPill } from "@/components/ui/StatusPill";
import { Plate } from "@/components/ui/Plate";
import { fmtDate, fmtEur, initials, relTime } from "@/lib/utils";
import type { Ticket, Contract, TicketLog } from "@/lib/types";

export const dynamic = "force-dynamic";

const TIMELINE_ICONS = {
  upload: { Icon: Mail, label: "Strafzettel hochgeladen" },
  parsed: { Icon: ScanText, label: "Software-Auslesung abgeschlossen" },
  matched: { Icon: UserCheck, label: "Fahrer zugeordnet" },
  documents: { Icon: Send, label: "Dokumente generiert" },
  paid: { Icon: Wallet, label: "Zahlung eingegangen" },
} as const;

export default async function TicketDetailPage({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) notFound();

  const { data: ticket } = await supabase
    .from("tickets")
    .select("*")
    .eq("id", params.id)
    .maybeSingle();
  if (!ticket) notFound();
  const t = ticket as Ticket;

  const [{ data: contractData }, { data: logs }, { data: orgRow }] = await Promise.all([
    t.contract_id
      ? supabase.from("contracts").select("*").eq("id", t.contract_id).maybeSingle()
      : Promise.resolve({ data: null as Contract | null }),
    supabase
      .from("ticket_logs")
      .select("*")
      .eq("ticket_id", t.id)
      .order("created_at", { ascending: true }),
    supabase.from("organizations").select("lexoffice_enabled").single(),
  ]);
  const contract = contractData as Contract | null;
  const lexofficeEnabled = !!(orgRow as { lexoffice_enabled?: boolean } | null)
    ?.lexoffice_enabled;

  let uploadUrl: string | null = null;
  if (t.upload_path) {
    const admin = createAdminClient();
    const { data: signed } = await admin.storage
      .from("ticket-uploads")
      .createSignedUrl(t.upload_path, 3600);
    uploadUrl = signed?.signedUrl || null;
  }

  return (
    <>
      <Topbar section={`Strafzettel · ${t.ticket_nr}`} />
      <div className="flex-1 overflow-auto scroll-thin bg-canvas">
        <div className="max-w-4xl mx-auto p-4 md:p-10 space-y-6">

          {/* Back link */}
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-1.5 text-[13px] text-ink-muted hover:text-ink transition-colors"
          >
            <ChevronLeft size={14} /> Zurück zum Dashboard
          </Link>

          {/* Page header */}
          <PageHeader
            kicker={t.ticket_nr}
            title={
              <span className="flex items-center gap-3 flex-wrap">
                {t.plate ? (
                  <Plate value={t.plate} size="md" />
                ) : null}
                <span>{t.offense || "Strafzettel — noch nicht ausgelesen"}</span>
              </span>
            }
            description={
              (t.location || t.offense_date) ? (
                <span className="font-mono tnum text-[13px]">
                  {t.location || ""}
                  {t.location && t.offense_date ? " · " : ""}
                  {t.offense_date
                    ? `${fmtDate(t.offense_date)}${t.offense_time ? " · " + t.offense_time : ""}`
                    : ""}
                </span>
              ) : undefined
            }
            actions={<StatusPill status={t.status} />}
          />

          {/* KI confidence */}
          <ConfidenceBanner
            confidence={t.ai_confidence}
            source={t.source}
            uploadUrl={uploadUrl}
          />

          {/* Strafzettel-Daten */}
          <Panel flush>
            <PanelHeader
              kicker="Bescheid"
              title="Strafzettel-Daten"
              Icon={ScanText}
            />
            <div className="divide-y divide-hairline">
              {[
                {
                  label: "Kennzeichen",
                  value: t.plate ? <Plate value={t.plate} size="sm" /> : <span className="font-mono text-ink-muted">—</span>,
                },
                { label: "Fahrzeug", value: t.vehicle_type || "—" },
                {
                  label: "Tatzeit",
                  value: t.offense_date
                    ? `${fmtDate(t.offense_date)}${t.offense_time ? " · " + t.offense_time : ""}`
                    : "—",
                  mono: true,
                },
                { label: "Tatort", value: t.location || "—" },
                { label: "Behörde", value: t.authority || "—" },
                { label: "Aktenzeichen", value: t.reference_nr || "—", mono: true },
                {
                  label: "Bußgeld (Behörde)",
                  value: fmtEur(t.fine_amount),
                  mono: true,
                },
                { label: "Frist Behörde", value: fmtDate(t.deadline), mono: true },
              ].map(({ label, value, mono }) => (
                <div key={label} className="grid grid-cols-[160px_1fr] gap-3 px-5 py-2.5 text-[13.5px]">
                  <div className="data-label text-ink-muted">{label}</div>
                  <div className={mono ? "font-mono tnum text-ink" : "text-ink"}>{value}</div>
                </div>
              ))}
            </div>
          </Panel>

          {/* Weiterbelastung */}
          <ChargeEditor ticket={t} />

          {/* Fahrer */}
          <div>
            <div className="kicker text-ink-muted mb-3">Fahrer zum Tatzeitpunkt</div>
            {contract ? (
              <Link
                href={`/dashboard/contracts/${contract.id}`}
                className="block panel hover:border-ink/20 transition-colors"
              >
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-panel bg-ink text-white flex items-center justify-center font-display font-semibold text-[13px] shrink-0">
                    {initials(contract.renter_name)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <div className="font-display font-semibold text-ink text-[14px]">
                        {contract.renter_name}
                      </div>
                      <span className="font-mono text-[10px] px-1.5 py-0.5 rounded-frame bg-canvas border border-hairline text-ink-muted">
                        {contract.contract_nr}
                      </span>
                      <span className="ml-auto inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-mono font-medium bg-[#E6F4EA] text-[#166534]">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#15803D]" />
                        Match
                      </span>
                    </div>
                    <div className="text-[13px] text-ink-muted mt-0.5">
                      {contract.renter_address || "—"}
                    </div>
                    <div className="mt-3 grid grid-cols-2 gap-2.5 text-[12.5px]">
                      <div>
                        <div className="data-label text-ink-muted">Mietbeginn</div>
                        <div className="font-mono tnum text-ink mt-0.5">
                          {fmtDate(contract.pickup_date)}
                        </div>
                      </div>
                      <div>
                        <div className="data-label text-ink-muted">Mietende</div>
                        <div className="font-mono tnum text-ink mt-0.5">
                          {fmtDate(contract.actual_return_date || contract.return_date)}
                        </div>
                      </div>
                      <div>
                        <div className="data-label text-ink-muted">E-Mail</div>
                        <div className="mt-0.5 truncate text-ink">
                          {contract.renter_email || "—"}
                        </div>
                      </div>
                      <div>
                        <div className="data-label text-ink-muted">Telefon</div>
                        <div className="font-mono tnum text-ink mt-0.5">
                          {contract.renter_phone || "—"}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </Link>
            ) : (
              <div className="panel border-dashed border-amber-300 bg-amber-50/40 flex items-center gap-3">
                <div className="w-9 h-9 rounded-panel bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                  <UserSearch size={16} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-[13.5px] text-amber-900">Kein Fahrer zugeordnet</div>
                  <div className="text-[12px] text-amber-800/80 mt-0.5">
                    {t.plate && t.offense_date
                      ? "Kein passender Mietvertrag gefunden — bitte manuell prüfen oder Vertrag anlegen."
                      : "Kennzeichen oder Tatdatum fehlt — Software-Auslesung wiederholen."}
                  </div>
                </div>
                <Link
                  href="/dashboard/contracts"
                  className="text-[12px] px-2.5 py-1.5 rounded-btn bg-white border border-hairline text-amber-900 hover:bg-canvas transition-colors shrink-0"
                >
                  Verträge prüfen
                </Link>
              </div>
            )}
          </div>

          {/* Aktionen */}
          <TicketActions ticket={t} lexofficeEnabled={lexofficeEnabled} />

          {/* Verlauf */}
          <Panel flush>
            <PanelHeader kicker="Ereignislog" title="Verlauf" Icon={Mail} />
            <div className="relative px-5 py-4">
              {((logs || []) as TicketLog[]).length > 0 && (
                <div className="absolute left-[41px] top-6 bottom-6 w-px bg-hairline" />
              )}
              {((logs || []) as TicketLog[]).map((l) => {
                const meta = TIMELINE_ICONS[l.action as keyof typeof TIMELINE_ICONS] ?? {
                  Icon: ScanText,
                  label: l.action,
                };
                return (
                  <div key={l.id} className="relative flex items-start gap-3 py-2">
                    <div className="w-[18px] h-[18px] rounded-full bg-paper border border-hairline flex items-center justify-center shrink-0 z-10">
                      <meta.Icon size={10} className="text-ink-muted" />
                    </div>
                    <div className="flex-1 ml-1">
                      <div className="text-[13.5px] text-ink">{meta.label}</div>
                      <div className="font-mono text-[11px] text-ink-muted">{relTime(l.created_at)}</div>
                    </div>
                  </div>
                );
              })}
              {(!logs || logs.length === 0) && (
                <div className="text-[13px] text-ink-muted py-2">Noch keine Ereignisse.</div>
              )}
            </div>
          </Panel>

        </div>
      </div>
    </>
  );
}

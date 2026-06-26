import { notFound } from "next/navigation";
import Link from "next/link";
import { AlertOctagon, ArrowLeft, Calendar, Camera, ChevronRight, Coins, Plus, ScanSearch, ScrollText, User } from "lucide-react";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { Topbar } from "@/components/dashboard/Topbar";
import { StatusBadge } from "@/components/dashboard/StatusBadge";
import { ContractActions } from "./ContractActions";
import { redactContractPartner } from "@/lib/redact";
import { fmtDate, fmtEur } from "@/lib/utils";
import { computeReturnSummary } from "@/lib/km";
import { isContractOverdue, localTodayIso } from "@/lib/contract-utils";
import { POSITIONS, SEVERITY_STYLE } from "@/lib/handover";
import { Panel, PanelHeader } from "@/components/ui/Panel";
import { Plate } from "@/components/ui/Plate";
import { RiskBadge } from "@/components/contract/RiskBadge";
import { ExtensionRequests, type ContractExtension } from "@/components/contract/ExtensionRequests";
import { SendEmailButton } from "@/components/contract/SendEmailButton";
import { Mail } from "lucide-react";
import type { Contract, DamageReport, HandoverPhoto, Ticket, Vehicle } from "@/lib/types";
import type { ContractStatus } from "@/lib/types";

export const dynamic = "force-dynamic";

/* ── Contract status pill (contract-specific states) ── */
const CONTRACT_STATUS_META: Record<
  ContractStatus,
  { label: string; dot: string; soft: string; ink: string }
> = {
  aktiv:        { label: "Aktiv",         dot: "#059669", soft: "#E6F4EA", ink: "#166534" },
  abgeschlossen:{ label: "Abgeschlossen", dot: "#6B7280", soft: "#F3F4F6", ink: "#374151" },
  storniert:    { label: "Storniert",     dot: "#DC2626", soft: "#FEF2F2", ink: "#B91C1C" },
};

const OVERDUE_PILL = { label: "Überfällig", dot: "#DC2626", soft: "#FEE2E2", ink: "#B91C1C" };

const ContractPill = ({ status, overdue }: { status: ContractStatus; overdue?: boolean }) => {
  const m = overdue ? OVERDUE_PILL : CONTRACT_STATUS_META[status] ?? CONTRACT_STATUS_META.aktiv;
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full pl-2 pr-2.5 py-0.5 text-[11px] font-mono font-medium tracking-tight"
      style={{ background: m.soft, color: m.ink }}
    >
      <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: m.dot }} />
      {m.label}
    </span>
  );
};

const DAMAGE_STATUS_META: Record<
  DamageReport["status"],
  { label: string; bg: string; ring: string; color: string; text: string }
> = {
  offen:     { label: "Offen",     bg: "#fef2f2", ring: "#fecaca", color: "#dc2626", text: "#b91c1c" },
  gemeldet:  { label: "Gemeldet",  bg: "#fefce8", ring: "#fde68a", color: "#ca8a04", text: "#a16207" },
  reguliert: { label: "Reguliert", bg: "#f0fdf4", ring: "#bbf7d0", color: "#16a34a", text: "#15803d" },
};

export default async function ContractDetailPage({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) notFound();

  // Mitarbeiter sehen keine Margen.
  const { data: meRow } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();
  const isOwner = (meRow?.role ?? "member") === "owner";

  const [{ data: contract }, { data: orgRow }] = await Promise.all([
    supabase.from("contracts").select("*").eq("id", params.id).maybeSingle(),
    supabase.from("organizations").select("lexoffice_enabled").single(),
  ]);
  if (!contract) notFound();
  const c = contract as Contract;
  const lexofficeEnabled = !!(orgRow as { lexoffice_enabled?: boolean } | null)
    ?.lexoffice_enabled;

  const { data: tickets } = await supabase
    .from("tickets")
    .select("*")
    .eq("contract_id", c.id)
    .order("created_at", { ascending: false });
  const linkedTickets = (tickets || []) as Ticket[];

  const { data: damageRows } = await supabase
    .from("damage_reports")
    .select("*")
    .eq("contract_id", c.id)
    .order("date", { ascending: false });
  const damageReports = (damageRows || []) as DamageReport[];

  const { data: vehicleRow } = await supabase
    .from("vehicles")
    .select(
      "extra_km_price, inclusive_km_month, cost_daily, cost_monthly, target_daily_rate"
    )
    .eq("plate", c.plate)
    .maybeSingle();
  const vRow = vehicleRow as Pick<
    Vehicle,
    | "extra_km_price"
    | "inclusive_km_month"
    | "cost_daily"
    | "cost_monthly"
    | "target_daily_rate"
  > | null;
  const pricePerKm = vRow?.extra_km_price ?? null;
  const inclusiveKmMonth = vRow?.inclusive_km_month ?? null;

  const costDaily =
    vRow?.cost_daily != null && Number(vRow.cost_daily) > 0
      ? Number(vRow.cost_daily)
      : vRow?.cost_monthly != null && Number(vRow.cost_monthly) > 0
      ? Number(vRow.cost_monthly) / 30
      : null;
  const isClosed = c.status === "abgeschlossen";
  const marginInfo =
    isClosed && c.actual_return_date && costDaily != null && c.daily_rate
      ? (() => {
          const start = new Date(c.pickup_date);
          const end = new Date(c.actual_return_date!);
          start.setHours(0, 0, 0, 0);
          end.setHours(0, 0, 0, 0);
          const days = Math.max(
            1,
            Math.round((end.getTime() - start.getTime()) / 86_400_000) + 1
          );
          const istVk = days * Number(c.daily_rate);
          const ek = days * costDaily;
          const margin = istVk - ek;
          const marginPct = istVk > 0 ? (margin / istVk) * 100 : null;
          return { days, istVk, ek, margin, marginPct };
        })()
      : null;

  const isReturned = !!c.actual_return_date;
  const km = isReturned
    ? computeReturnSummary({
        pickupDate: c.pickup_date,
        plannedReturnDate: c.return_date,
        actualReturnDate: c.actual_return_date!,
        kmPickup: c.km_pickup,
        kmReturn: c.km_return,
        inclusiveKmMonth,
        kmLimitOverride: c.km_limit,
        pricePerKm,
      })
    : null;

  const admin = createAdminClient();
  let pdfUrl: string | null = null;
  if (c.contract_pdf_path) {
    const { data: signed } = await admin.storage
      .from("contract-uploads")
      .createSignedUrl(c.contract_pdf_path, 3600);
    pdfUrl = signed?.signedUrl || null;
  }

  const { data: photoRows } = await supabase
    .from("handover_photos")
    .select("*")
    .eq("contract_id", c.id);
  const handoverPhotos: Array<HandoverPhoto & { url: string | null }> = await Promise.all(
    ((photoRows ?? []) as HandoverPhoto[]).map(async (p) => {
      const { data: signed } = await admin.storage
        .from("handover-photos")
        .createSignedUrl(p.photo_path, 3600);
      return { ...p, url: signed?.signedUrl || null };
    })
  );
  const pickupCount = handoverPhotos.filter((p) => p.type === "pickup").length;
  const returnCount = handoverPhotos.filter((p) => p.type === "return").length;

  // Empfänger für den E-Mail-Versand: Kunden-E-Mail (org-scoped) bzw. renter_email.
  let recipientEmail: string | null = c.renter_email ?? null;
  if (c.customer_id) {
    const { data: cust } = await admin
      .from("customers")
      .select("email")
      .eq("id", c.customer_id)
      .eq("org_id", c.org_id) // SECURITY: multi-tenant isolation
      .maybeSingle();
    recipientEmail = (cust?.email as string | null) || recipientEmail;
  }

  // Offene Verlängerungs-Anfragen — RLS-scoped über den eingeloggten Nutzer.
  const { data: extensionRows } = await supabase
    .from("contract_extensions")
    .select("*")
    .eq("contract_id", c.id)
    .eq("status", "angefragt")
    .order("created_at", { ascending: false });
  const pendingExtensions = (extensionRows ?? []) as ContractExtension[];

  return (
    <>
      <Topbar section={`Vertrag · ${c.contract_nr}`} />
      <div className="flex-1 overflow-auto scroll-thin bg-canvas">
        <div className="max-w-4xl mx-auto p-4 md:p-10">
          <Link
            href="/dashboard/contracts"
            className="inline-flex items-center gap-1.5 text-[13px] text-ink-muted hover:text-ink mb-5"
          >
            <ArrowLeft size={14} /> Zurück zu Verträgen
          </Link>

          {/* Page title row */}
          <div className="flex items-center gap-3 mb-1.5 flex-wrap">
            <span className="font-mono tnum text-[12px] text-ink-muted">{c.contract_nr}</span>
            <ContractPill status={c.status} overdue={isContractOverdue(c, localTodayIso())} />
            <Plate value={c.plate} size="sm" />
          </div>
          <h1 className="font-display font-extrabold text-ink text-[26px] sm:text-[30px] leading-[1.05] tracking-tightest">
            {c.renter_name}
          </h1>
          {c.renter_address && (
            <div className="mt-1 text-[13px] text-ink-muted">{c.renter_address}</div>
          )}

          {/* Signed banner */}
          {c.signed_at && (
            <div className="mt-5 panel p-0 overflow-hidden">
              <div className="px-5 py-4 flex items-center gap-4 flex-wrap bg-[#E6F4EA]">
                <div className="w-10 h-10 rounded-panel border border-hairline bg-paper flex items-center justify-center shrink-0">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#15803d" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="data-label text-[#166534] mb-0.5">Unterschrieben</div>
                  <div className="font-display font-bold text-[#166534] text-[15px] leading-tight">
                    {fmtDate(c.signed_at)}
                  </div>
                  {c.signed_ip && (
                    <div className="font-mono tnum text-[11px] text-[#166534]/70 mt-0.5">
                      IP {c.signed_ip}
                    </div>
                  )}
                </div>
                {c.signature_data && (
                  <div className="bg-paper rounded-panel px-2 py-1 border border-hairline">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={c.signature_data}
                      alt="Unterschrift"
                      style={{ height: 48, maxWidth: 220, display: "block" }}
                    />
                  </div>
                )}
                <a
                  href={`/api/contracts/${c.id}/contract-pdf`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-[13px] px-3 py-2 rounded-btn border border-[#166534]/30 bg-paper text-[#166534] hover:bg-[#E6F4EA]/50 transition-colors"
                >
                  Vertrag öffnen ↗
                </a>
              </div>
            </div>
          )}

          {(c.checkin_step ?? 0) > 0 || (c.checkout_step ?? 0) > 0 ? (
            <SelfServiceStatus
              checkinStep={c.checkin_step ?? 0}
              checkoutStep={c.checkout_step ?? 0}
              fuelPickup={c.fuel_level_pickup}
              fuelReturn={c.fuel_level_return}
            />
          ) : null}

          {/* Risk check */}
          <div className="mt-6">
            <RiskBadge
              contractId={c.id}
              risk_level={c.risk_level ?? null}
              risk_score={c.risk_score ?? null}
              risk_summary={c.risk_summary ?? null}
              risk_factors={c.risk_factors ?? null}
              risk_checked_at={c.risk_checked_at ?? null}
              risk_override_at={c.risk_override_at ?? null}
              risk_override_reason={c.risk_override_reason ?? null}
            />
          </div>

          {/* Verlängerungs-Anfragen (nur wenn offen) */}
          <ExtensionRequests
            contractId={c.id}
            extensions={pendingExtensions}
            contractReturnDate={c.return_date}
          />

          {/* Info cards */}
          <div className="mt-6 grid sm:grid-cols-2 gap-3">
            <InfoCard Icon={User} title="Mieter">
              <Row label="Name" value={c.renter_name} />
              <Row label="Geburtsdatum" value={c.renter_birthday || "—"} />
              <Row label="Führerschein" value={c.renter_license_nr || "—"} />
              <Row label="E-Mail" value={c.renter_email || "—"} />
              <Row label="Telefon" value={c.renter_phone || "—"} />
            </InfoCard>

            <InfoCard Icon={Calendar} title="Mietzeitraum">
              <Row label="Abholung" value={`${fmtDate(c.pickup_date)}${c.pickup_time ? " · " + c.pickup_time : ""}`} />
              <Row
                label="Geplante Rückgabe"
                value={`${fmtDate(c.return_date)}${c.return_time ? " · " + c.return_time : ""}`}
              />
              {c.actual_return_date && (
                <Row label="Tatsächliche Rückgabe" value={fmtDate(c.actual_return_date)} />
              )}
              <Row label="Fahrzeug" value={c.vehicle_type || "—"} />
              <Row
                label="Kennzeichen"
                value={<Plate value={c.plate} size="sm" />}
              />
            </InfoCard>

            <InfoCard Icon={Coins} title="Kosten">
              <Row label="Tagespreis" value={fmtEur(c.daily_rate)} mono />
              <Row label="Gesamtbetrag" value={fmtEur(c.total_amount)} mono />
              <Row label="Kaution" value={fmtEur(c.deposit)} mono />
              {isOwner && marginInfo && (
                <>
                  <div className="mt-2 pt-2 border-t border-hairline" />
                  <Row label="Realisierter VK" value={fmtEur(marginInfo.istVk)} mono />
                  <Row label="EK für Zeitraum" value={fmtEur(marginInfo.ek)} mono />
                  <Row
                    label="Marge"
                    value={
                      <span
                        className={`font-mono tnum font-semibold ${
                          marginInfo.margin >= 0 ? "text-[#15803D]" : "text-[#BE123C]"
                        }`}
                      >
                        {fmtEur(marginInfo.margin)}
                        {marginInfo.marginPct != null &&
                          ` · ${marginInfo.marginPct.toFixed(0)}%`}
                      </span>
                    }
                  />
                </>
              )}
            </InfoCard>

            <InfoCard Icon={ScrollText} title="Kilometer & Notizen">
              <Row label="km Abholung" value={c.km_pickup ?? "—"} mono />
              <Row label="km Rückgabe" value={c.km_return ?? "—"} mono />
              {!isReturned && (
                <Row
                  label="Freikilometer / Monat"
                  value={
                    inclusiveKmMonth
                      ? inclusiveKmMonth.toLocaleString("de-DE")
                      : c.km_limit ?? "unbegrenzt"
                  }
                  mono
                />
              )}
              {km && (
                <>
                  <Row label="Miettage" value={`${km.actualDays} Tage`} mono />
                  {km.drivenKm != null && (
                    <Row label="Gefahren" value={`${km.drivenKm.toLocaleString("de-DE")} km`} mono />
                  )}
                  {km.allowedKm != null && (
                    <Row
                      label="Erlaubt"
                      value={
                        km.source === "inclusive_month" && km.inclusiveKmMonth
                          ? `${km.allowedKm.toLocaleString("de-DE")} km (${km.actualDays} × ${km.inclusiveKmMonth.toLocaleString("de-DE")}/30)`
                          : `${km.allowedKm.toLocaleString("de-DE")} km`
                      }
                      mono
                    />
                  )}
                  {km.excessKm > 0 && (
                    <Row
                      label="Mehrkilometer"
                      value={
                        <span className="font-mono tnum text-[#92400E]">
                          {km.excessKm.toLocaleString("de-DE")} km × {km.pricePerKm.toFixed(2).replace(".", ",")} € ={" "}
                          <strong>{fmtEur(km.cost)}</strong>
                        </span>
                      }
                    />
                  )}
                </>
              )}
              <Row label="Notizen" value={c.notes || "—"} />
            </InfoCard>
          </div>

          {/* Excess km alert */}
          {km && km.excessKm > 0 && (
            <div className="mt-6 panel border-[#F59E0B]/40 bg-[#FFFBEB] p-5">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-panel border border-[#F59E0B]/30 bg-paper flex items-center justify-center shrink-0 text-[#92400E]">
                  <ScrollText size={18} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="data-label text-[#92400E] mb-0.5">Mehrkilometer</div>
                  <div className="font-display font-semibold text-[15px] text-[#78350F] mt-0.5">
                    {km.actualDays} Tage · {km.drivenKm?.toLocaleString("de-DE")} km gefahren ·{" "}
                    {km.allowedKm?.toLocaleString("de-DE")} km erlaubt · {km.excessKm.toLocaleString("de-DE")} km zusätzlich
                  </div>
                  <div className="text-[13px] text-[#78350F] mt-1">
                    {km.excessKm.toLocaleString("de-DE")} km × {km.pricePerKm.toFixed(2).replace(".", ",")} €/km ={" "}
                    <strong className="font-mono tnum">{fmtEur(km.cost)}</strong>
                    {pricePerKm == null && (
                      <span className="text-[12px] ml-2 opacity-80">
                        (Fahrzeug-Preis fehlt — bitte am Fahrzeug eintragen)
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="mt-6">
            <ContractActions
              contract={redactContractPartner(c, isOwner)}
              pdfUrl={pdfUrl}
              lexofficeEnabled={lexofficeEnabled}
            />
          </div>

          {/* Vertrag per E-Mail an den Mieter senden */}
          <div className="mt-6">
            <Panel>
              <div className="flex items-center gap-1.5 data-label text-ink-muted mb-3">
                <Mail size={12} /> Vertrag versenden
              </div>
              <SendEmailButton
                contractId={c.id}
                recipient={recipientEmail}
                alreadySentAt={c.email_sent_at ?? null}
                alreadySentTo={c.email_sent_to ?? null}
              />
            </Panel>
          </div>

          {/* Handover photos */}
          <div className="mt-6">
            <div className="flex items-end justify-between mb-3">
              <div className="flex items-center gap-1.5 data-label text-ink-muted">
                <Camera size={12} />
                Fahrzeugzustand · {pickupCount}/10 Übergabe · {returnCount}/10 Rücknahme
              </div>
              <Link
                href={`/dashboard/contracts/${c.id}/handover`}
                className="text-[12px] text-ink-soft hover:text-ink inline-flex items-center gap-1 transition-colors"
              >
                Fotos verwalten <ChevronRight size={12} />
              </Link>
            </div>
            <DamageComparisonRow
              contractId={c.id}
              comparedAt={c.damage_comparison_at ?? null}
              hasNewDamage={c.has_new_damage ?? null}
              maxSeverity={c.damage_max_severity ?? null}
              returnCount={returnCount}
            />
            {handoverPhotos.length === 0 ? (
              <Link
                href={`/dashboard/contracts/${c.id}/handover`}
                className="block panel hover:border-ink/20 transition px-5 py-8 text-center text-[13px] text-ink-muted"
              >
                <Camera size={22} className="mx-auto text-ink-muted mb-2" />
                <div>Noch keine Übergabe-Fotos</div>
                <div className="text-[12px] text-ink-soft mt-1">Fotos jetzt aufnehmen →</div>
              </Link>
            ) : (
              <Panel flush className="p-4">
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                  {POSITIONS.map((pos) => {
                    const pickup = handoverPhotos.find(
                      (p) => p.type === "pickup" && p.position === pos.key
                    );
                    const ret = handoverPhotos.find(
                      (p) => p.type === "return" && p.position === pos.key
                    );
                    return (
                      <div key={pos.key} className="space-y-1">
                        <div className="data-label text-ink-muted">{pos.label}</div>
                        <div className="grid grid-cols-2 gap-1">
                          <PhotoThumb url={pickup?.url || null} label="Vor" />
                          <PhotoThumb url={ret?.url || null} label="Nach" />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </Panel>
            )}
          </div>

          {/* Damage reports */}
          <div className="mt-6">
            <div className="flex items-end justify-between mb-3">
              <div className="flex items-center gap-1.5 data-label text-ink-muted">
                <AlertOctagon size={12} />
                Schadensberichte ({damageReports.length})
              </div>
              <Link
                href={`/dashboard/damage-reports/new?contract_id=${c.id}`}
                className="text-[12px] text-ink-soft hover:text-ink inline-flex items-center gap-1 transition-colors"
              >
                <Plus size={12} /> Neuer Bericht
              </Link>
            </div>
            {damageReports.length === 0 ? (
              <Panel className="py-6 text-center">
                <p className="text-[13px] text-ink-muted">Keine Schäden zu diesem Vertrag dokumentiert.</p>
              </Panel>
            ) : (
              <Panel flush className="overflow-hidden">
                {damageReports.map((d) => {
                  const meta = DAMAGE_STATUS_META[d.status];
                  return (
                    <Link
                      key={d.id}
                      href={`/dashboard/damage-reports/${d.id}`}
                      className="grid grid-cols-[100px_1fr_120px_24px] items-center gap-3 px-5 py-3 border-b border-hairline last:border-0 text-[13.5px] hover:bg-canvas transition-colors"
                    >
                      <span className="font-mono tnum text-[12px] text-ink-soft">{fmtDate(d.date)}</span>
                      <span className="truncate text-ink">
                        {d.location || d.description || "—"}
                        {d.photos && d.photos.length > 0 && (
                          <span className="text-ink-muted ml-2 text-[12px]">
                            · {d.photos.length} {d.photos.length === 1 ? "Foto" : "Fotos"}
                          </span>
                        )}
                      </span>
                      <span
                        className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-mono font-medium justify-self-start"
                        style={{
                          background: meta.bg,
                          color: meta.text,
                          boxShadow: `inset 0 0 0 1px ${meta.ring}`,
                        }}
                      >
                        <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: meta.color }} />
                        {meta.label}
                      </span>
                      <ChevronRight size={14} className="text-ink-muted" />
                    </Link>
                  );
                })}
              </Panel>
            )}
          </div>

          {/* Linked tickets */}
          <div className="mt-6">
            <div className="data-label text-ink-muted mb-3">
              Verknüpfte Strafzettel ({linkedTickets.length})
            </div>
            <Panel flush className="overflow-hidden">
              {linkedTickets.length === 0 && (
                <div className="px-5 py-8 text-center text-[13px] text-ink-muted">
                  Noch keine Strafzettel diesem Vertrag zugeordnet.
                </div>
              )}
              {linkedTickets.map((t) => (
                <Link
                  key={t.id}
                  href={`/dashboard/tickets/${t.id}`}
                  className="grid grid-cols-[100px_1fr_120px_100px_24px] items-center gap-3 px-5 py-3 border-b border-hairline last:border-0 text-[13.5px] hover:bg-canvas transition-colors"
                >
                  <span className="font-mono tnum text-[12px] text-ink-soft">{t.ticket_nr}</span>
                  <span className="truncate text-ink">{t.offense || "—"}</span>
                  <span className="font-mono tnum text-[12px] text-ink-muted">{fmtDate(t.offense_date)}</span>
                  <StatusBadge status={t.status} />
                  <ChevronRight size={14} className="text-ink-muted" />
                </Link>
              ))}
            </Panel>
          </div>
        </div>
      </div>
    </>
  );
}

/* ── Sub-components ── */

const InfoCard = ({
  title,
  Icon,
  children,
}: {
  title: string;
  Icon: typeof User;
  children: React.ReactNode;
}) => (
  <Panel>
    <PanelHeader title={title} Icon={Icon} className="-mx-5 -mt-5 mb-4 rounded-t-card" />
    <div className="space-y-1.5">{children}</div>
  </Panel>
);

const Row = ({
  label,
  value,
  mono,
}: {
  label: string;
  value: React.ReactNode;
  mono?: boolean;
}) => (
  <div className="grid grid-cols-[120px_1fr] gap-2 text-[13px]">
    <div className="text-ink-muted text-[12px]">{label}</div>
    <div className={mono ? "font-mono tnum text-ink" : "text-ink"}>{value}</div>
  </div>
);

const FUEL_LABEL: Record<string, string> = {
  full: "Voll",
  three_quarter: "3/4",
  half: "1/2",
  quarter: "1/4",
  empty: "Leer",
};

const SelfServiceStatus = ({
  checkinStep,
  checkoutStep,
  fuelPickup,
  fuelReturn,
}: {
  checkinStep: number;
  checkoutStep: number;
  fuelPickup: string | null;
  fuelReturn: string | null;
}) => {
  const ProgressBar = ({
    value,
    total,
    color,
  }: {
    value: number;
    total: number;
    color: string;
  }) => {
    const pct = Math.max(0, Math.min(100, (value / total) * 100));
    return (
      <div className="h-1 rounded-full bg-canvas border border-hairline overflow-hidden mt-1.5">
        <div
          className="h-full rounded-full transition-[width] duration-500 ease-out"
          style={{ width: `${pct}%`, background: color }}
        />
      </div>
    );
  };

  const Block = ({
    title,
    step,
    total,
    badge,
    color,
    extra,
  }: {
    title: string;
    step: number;
    total: number;
    badge: string;
    color: string;
    extra?: React.ReactNode;
  }) => (
    <div className="flex-1 min-w-[180px]">
      <div className="flex items-center justify-between gap-2">
        <div className="data-label text-ink-muted">{title}</div>
        <span
          className="inline-flex items-center px-2 h-5 rounded-full text-[11px] font-mono font-medium"
          style={{ background: `${color}1a`, color }}
        >
          {badge}
        </span>
      </div>
      <div className="font-mono tnum text-[13px] text-ink-soft mt-1">
        {step} / {total} Schritte
      </div>
      <ProgressBar value={step} total={total} color={color} />
      {extra}
    </div>
  );

  const checkinBadge =
    checkinStep === 0 ? "Nicht gestartet" : checkinStep >= 5 ? "Abgeschlossen" : "Läuft";
  const checkinColor =
    checkinStep >= 5 ? "#16a34a" : checkinStep > 0 ? "#ca8a04" : "#a8a29e";

  const checkoutBadge =
    checkoutStep === 0 ? "Nicht gestartet" : checkoutStep >= 4 ? "Abgeschlossen" : "Läuft";
  const checkoutColor =
    checkoutStep >= 4 ? "#16a34a" : checkoutStep > 0 ? "#ca8a04" : "#a8a29e";

  return (
    <Panel className="mt-5">
      <div className="flex flex-wrap gap-6">
        <Block
          title="Self-Check-in"
          step={checkinStep}
          total={5}
          badge={checkinBadge}
          color={checkinColor}
          extra={
            fuelPickup ? (
              <div className="font-mono text-[11.5px] text-ink-muted mt-1">
                Tankstand bei Übergabe: {FUEL_LABEL[fuelPickup] ?? fuelPickup}
              </div>
            ) : null
          }
        />
        <Block
          title="Self-Check-out"
          step={checkoutStep}
          total={4}
          badge={checkoutBadge}
          color={checkoutColor}
          extra={
            fuelReturn ? (
              <div className="font-mono text-[11.5px] text-ink-muted mt-1">
                Tankstand bei Rückgabe: {FUEL_LABEL[fuelReturn] ?? fuelReturn}
              </div>
            ) : null
          }
        />
      </div>
    </Panel>
  );
};

/* ── KI-Schadenvergleich-Badge ──
   Zeigt das gespeicherte KI-Verdikt (kein/leichter/schwerer Schaden) bzw. einen
   dezenten Auswerten-Link, wenn Rücknahme-Fotos da sind aber noch kein Vergleich
   existiert. Keine Kosten-/Margendaten — nur das Schadensverdikt. */
const DamageComparisonRow = ({
  contractId,
  comparedAt,
  hasNewDamage,
  maxSeverity,
  returnCount,
}: {
  contractId: string;
  comparedAt: string | null;
  hasNewDamage: boolean | null;
  maxSeverity: string | null;
  returnCount: number;
}) => {
  // Noch kein Vergleich, aber Rücknahme-Fotos vorhanden → dezenter Auswerten-Link.
  if (!comparedAt) {
    if (returnCount === 0) return null;
    return (
      <div className="mb-3">
        <Link
          href={`/dashboard/contracts/${contractId}/handover`}
          className="inline-flex items-center gap-1.5 text-[12px] text-ink-soft hover:text-ink transition-colors"
        >
          <ScanSearch size={12} /> Übergabe-Fotos auswerten <ChevronRight size={12} />
        </Link>
      </div>
    );
  }

  // Verdikt: kein neuer Schaden → grün; sonst nach höchster Stufe einfärben.
  const sevKey: keyof typeof SEVERITY_STYLE =
    hasNewDamage === false
      ? "none"
      : maxSeverity === "major"
      ? "major"
      : maxSeverity === "minor"
      ? "minor"
      : "none";
  const style = SEVERITY_STYLE[sevKey];
  const label =
    hasNewDamage === false
      ? "Software-Vergleich: kein neuer Schaden"
      : sevKey === "major"
      ? "Software-Vergleich: schwerer Schaden erkannt"
      : sevKey === "minor"
      ? "Software-Vergleich: leichter Schaden erkannt"
      : "Software-Vergleich: kein neuer Schaden";

  return (
    <div className="mb-3">
      <Link
        href={`/dashboard/contracts/${contractId}/handover`}
        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-mono font-medium transition-opacity hover:opacity-80"
        style={{ background: style.bg, color: style.text, boxShadow: `inset 0 0 0 1px ${style.ring}` }}
      >
        <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: style.color }} />
        {label}
        <ChevronRight size={12} />
      </Link>
    </div>
  );
};

const PhotoThumb = ({ url, label }: { url: string | null; label: string }) => {
  if (!url) {
    return (
      <div className="aspect-square bg-canvas rounded-panel border border-hairline flex items-center justify-center text-[9px] uppercase tracking-wider text-ink-muted">
        {label}
      </div>
    );
  }
  return (
    <a
      href={url}
      target="_blank"
      rel="noreferrer"
      className="relative aspect-square block rounded-panel overflow-hidden bg-canvas border border-hairline"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={url} alt={label} className="w-full h-full object-cover" />
      <span className="absolute bottom-0 left-0 right-0 px-1 py-0.5 text-[9px] uppercase tracking-wider text-white bg-black/40 text-center">
        {label}
      </span>
    </a>
  );
};

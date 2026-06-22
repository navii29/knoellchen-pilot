import { notFound } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Calendar,
  Car,
  Check,
  ChevronRight,
  Coins,
  FileSignature,
  Gauge,
  MapPin,
  Settings2,
  Sparkles,
  type LucideIcon,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Topbar } from "@/components/dashboard/Topbar";
import { ContractStatusBadge } from "@/components/contract/StatusBadge";
import { isContractOverdue, localTodayIso } from "@/lib/contract-utils";
import { VehicleEditPanel } from "./VehicleEditPanel";
import { VehicleDeleteButton } from "./VehicleDeleteButton";
import { VehicleEventsTimeline } from "@/components/vehicle/VehicleEventsTimeline";
import { TuevCountdown } from "@/components/vehicle/TuevCountdown";
import { GpsLocation } from "@/components/vehicle/GpsLocation";
import { TiresSection, type TireWithPhotos } from "@/components/vehicle/TiresSection";
import { RegistrationDocCard } from "@/components/vehicle/RegistrationDocCard";
import { InsuranceCard } from "@/components/vehicle/InsuranceCard";
import { VehiclePhotosCard } from "@/components/vehicle/VehiclePhotosCard";
import { SuccessorPanel } from "@/components/vehicle/SuccessorPanel";
import type { TirePhoto, VehicleTire } from "@/lib/tires";
import { PartnerPricingSection } from "@/components/vehicle/PartnerPricingSection";
import { fmtDate, fmtEur } from "@/lib/utils";
import { computeDecommission } from "@/lib/decommission";
import { redactVehicleCost } from "@/lib/redact";
import { VEHICLE_STATUS_META, buildVehicleType, isDecommissioned } from "@/lib/vehicle";
import type { Contract, Vehicle } from "@/lib/types";
import type { VehicleEvent } from "@/lib/vehicle-events";
import { Panel, PanelHeader } from "@/components/ui/Panel";
import { Plate } from "@/components/ui/Plate";
import { EmptyState } from "@/components/ui/EmptyState";

export const dynamic = "force-dynamic";

export default async function VehicleDetailPage({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) notFound();

  const { data: vehicle } = await supabase
    .from("vehicles")
    .select("*")
    .eq("id", params.id)
    .maybeSingle();
  if (!vehicle) notFound();
  const v = vehicle as Vehicle;

  // Mitarbeiter sehen keine Kosten/Margen: Werte aus den an den Client gehenden
  // Props strippen (nicht nur UI ausblenden) + Partner-Preise verbergen.
  const { data: me } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();
  const isOwner = (me?.role ?? "member") === "owner";
  const vForEdit: Vehicle = redactVehicleCost(v, isOwner);

  const [
    { data: contracts },
    { data: events },
    { data: orgRow },
    { data: tireRows },
    { data: partnerPricing },
  ] = await Promise.all([
    supabase
      .from("contracts")
      .select("*")
      .eq("plate", v.plate)
      .order("pickup_date", { ascending: false })
      .limit(50),
    supabase
      .from("vehicle_events")
      .select("*")
      .eq("vehicle_id", v.id)
      .order("date", { ascending: false })
      .order("created_at", { ascending: false }),
    supabase.from("organizations").select("echoes_enabled").single(),
    supabase
      .from("vehicle_tires")
      .select("*")
      .eq("vehicle_id", v.id)
      .order("is_current", { ascending: false })
      .order("mounted_at", { ascending: false, nullsFirst: false })
      .order("created_at", { ascending: false }),
    supabase
      .from("vehicle_partner_pricing")
      .select(
        "*, sales_partners!inner(name, type, commission_type, commission_value)"
      )
      .eq("vehicle_id", v.id),
  ]);
  const linkedContracts = (contracts || []) as Contract[];
  const vehicleEvents = (events || []) as VehicleEvent[];
  const echoesEnabled = !!(orgRow as { echoes_enabled?: boolean } | null)
    ?.echoes_enabled;
  const tires = (tireRows ?? []) as VehicleTire[];

  const tireIds = tires.map((t) => t.id);
  const photosByTire = new Map<string, TirePhoto[]>();
  if (tireIds.length > 0) {
    const { data: tirePhotos } = await supabase
      .from("tire_photos")
      .select("*")
      .in("tire_id", tireIds);
    for (const p of (tirePhotos ?? []) as TirePhoto[]) {
      const arr = photosByTire.get(p.tire_id) ?? [];
      arr.push(p);
      photosByTire.set(p.tire_id, arr);
    }
  }
  const tiresWithPhotos: TireWithPhotos[] = tires.map((t) => ({
    ...t,
    photos: photosByTire.get(t.id) ?? [],
  }));

  const decom = computeDecommission(v);
  const status = VEHICLE_STATUS_META[v.status];
  const displayName = buildVehicleType(v.manufacturer, v.model) || v.vehicle_type || "Fahrzeug";

  // Nachfolge/Folgefahrzeug: nur relevant, wenn das Fahrzeug ein Aussteuerungsdatum
  // hat (läuft aus). Bleibender Mieter = aktiver Vertrag auf diesem Kennzeichen.
  const showSuccessor = !!v.decommission_date;
  const stayingRenter =
    linkedContracts.find((c) => c.status === "aktiv")?.renter_name ?? null;
  type CandRow = {
    id: string;
    plate: string;
    manufacturer: string | null;
    model: string | null;
    status: string | null;
    decommission_date: string | null;
  };
  const labelFor = (c: CandRow): string => {
    const t = buildVehicleType(c.manufacturer, c.model);
    return t ? `${c.plate} · ${t}` : c.plate;
  };
  let successorCandidates: { id: string; label: string }[] = [];
  let assignedVehicleLabel: string | null = null;
  if (showSuccessor) {
    const { data: candRows } = await supabase
      .from("vehicles")
      .select("id, plate, manufacturer, model, status, decommission_date")
      .neq("id", v.id)
      .order("plate", { ascending: true });
    const cand = (candRows ?? []) as CandRow[];
    successorCandidates = cand
      .filter((c) => !isDecommissioned(c))
      .map((c) => ({ id: c.id, label: labelFor(c) }));
    if (v.successor_vehicle_id) {
      const found = cand.find((c) => c.id === v.successor_vehicle_id);
      if (found) assignedVehicleLabel = labelFor(found);
    }
  }

  return (
    <>
      <Topbar section={`Fahrzeug · ${v.plate}`} />
      <div className="flex-1 overflow-auto scroll-thin bg-canvas">
        <div className="max-w-4xl mx-auto p-4 md:p-10">
          <Link
            href="/dashboard/vehicles"
            className="inline-flex items-center gap-1.5 text-[13px] text-ink-muted hover:text-ink mb-5"
          >
            <ArrowLeft size={13} /> Zurück zu Fahrzeugen
          </Link>

          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="min-w-0">
              <div className="flex items-center gap-2 mb-3 flex-wrap">
                <span
                  className="inline-flex items-center gap-1.5 rounded-full pl-2 pr-2.5 py-0.5 text-[11px] font-mono font-medium tracking-tight"
                  style={{
                    background: status.bg,
                    color: status.text,
                    boxShadow: `inset 0 0 0 1px ${status.ring}`,
                  }}
                >
                  <span className="w-1.5 h-1.5 rounded-full" style={{ background: status.color }} />
                  {status.label}
                </span>
                {v.category && (
                  <span className="kicker text-ink-muted">{v.category}</span>
                )}
              </div>
              <h1 className="font-display font-extrabold text-ink text-[26px] sm:text-[30px] leading-[1.05] tracking-tightest">
                {displayName}
              </h1>
              <div className="mt-2 flex items-center gap-3 flex-wrap">
                <Plate value={v.plate} size="md" />
                {v.color && <span className="text-[13px] text-ink-muted">· {v.color}</span>}
                {v.lexoffice_product_id && (
                  <span
                    className="inline-flex items-center gap-1 text-[10.5px] font-medium px-1.5 py-0.5 rounded-full border border-hairline text-ink-soft bg-canvas"
                    title={`LexOffice-Artikel · ${v.lexoffice_product_id}`}
                  >
                    <Check size={10} /> In LexOffice
                  </span>
                )}
              </div>
            </div>
            <VehicleDeleteButton vehicleId={v.id} />
          </div>

          <TuevCountdown events={vehicleEvents} />

          {v.decommission_date && (
            <div
              className="mt-6 rounded-card border border-hairline p-5 md:p-6 flex items-center gap-4 md:gap-5"
              style={{ background: decom.bg, boxShadow: `inset 0 0 0 1px ${decom.ring}` }}
            >
              <div
                className="w-12 h-12 md:w-14 md:h-14 rounded-panel flex items-center justify-center shrink-0"
                style={{ background: "white", color: decom.color }}
              >
                <Calendar size={22} />
              </div>
              <div className="flex-1 min-w-0">
                <div
                  className="kicker"
                  style={{ color: decom.textColor }}
                >
                  Aussteuerung
                </div>
                <div
                  className="font-display font-bold text-xl md:text-2xl mt-0.5 tracking-tight"
                  style={{ color: decom.textColor }}
                >
                  {fmtDate(v.decommission_date)}
                </div>
                <div className="text-[13px] mt-1" style={{ color: decom.textColor }}>
                  {decom.label}
                </div>
              </div>
              <div className="text-right shrink-0">
                <div
                  className="font-display font-bold text-3xl md:text-4xl font-mono tnum"
                  style={{ color: decom.color }}
                >
                  {decom.daysLeft != null ? decom.daysLeft : "—"}
                </div>
                <div className="kicker" style={{ color: decom.textColor }}>
                  {decom.daysLeft != null && decom.daysLeft >= 0 ? "Tage" : "überfällig"}
                </div>
              </div>
            </div>
          )}

          {showSuccessor && (
            <div className="mt-6">
              <SuccessorPanel
                vehicleId={v.id}
                decommissionDate={v.decommission_date}
                status={v.successor_status}
                stayingRenter={stayingRenter}
                assignedVehicleLabel={assignedVehicleLabel}
                assignedContractId={v.successor_contract_id}
                candidates={successorCandidates}
              />
            </div>
          )}

          <div className="mt-6">
            <VehicleEditPanel vehicle={vForEdit} userRole={isOwner ? "owner" : "member"}>
              <div className="grid sm:grid-cols-2 gap-3">
            <InfoCard Icon={Car} title="Stammdaten">
              <Row label="Hersteller" value={v.manufacturer || "—"} />
              <Row label="Modell" value={v.model || "—"} />
              <Row label="Karosserie" value={v.body_type || "—"} />
              <Row label="Geschäftslinie" value={v.category || "—"} />
              <Row label="Farbe" value={v.color || "—"} />
              <Row label="FIN" value={v.fin_number ? <span className="font-mono">{v.fin_number}</span> : "—"} />
            </InfoCard>

            <InfoCard Icon={Settings2} title="Technik">
              <Row label="Leistung" value={v.power_ps != null ? `${v.power_ps} PS` : "—"} mono />
              <Row label="Kraftstoff" value={v.fuel_type || "—"} />
              <Row label="Getriebe" value={v.transmission || "—"} />
              <Row label="Türen" value={v.doors || "—"} mono />
              <Row label="Sitzplätze" value={v.seats != null ? String(v.seats) : "—"} mono />
              <Row label="Gepäck" value={v.luggage != null ? String(v.luggage) : "—"} mono />
            </InfoCard>

            <InfoCard Icon={Gauge} title="Verfügbarkeit & Kilometer">
              <Row label="Verfügbar ab" value={v.available_from ? fmtDate(v.available_from) : "—"} mono />
              <Row label="Erstzulassung" value={v.first_registration ? fmtDate(v.first_registration) : "—"} mono />
              <Row label="Aussteuerung" value={v.decommission_date ? fmtDate(v.decommission_date) : "—"} mono />
              <Row
                label="Km bei Einflottung"
                value={v.km_at_intake != null ? v.km_at_intake.toLocaleString("de-DE") : "—"}
                mono
              />
              <Row
                label="Max km gesamt"
                value={v.max_km_total != null ? v.max_km_total.toLocaleString("de-DE") : "—"}
                mono
              />
              <Row
                label="Inkl. km / Monat"
                value={v.inclusive_km_month != null ? v.inclusive_km_month.toLocaleString("de-DE") : "—"}
                mono
              />
              <Row
                label="Mehr-km Preis"
                value={
                  v.extra_km_price != null
                    ? `${Number(v.extra_km_price).toFixed(2).replace(".", ",")} €/km`
                    : "—"
                }
                mono
              />
            </InfoCard>

            <InfoCard Icon={Coins} title="Preise (Brutto)">
              <Row label="Tagesmiete" value={fmtEur(v.daily_rate)} mono />
              <Row label="Wochenmiete" value={fmtEur(v.weekly_rate)} mono />
              <Row label="Monatsmiete" value={fmtEur(v.monthly_rate)} mono />
              <Row label="Kaution" value={fmtEur(v.deposit)} mono />
            </InfoCard>

            <InfoCard Icon={MapPin} title="Logistik & Intern">
              <Row label="Abhollager" value={v.pickup_location || "—"} />
              <Row label="Rückgabeort" value={v.return_location || "—"} />
              <Row label="Rückgabe erfolgt" value={fmtTimestamp(v.internal_return_at)} mono />
              <Row
                label="Interne Notiz"
                value={
                  v.internal_return_note ? (
                    <span className="whitespace-pre-wrap">{v.internal_return_note}</span>
                  ) : (
                    "—"
                  )
                }
              />
            </InfoCard>

            {v.accessories && (
              <Panel className="sm:col-span-2">
                <div className="flex items-center gap-2 kicker text-ink-muted mb-2">
                  <Sparkles size={13} /> Zubehör
                </div>
                <div className="text-[13.5px] whitespace-pre-wrap text-ink">{v.accessories}</div>
              </Panel>
            )}
              </div>
            </VehicleEditPanel>
          </div>

          <div className="mt-6">
            <RegistrationDocCard
              vehicleId={v.id}
              registrationDocPath={v.registration_doc_path}
            />
          </div>

          <div className="mt-6">
            <InsuranceCard
              vehicleId={v.id}
              insurer={v.insurer}
              policyNumber={v.policy_number}
              validUntil={v.insurance_valid_until}
              policyPath={v.insurance_policy_path}
              cardPath={v.insurance_card_path}
            />
          </div>

          <div className="mt-6">
            <VehiclePhotosCard vehicleId={v.id} />
          </div>

          {echoesEnabled && (
            <div className="mt-6">
              <GpsLocation
                vehicleId={v.id}
                hasDevice={!!v.echoes_device_id}
                initialLat={v.last_gps_lat}
                initialLng={v.last_gps_lng}
                initialUpdatedAt={v.last_gps_update}
              />
            </div>
          )}

          <div className="mt-6">
            <TiresSection vehicleId={v.id} tires={tiresWithPhotos} />
          </div>

          {isOwner && (
            <div className="mt-6">
              <PartnerPricingSection
                vehicleId={v.id}
                initialPricing={(partnerPricing ?? []) as React.ComponentProps<
                  typeof PartnerPricingSection
                >["initialPricing"]}
              />
            </div>
          )}

          <div className="mt-6">
            <VehicleEventsTimeline vehicleId={v.id} events={vehicleEvents} />
          </div>

          <div className="mt-6">
            <Panel flush>
              <PanelHeader
                Icon={FileSignature}
                title={`Verträge mit diesem Kennzeichen (${linkedContracts.length})`}
              />
              {linkedContracts.length === 0 ? (
                <EmptyState
                  Icon={Car}
                  title="Noch keine Verträge mit diesem Fahrzeug."
                />
              ) : (
                linkedContracts.map((ct) => (
                  <Link
                    key={ct.id}
                    href={`/dashboard/contracts/${ct.id}`}
                    className="grid grid-cols-[140px_1fr_180px_120px_24px] items-center gap-3 px-5 py-3 border-b border-hairline last:border-0 text-[13.5px] hover:bg-canvas transition-colors"
                  >
                    <span className="font-mono text-[12px] text-ink-muted">{ct.contract_nr}</span>
                    <span className="text-ink truncate">{ct.renter_name}</span>
                    <span className="font-mono tnum text-[12px] text-ink-muted">
                      {fmtDate(ct.pickup_date)} → {fmtDate(ct.return_date)}
                    </span>
                    <ContractStatusBadge
                      status={ct.status}
                      overdue={isContractOverdue(ct, localTodayIso())}
                    />
                    <ChevronRight size={14} className="text-ink-muted" />
                  </Link>
                ))
              )}
            </Panel>
          </div>
        </div>
      </div>
    </>
  );
}

/** TIMESTAMPTZ -> "10.06.2026, 14:30 Uhr" (deutsche Lokalzeit-Anzeige). */
const fmtTimestamp = (iso: string | null): string => {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const date = d.toLocaleDateString("de-DE", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const time = d.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" });
  return `${date}, ${time} Uhr`;
};

const InfoCard = ({
  title,
  Icon,
  children,
}: {
  title: string;
  Icon: LucideIcon;
  children: React.ReactNode;
}) => (
  <Panel>
    <div className="flex items-center gap-2 kicker text-ink-muted mb-3">
      <Icon size={13} />
      {title}
    </div>
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
  <div className="grid grid-cols-[140px_1fr] gap-2 text-[13px]">
    <div className="data-label text-ink-muted">{label}</div>
    <div className={mono ? "font-mono tnum text-ink" : "text-ink"}>{value}</div>
  </div>
);

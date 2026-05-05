import { notFound } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Calendar,
  Car,
  ChevronRight,
  Coins,
  FileSignature,
  Gauge,
  Settings2,
  Sparkles,
  type LucideIcon,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Topbar } from "@/components/dashboard/Topbar";
import { ContractStatusBadge } from "@/components/contract/StatusBadge";
import { VehicleForm } from "@/components/vehicle/VehicleForm";
import { VehicleDeleteButton } from "./VehicleDeleteButton";
import { VehicleEventsTimeline } from "@/components/vehicle/VehicleEventsTimeline";
import { TuevCountdown } from "@/components/vehicle/TuevCountdown";
import { GpsLocation } from "@/components/vehicle/GpsLocation";
import { fmtDate, fmtEur } from "@/lib/utils";
import { computeDecommission } from "@/lib/decommission";
import { VEHICLE_STATUS_META, buildVehicleType } from "@/lib/vehicle";
import type { Contract, Vehicle } from "@/lib/types";
import type { VehicleEvent } from "@/lib/vehicle-events";

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

  const [{ data: contracts }, { data: events }, { data: orgRow }] = await Promise.all([
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
  ]);
  const linkedContracts = (contracts || []) as Contract[];
  const vehicleEvents = (events || []) as VehicleEvent[];
  const echoesEnabled = !!(orgRow as { echoes_enabled?: boolean } | null)
    ?.echoes_enabled;

  const decom = computeDecommission(v);
  const status = VEHICLE_STATUS_META[v.status];
  const displayName = buildVehicleType(v.manufacturer, v.model) || v.vehicle_type || "Fahrzeug";

  return (
    <>
      <Topbar section={`Fahrzeug · ${v.plate}`} />
      <div className="flex-1 overflow-auto scroll-thin bg-stone-50">
        <div className="max-w-4xl mx-auto p-4 md:p-10">
          <Link
            href="/dashboard/vehicles"
            className="inline-flex items-center gap-1.5 text-sm text-stone-500 hover:text-stone-900 mb-4"
          >
            <ArrowLeft size={14} /> Zurück zu Fahrzeugen
          </Link>

          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="min-w-0">
              <div className="flex items-center gap-2 mb-2">
                <span
                  className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-medium"
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
                  <span className="text-[11px] uppercase tracking-wider text-stone-400 font-medium">
                    {v.category}
                  </span>
                )}
              </div>
              <h1 className="font-display font-bold text-2xl md:text-3xl tracking-tight">
                {displayName}
              </h1>
              <div className="mt-1 text-sm text-stone-500">
                <span className="font-mono">{v.plate}</span>
                {v.color && <span className="ml-2 font-sans">· {v.color}</span>}
              </div>
            </div>
            <VehicleDeleteButton vehicleId={v.id} />
          </div>

          <TuevCountdown events={vehicleEvents} />

          {v.decommission_date && (
            <div
              className="mt-6 rounded-2xl p-5 md:p-6 flex items-center gap-4 md:gap-5"
              style={{ background: decom.bg, boxShadow: `inset 0 0 0 1px ${decom.ring}` }}
            >
              <div
                className="w-12 h-12 md:w-14 md:h-14 rounded-xl flex items-center justify-center shrink-0"
                style={{ background: "white", color: decom.color }}
              >
                <Calendar size={22} />
              </div>
              <div className="flex-1 min-w-0">
                <div
                  className="text-[11px] uppercase tracking-wider font-semibold"
                  style={{ color: decom.textColor }}
                >
                  Aussteuerung
                </div>
                <div
                  className="font-display font-semibold text-xl md:text-2xl mt-0.5"
                  style={{ color: decom.textColor }}
                >
                  {fmtDate(v.decommission_date)}
                </div>
                <div className="text-sm mt-1" style={{ color: decom.textColor }}>
                  {decom.label}
                </div>
              </div>
              <div className="text-right shrink-0">
                <div
                  className="font-display font-bold text-3xl md:text-4xl tabular-nums"
                  style={{ color: decom.color }}
                >
                  {decom.daysLeft != null ? decom.daysLeft : "—"}
                </div>
                <div className="text-[11px] uppercase tracking-wider" style={{ color: decom.textColor }}>
                  {decom.daysLeft != null && decom.daysLeft >= 0 ? "Tage" : "überfällig"}
                </div>
              </div>
            </div>
          )}

          <div className="mt-6 grid sm:grid-cols-2 gap-3">
            <InfoCard Icon={Car} title="Stammdaten">
              <Row label="Hersteller" value={v.manufacturer || "—"} />
              <Row label="Modell" value={v.model || "—"} />
              <Row label="Karosserie" value={v.body_type || "—"} />
              <Row label="Kategorie" value={v.category || "—"} />
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

            {v.accessories && (
              <div className="sm:col-span-2 rounded-xl bg-white ring-1 ring-stone-200 p-5">
                <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-stone-500 font-semibold mb-2">
                  <Sparkles size={13} /> Zubehör
                </div>
                <div className="text-sm whitespace-pre-wrap">{v.accessories}</div>
              </div>
            )}
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
            <VehicleEventsTimeline vehicleId={v.id} events={vehicleEvents} />
          </div>

          <details className="mt-6 group">
            <summary className="cursor-pointer text-sm font-medium text-stone-700 hover:text-stone-900 inline-flex items-center gap-1.5">
              <ChevronRight size={14} className="group-open:rotate-90 transition-transform" />
              Daten bearbeiten
            </summary>
            <div className="mt-4">
              <VehicleForm mode="edit" initial={v} />
            </div>
          </details>

          <div className="mt-6">
            <div className="text-xs uppercase tracking-wider text-stone-500 font-medium mb-2 flex items-center gap-2">
              <FileSignature size={12} />
              Verträge mit diesem Kennzeichen ({linkedContracts.length})
            </div>
            <div className="rounded-xl bg-white ring-1 ring-stone-200 overflow-hidden">
              {linkedContracts.length === 0 && (
                <div className="px-5 py-8 text-center text-sm text-stone-500">
                  <Car size={24} className="mx-auto text-stone-300" />
                  <div className="mt-2">Noch keine Verträge mit diesem Fahrzeug.</div>
                </div>
              )}
              {linkedContracts.map((ct) => (
                <Link
                  key={ct.id}
                  href={`/dashboard/contracts/${ct.id}`}
                  className="grid grid-cols-[140px_1fr_180px_120px_24px] items-center gap-3 px-5 py-3 border-b border-stone-50 last:border-0 text-sm hover:bg-stone-50"
                >
                  <span className="font-mono text-xs">{ct.contract_nr}</span>
                  <span className="text-stone-700 truncate">{ct.renter_name}</span>
                  <span className="text-xs text-stone-500 tabular-nums">
                    {fmtDate(ct.pickup_date)} → {fmtDate(ct.return_date)}
                  </span>
                  <ContractStatusBadge status={ct.status} />
                  <ChevronRight size={14} className="text-stone-300" />
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

const InfoCard = ({
  title,
  Icon,
  children,
}: {
  title: string;
  Icon: LucideIcon;
  children: React.ReactNode;
}) => (
  <div className="rounded-xl bg-white ring-1 ring-stone-200 p-5">
    <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-stone-500 font-semibold mb-3">
      <Icon size={13} />
      {title}
    </div>
    <div className="space-y-1.5">{children}</div>
  </div>
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
  <div className="grid grid-cols-[140px_1fr] gap-2 text-sm">
    <div className="text-stone-500 text-xs">{label}</div>
    <div className={mono ? "tabular-nums text-stone-800" : "text-stone-800"}>{value}</div>
  </div>
);

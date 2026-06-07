import { notFound } from "next/navigation";
import Link from "next/link";
import {
  AlertOctagon,
  ArrowLeft,
  Calendar,
  FileSignature,
  MapPin,
  ShieldAlert,
  User,
} from "lucide-react";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { Topbar } from "@/components/dashboard/Topbar";
import { fmtDate } from "@/lib/utils";
import { DamageReportActions } from "./DamageReportActions";
import type { Contract, DamageReport, Vehicle } from "@/lib/types";
import { Panel } from "@/components/ui/Panel";
import { Plate } from "@/components/ui/Plate";

export const dynamic = "force-dynamic";

const STATUS_META: Record<
  DamageReport["status"],
  { label: string; bg: string; ring: string; color: string; text: string }
> = {
  offen: { label: "Offen", bg: "#fef2f2", ring: "#fecaca", color: "#dc2626", text: "#b91c1c" },
  gemeldet: { label: "Gemeldet", bg: "#fefce8", ring: "#fde68a", color: "#ca8a04", text: "#a16207" },
  reguliert: { label: "Reguliert", bg: "#f0fdf4", ring: "#bbf7d0", color: "#16a34a", text: "#15803d" },
};

export default async function DamageReportDetailPage({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) notFound();

  const { data: report } = await supabase
    .from("damage_reports")
    .select("*")
    .eq("id", params.id)
    .maybeSingle();
  if (!report) notFound();
  const r = report as DamageReport;

  const [vehicleRes, contractRes] = await Promise.all([
    r.vehicle_id
      ? supabase.from("vehicles").select("*").eq("id", r.vehicle_id).maybeSingle()
      : Promise.resolve({ data: null }),
    r.contract_id
      ? supabase
          .from("contracts")
          .select("id, contract_nr, plate, renter_name, renter_email, pickup_date, return_date, status")
          .eq("id", r.contract_id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
  ]);
  const vehicle = vehicleRes.data as Vehicle | null;
  const contract = contractRes.data as Pick<
    Contract,
    "id" | "contract_nr" | "plate" | "renter_name" | "renter_email" | "pickup_date" | "return_date" | "status"
  > | null;

  const admin = createAdminClient();
  const photoUrls: Array<{ path: string; url: string | null }> = await Promise.all(
    (r.photos || []).map(async (path) => {
      const { data: signed } = await admin.storage
        .from("damage-photos")
        .createSignedUrl(path, 3600);
      return { path, url: signed?.signedUrl || null };
    })
  );

  const meta = STATUS_META[r.status];

  return (
    <>
      <Topbar section={`Schadensbericht · ${fmtDate(r.date)}`} />
      <div className="flex-1 overflow-auto scroll-thin bg-canvas">
        <div className="max-w-4xl mx-auto p-4 md:p-10">
          <Link
            href="/dashboard/damage-reports"
            className="inline-flex items-center gap-1.5 text-[13px] text-ink-muted hover:text-ink mb-5"
          >
            <ArrowLeft size={13} /> Zurück zur Liste
          </Link>

          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
            <div className="min-w-0">
              <div className="flex items-center gap-2 mb-3">
                <AlertOctagon size={16} style={{ color: meta.color }} />
                <span
                  className="inline-flex items-center gap-1.5 rounded-full pl-2 pr-2.5 py-0.5 text-[11px] font-mono font-medium tracking-tight"
                  style={{
                    background: meta.bg,
                    color: meta.text,
                    boxShadow: `inset 0 0 0 1px ${meta.ring}`,
                  }}
                >
                  <span className="w-1.5 h-1.5 rounded-full" style={{ background: meta.color }} />
                  {meta.label}
                </span>
              </div>
              <h1 className="font-display font-extrabold text-ink text-[26px] sm:text-[30px] leading-[1.05] tracking-tightest break-words">
                {r.location || "Unbekannter Ort"}
              </h1>
              <div className="mt-1.5 font-mono tnum text-[13px] text-ink-muted">
                {fmtDate(r.date)}
                {r.time && <span className="ml-2">{r.time}</span>}
              </div>
            </div>
            <DamageReportActions reportId={r.id} initialStatus={r.status} />
          </div>

          <div className="mt-6 grid sm:grid-cols-2 gap-3">
            <InfoCard Icon={MapPin} title="Vorfall">
              <Row label="Datum" value={fmtDate(r.date)} mono />
              <Row label="Uhrzeit" value={r.time || "—"} mono />
              <Row label="Ort" value={r.location || "—"} />
              <Row label="Beschreibung" value={r.description || "—"} />
            </InfoCard>

            <InfoCard Icon={ShieldAlert} title="Aktenzeichen">
              <Row label="Polizei" value={r.police_reference_nr ? <span className="font-mono tnum">{r.police_reference_nr}</span> : "—"} />
              <Row label="Versicherung" value={r.insurance_claim_nr ? <span className="font-mono tnum">{r.insurance_claim_nr}</span> : "—"} />
            </InfoCard>

            {(r.other_party_name || r.other_party_plate || r.other_party_insurance) && (
              <InfoCard Icon={User} title="Unfallgegner">
                <Row label="Name" value={r.other_party_name || "—"} />
                <Row
                  label="Kennzeichen"
                  value={
                    r.other_party_plate ? (
                      <Plate value={r.other_party_plate} size="sm" />
                    ) : (
                      "—"
                    )
                  }
                />
                <Row label="Versicherung" value={r.other_party_insurance || "—"} />
              </InfoCard>
            )}

            {(vehicle || contract) && (
              <InfoCard Icon={FileSignature} title="Zuordnung">
                {vehicle && (
                  <Row
                    label="Fahrzeug"
                    value={
                      <Link
                        href={`/dashboard/vehicles/${vehicle.id}`}
                        className="hover:underline"
                      >
                        <Plate value={vehicle.plate} size="sm" />
                        {vehicle.vehicle_type && (
                          <span className="text-ink-muted ml-2 text-[12px] font-sans">
                            {vehicle.vehicle_type}
                          </span>
                        )}
                      </Link>
                    }
                  />
                )}
                {contract && (
                  <>
                    <Row
                      label="Vertrag"
                      value={
                        <Link
                          href={`/dashboard/contracts/${contract.id}`}
                          className="font-mono text-ink hover:underline"
                        >
                          {contract.contract_nr}
                        </Link>
                      }
                    />
                    <Row label="Mieter" value={contract.renter_name} />
                    <Row
                      label="Mietzeitraum"
                      value={
                        <span className="font-mono tnum text-[12px]">
                          {fmtDate(contract.pickup_date)} → {fmtDate(contract.return_date)}
                        </span>
                      }
                    />
                  </>
                )}
              </InfoCard>
            )}
          </div>

          <div className="mt-6">
            <div className="flex items-end justify-between mb-3">
              <div className="kicker text-ink-muted">
                Fotos ({photoUrls.length})
              </div>
            </div>
            {photoUrls.length === 0 ? (
              <Panel>
                <div className="py-6 text-center text-[13px] text-ink-muted">
                  Noch keine Fotos zu diesem Bericht.
                </div>
              </Panel>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {photoUrls.map((p) => (
                  <a
                    key={p.path}
                    href={p.url || "#"}
                    target="_blank"
                    rel="noreferrer"
                    className="relative aspect-square block rounded-panel overflow-hidden bg-canvas border border-hairline hover:border-ink/20 transition"
                  >
                    {p.url && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={p.url} alt="Schadensfoto" className="w-full h-full object-cover" />
                    )}
                  </a>
                ))}
              </div>
            )}
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
  Icon: typeof Calendar;
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
  <div className="grid grid-cols-[120px_1fr] gap-2 text-[13px]">
    <div className="data-label text-ink-muted">{label}</div>
    <div className={mono ? "font-mono tnum text-ink" : "text-ink"}>{value}</div>
  </div>
);

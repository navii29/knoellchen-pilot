import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  Calendar,
  Car,
  ChevronRight,
  FileSignature,
  Handshake,
  Mail,
  MapPin,
  Phone,
  Receipt,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Topbar } from "@/components/dashboard/Topbar";
import { fmtDate, fmtEur } from "@/lib/utils";
import {
  COMMISSION_TYPE_META,
  PARTNER_TYPE_META,
  type SalesPartner,
} from "@/lib/partners";
import type { Contract } from "@/lib/types";
import { PartnerActions } from "./PartnerActions";

export const dynamic = "force-dynamic";

export default async function PartnerDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const supabase = createClient();
  const { data: partner } = await supabase
    .from("sales_partners")
    .select("*")
    .eq("id", params.id)
    .maybeSingle();
  if (!partner) notFound();
  const p = partner as SalesPartner;

  const [{ data: pricing }, { data: contracts }] = await Promise.all([
    supabase
      .from("vehicle_partner_pricing")
      .select("*, vehicles!inner(id, plate, manufacturer, model, vehicle_type)")
      .eq("partner_id", p.id),
    supabase
      .from("contracts")
      .select(
        "id, contract_nr, plate, vehicle_type, renter_name, pickup_date, return_date, actual_return_date, partner_commission, status"
      )
      .eq("partner_id", p.id)
      .order("pickup_date", { ascending: false })
      .limit(50),
  ]);
  const pricingRows = pricing ?? [];
  type PartnerContractRow = Pick<
    Contract,
    | "id"
    | "contract_nr"
    | "plate"
    | "vehicle_type"
    | "renter_name"
    | "pickup_date"
    | "return_date"
    | "actual_return_date"
    | "partner_commission"
    | "status"
  >;
  const contractRows = (contracts ?? []) as unknown as PartnerContractRow[];

  // Provisions-Summe nach Zeitraum
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);

  const sumCommission = (filter: (c: PartnerContractRow) => boolean) =>
    contractRows
      .filter(filter)
      .reduce((s, c) => s + Number(c.partner_commission ?? 0), 0);

  const thisMonth = sumCommission(
    (c) => new Date(c.pickup_date) >= startOfMonth
  );
  const lastMonth = sumCommission(
    (c) =>
      new Date(c.pickup_date) >= startOfLastMonth &&
      new Date(c.pickup_date) <= endOfLastMonth
  );
  const total = sumCommission(() => true);

  const meta = PARTNER_TYPE_META[p.type];
  const fmtCommissionDefault = () => {
    if (p.commission_value == null) return "—";
    if (p.commission_type === "percent")
      return `${Number(p.commission_value).toFixed(1).replace(".", ",")} % vom VK`;
    if (p.commission_type === "fixed")
      return `${fmtEur(p.commission_value)} pauschal`;
    return "Marge VK − Einstand";
  };

  return (
    <>
      <Topbar section={`Partner · ${p.name}`} />
      <div className="flex-1 overflow-auto scroll-thin bg-stone-50">
        <div className="max-w-5xl mx-auto p-4 md:p-10">
          <Link
            href="/dashboard/partners"
            className="inline-flex items-center gap-1.5 text-sm text-stone-500 hover:text-stone-900 mb-4"
          >
            <ArrowLeft size={14} /> Zurück zu Partner
          </Link>

          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span
                  className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-medium"
                  style={{
                    background: meta.bg,
                    color: meta.text,
                    boxShadow: `inset 0 0 0 1px ${meta.ring}`,
                  }}
                >
                  <span
                    className="w-1.5 h-1.5 rounded-full"
                    style={{ background: meta.color }}
                  />
                  {meta.label}
                </span>
                {!p.active && (
                  <span className="text-[10.5px] uppercase tracking-wider text-stone-400">
                    inaktiv
                  </span>
                )}
              </div>
              <h1 className="font-display font-bold text-2xl md:text-3xl tracking-tight">
                {p.name}
              </h1>
              {p.contact_name && (
                <div className="text-sm text-stone-500 mt-0.5">{p.contact_name}</div>
              )}
            </div>
            <PartnerActions partnerId={p.id} />
          </div>

          {/* Provisions-Summary */}
          <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-3">
            <SummaryCard label="Diesen Monat" value={fmtEur(thisMonth)} />
            <SummaryCard label="Letzten Monat" value={fmtEur(lastMonth)} />
            <SummaryCard label="Gesamt" value={fmtEur(total)} highlight />
          </div>

          <div className="mt-3">
            <Link
              href={`/dashboard/partners/${p.id}/invoice`}
              className="inline-flex items-center gap-1.5 text-sm px-4 py-2 rounded-md bg-stone-900 text-white font-medium hover:bg-stone-800"
            >
              <Receipt size={14} /> Provisionsabrechnung erstellen
            </Link>
          </div>

          {/* Stammdaten + Provision */}
          <div className="mt-6 grid sm:grid-cols-2 gap-3">
            <InfoCard Icon={Handshake} title="Provisionsmodell">
              <Row
                label="Modell"
                value={COMMISSION_TYPE_META[p.commission_type].label}
              />
              <Row label="Default-Wert" value={fmtCommissionDefault()} />
              {p.commission_type !== "margin" && (
                <div className="text-[11.5px] text-stone-500 mt-1.5 leading-snug">
                  {COMMISSION_TYPE_META[p.commission_type].description}
                </div>
              )}
            </InfoCard>

            <InfoCard Icon={Mail} title="Kontakt">
              {p.email && <Row label="E-Mail" value={p.email} />}
              {p.phone && (
                <Row
                  label="Telefon"
                  value={
                    <span className="inline-flex items-center gap-1.5">
                      <Phone size={11} className="text-stone-400" /> {p.phone}
                    </span>
                  }
                />
              )}
              {p.address && (
                <Row
                  label="Adresse"
                  value={
                    <span className="inline-flex items-start gap-1.5">
                      <MapPin size={11} className="text-stone-400 mt-1" />
                      <span className="whitespace-pre-line">{p.address}</span>
                    </span>
                  }
                />
              )}
              {p.tax_number && (
                <Row label="Steuernummer" value={p.tax_number} />
              )}
            </InfoCard>
          </div>

          {/* Fahrzeug-Preise */}
          <div className="mt-6">
            <div className="text-xs uppercase tracking-wider text-stone-500 font-medium mb-2 flex items-center gap-2">
              <Car size={12} /> Fahrzeuge mit Preisen für diesen Partner ({pricingRows.length})
            </div>
            <div className="rounded-xl bg-white ring-1 ring-stone-200 overflow-hidden">
              {pricingRows.length === 0 ? (
                <div className="px-5 py-8 text-center text-sm text-stone-500">
                  Noch keine Fahrzeug-Preise hinterlegt. Im Fahrzeug-Detail unter
                  „Vertriebspartner-Preise“.
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-[140px_1fr_120px_120px_100px_24px] items-center gap-3 px-5 py-2.5 bg-stone-50 border-b border-stone-100 text-[10.5px] uppercase tracking-wider text-stone-500 font-semibold">
                    <span>Kennzeichen</span>
                    <span>Fahrzeug</span>
                    <span className="text-right">Einstand/Tag</span>
                    <span className="text-right">VK/Tag</span>
                    <span className="text-right">Marge/Tag</span>
                    <span />
                  </div>
                  {pricingRows.map((row) => {
                    const v = (
                      Array.isArray(row.vehicles) ? row.vehicles[0] : row.vehicles
                    ) as {
                      id: string;
                      plate: string;
                      manufacturer: string | null;
                      model: string | null;
                      vehicle_type: string | null;
                    } | null;
                    if (!v) return null;
                    const margin = Number(row.selling_price) - Number(row.purchase_price);
                    return (
                      <Link
                        key={row.id}
                        href={`/dashboard/vehicles/${v.id}`}
                        className="grid grid-cols-[140px_1fr_120px_120px_100px_24px] items-center gap-3 px-5 py-2.5 hover:bg-stone-50 border-b border-stone-100 last:border-0"
                      >
                        <span className="font-mono text-sm font-semibold text-stone-900">
                          {v.plate}
                        </span>
                        <span className="text-sm text-stone-700 truncate">
                          {[v.manufacturer, v.model].filter(Boolean).join(" ") ||
                            v.vehicle_type ||
                            "—"}
                        </span>
                        <span className="text-sm tabular-nums text-stone-700 text-right">
                          {fmtEur(Number(row.purchase_price))}
                        </span>
                        <span className="text-sm tabular-nums text-stone-900 text-right font-medium">
                          {fmtEur(Number(row.selling_price))}
                        </span>
                        <span
                          className={`text-sm tabular-nums text-right font-semibold ${
                            margin > 0 ? "text-emerald-700" : "text-stone-400"
                          }`}
                        >
                          {fmtEur(margin)}
                        </span>
                        <ChevronRight size={14} className="text-stone-300" />
                      </Link>
                    );
                  })}
                </>
              )}
            </div>
          </div>

          {/* Verträge */}
          <div className="mt-6">
            <div className="text-xs uppercase tracking-wider text-stone-500 font-medium mb-2 flex items-center gap-2">
              <FileSignature size={12} /> Verträge über diesen Partner ({contractRows.length})
            </div>
            <div className="rounded-xl bg-white ring-1 ring-stone-200 overflow-hidden">
              {contractRows.length === 0 ? (
                <div className="px-5 py-8 text-center text-sm text-stone-500">
                  Noch keine Verträge mit diesem Partner.
                </div>
              ) : (
                contractRows.map((c) => (
                  <Link
                    key={c.id}
                    href={`/dashboard/contracts/${c.id}`}
                    className="grid grid-cols-[140px_1fr_180px_140px_100px_24px] items-center gap-3 px-5 py-3 hover:bg-stone-50 border-b border-stone-100 last:border-0"
                  >
                    <span className="font-mono text-xs text-stone-700">
                      {c.contract_nr}
                    </span>
                    <span className="text-sm text-stone-700 truncate">
                      {c.renter_name}
                    </span>
                    <span className="font-mono text-xs text-stone-500">
                      {c.plate}
                    </span>
                    <span className="text-xs text-stone-500 inline-flex items-center gap-1 tabular-nums">
                      <Calendar size={10} className="text-stone-400" />
                      {fmtDate(c.pickup_date)}
                    </span>
                    <span className="text-sm tabular-nums text-emerald-700 font-semibold text-right">
                      {fmtEur(Number(c.partner_commission ?? 0))}
                    </span>
                    <ChevronRight size={14} className="text-stone-300" />
                  </Link>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

const SummaryCard = ({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) => (
  <div
    className={`rounded-xl ring-1 p-4 ${
      highlight
        ? "bg-stone-900 text-white ring-stone-900"
        : "bg-white ring-stone-200"
    }`}
  >
    <div
      className={`text-[11px] uppercase tracking-wider font-semibold ${
        highlight ? "text-white/70" : "text-stone-500"
      }`}
    >
      {label}
    </div>
    <div className="font-display text-[28px] tracking-tight font-medium leading-tight tabular-nums mt-1">
      {value}
    </div>
  </div>
);

const InfoCard = ({
  title,
  Icon,
  children,
}: {
  title: string;
  Icon: typeof Mail;
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
}: {
  label: string;
  value: React.ReactNode;
}) => (
  <div className="grid grid-cols-[120px_1fr] gap-2 text-sm">
    <div className="text-stone-500 text-xs">{label}</div>
    <div className="text-stone-800">{value}</div>
  </div>
);

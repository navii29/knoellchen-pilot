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
import { PageHeader } from "@/components/ui/PageHeader";
import { Panel, PanelHeader } from "@/components/ui/Panel";
import { EmptyState } from "@/components/ui/EmptyState";
import { ButtonLink } from "@/components/ui/Button";
import { Plate } from "@/components/ui/Plate";
import { fmtDate, fmtEur } from "@/lib/utils";
import {
  COMMISSION_TYPE_META,
  PARTNER_TYPE_META,
  type SalesPartner,
} from "@/lib/partners";
import type { Contract } from "@/lib/types";
import { PartnerActions } from "./PartnerActions";
import { requireOwnerPage } from "@/lib/team";

export const dynamic = "force-dynamic";

export default async function PartnerDetailPage({
  params,
}: {
  params: { id: string };
}) {
  await requireOwnerPage(); // Partner-EK/VK/Provision nur für Inhaber
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
      <div className="flex-1 overflow-auto scroll-thin bg-canvas">
        <div className="max-w-5xl mx-auto p-4 md:p-10">
          <Link
            href="/dashboard/partners"
            className="inline-flex items-center gap-1.5 text-[13px] text-ink-muted hover:text-ink mb-5"
          >
            <ArrowLeft size={14} /> Zurück zu Partner
          </Link>

          <PageHeader
            kicker={[meta.label, !p.active ? "· inaktiv" : ""].filter(Boolean).join(" ")}
            title={p.name}
            description={p.contact_name || undefined}
            actions={<PartnerActions partnerId={p.id} />}
          />

          {/* Provisions-Summary */}
          <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-3">
            <SummaryCard label="Diesen Monat" value={fmtEur(thisMonth)} />
            <SummaryCard label="Letzten Monat" value={fmtEur(lastMonth)} />
            <SummaryCard label="Gesamt" value={fmtEur(total)} highlight />
          </div>

          <div className="mt-3">
            <ButtonLink
              href={`/dashboard/partners/${p.id}/invoice`}
              variant="ink"
              size="sm"
            >
              <Receipt size={14} /> Provisionsabrechnung erstellen
            </ButtonLink>
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
                <div className="text-[11.5px] text-ink-muted mt-1.5 leading-snug">
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
                      <Phone size={11} className="text-ink-muted" /> {p.phone}
                    </span>
                  }
                />
              )}
              {p.address && (
                <Row
                  label="Adresse"
                  value={
                    <span className="inline-flex items-start gap-1.5">
                      <MapPin size={11} className="text-ink-muted mt-1" />
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
            <Panel flush>
              <PanelHeader
                Icon={Car}
                title={`Fahrzeuge mit Preisen für diesen Partner (${pricingRows.length})`}
              />
              {pricingRows.length === 0 ? (
                <EmptyState
                  Icon={Car}
                  title="Noch keine Fahrzeug-Preise hinterlegt."
                  description={'Im Fahrzeug-Detail unter „Vertriebspartner-Preise".'}
                />
              ) : (
                <>
                  <div className="grid grid-cols-[140px_1fr_120px_120px_100px_24px] items-center gap-3 px-5 py-2.5 border-b border-hairline bg-canvas/60 th">
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
                        className="grid grid-cols-[140px_1fr_120px_120px_100px_24px] items-center gap-3 px-5 py-2.5 hover:bg-canvas border-b border-hairline last:border-0 transition-colors"
                      >
                        <Plate value={v.plate} size="sm" />
                        <span className="text-[13.5px] text-ink truncate">
                          {[v.manufacturer, v.model].filter(Boolean).join(" ") ||
                            v.vehicle_type ||
                            "—"}
                        </span>
                        <span className="font-mono tnum text-[13px] text-ink-soft text-right">
                          {fmtEur(Number(row.purchase_price))}
                        </span>
                        <span className="font-mono tnum text-[13px] text-ink text-right font-medium">
                          {fmtEur(Number(row.selling_price))}
                        </span>
                        <span
                          className={`font-mono tnum text-[13px] text-right font-semibold ${
                            margin > 0 ? "text-ink" : "text-ink-muted"
                          }`}
                        >
                          {fmtEur(margin)}
                        </span>
                        <ChevronRight size={14} className="text-ink-muted" />
                      </Link>
                    );
                  })}
                </>
              )}
            </Panel>
          </div>

          {/* Verträge */}
          <div className="mt-6">
            <Panel flush>
              <PanelHeader
                Icon={FileSignature}
                title={`Verträge über diesen Partner (${contractRows.length})`}
              />
              {contractRows.length === 0 ? (
                <EmptyState
                  Icon={FileSignature}
                  title="Noch keine Verträge mit diesem Partner."
                />
              ) : (
                contractRows.map((c) => (
                  <Link
                    key={c.id}
                    href={`/dashboard/contracts/${c.id}`}
                    className="grid grid-cols-[140px_1fr_140px_140px_100px_24px] items-center gap-3 px-5 py-3 hover:bg-canvas border-b border-hairline last:border-0 transition-colors"
                  >
                    <span className="font-mono text-[12px] text-ink-muted tnum">
                      {c.contract_nr}
                    </span>
                    <span className="text-[13.5px] text-ink truncate">
                      {c.renter_name}
                    </span>
                    {c.plate ? (
                      <Plate value={c.plate} size="sm" />
                    ) : (
                      <span className="font-mono text-ink-muted">—</span>
                    )}
                    <span className="text-[12px] text-ink-muted inline-flex items-center gap-1 font-mono tnum">
                      <Calendar size={10} className="text-ink-muted" />
                      {fmtDate(c.pickup_date)}
                    </span>
                    <span className="font-mono tnum text-[13px] text-ink font-semibold text-right">
                      {fmtEur(Number(c.partner_commission ?? 0))}
                    </span>
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
    className={`rounded-card border p-4 ${
      highlight
        ? "bg-ink text-white border-ink"
        : "bg-paper border-hairline shadow-panel"
    }`}
  >
    <div
      className={`data-label mb-1 ${
        highlight ? "text-white/60" : "text-ink-muted"
      }`}
    >
      {label}
    </div>
    <div className="font-display text-[28px] tracking-tight font-bold leading-tight font-mono tnum">
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
  <Panel>
    <div className="flex items-center gap-2 data-label mb-3">
      <Icon size={13} className="text-ink-muted" />
      {title}
    </div>
    <div className="space-y-1.5">{children}</div>
  </Panel>
);

const Row = ({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) => (
  <div className="grid grid-cols-[120px_1fr] gap-2 text-[13px]">
    <div className="text-ink-muted text-[12px]">{label}</div>
    <div className="text-ink">{value}</div>
  </div>
);

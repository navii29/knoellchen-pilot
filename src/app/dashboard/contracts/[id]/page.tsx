import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Calendar, ChevronRight, Coins, ScrollText, User } from "lucide-react";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { Topbar } from "@/components/dashboard/Topbar";
import { ContractStatusBadge } from "@/components/contract/StatusBadge";
import { StatusBadge } from "@/components/dashboard/StatusBadge";
import { ContractActions } from "./ContractActions";
import { fmtDate, fmtEur } from "@/lib/utils";
import { computeExtraKm } from "@/lib/km";
import type { Contract, Ticket, Vehicle } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function ContractDetailPage({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) notFound();

  const { data: contract } = await supabase
    .from("contracts")
    .select("*")
    .eq("id", params.id)
    .maybeSingle();
  if (!contract) notFound();
  const c = contract as Contract;

  const { data: tickets } = await supabase
    .from("tickets")
    .select("*")
    .eq("contract_id", c.id)
    .order("created_at", { ascending: false });
  const linkedTickets = (tickets || []) as Ticket[];

  const { data: vehicleRow } = await supabase
    .from("vehicles")
    .select("extra_km_price")
    .eq("plate", c.plate)
    .maybeSingle();
  const pricePerKm = (vehicleRow as Pick<Vehicle, "extra_km_price"> | null)?.extra_km_price ?? null;
  const km = computeExtraKm({
    kmPickup: c.km_pickup,
    kmReturn: c.km_return,
    kmLimit: c.km_limit,
    pricePerKm,
  });

  let pdfUrl: string | null = null;
  if (c.contract_pdf_path) {
    const admin = createAdminClient();
    const { data: signed } = await admin.storage
      .from("contract-uploads")
      .createSignedUrl(c.contract_pdf_path, 3600);
    pdfUrl = signed?.signedUrl || null;
  }

  return (
    <>
      <Topbar section={`Vertrag · ${c.contract_nr}`} />
      <div className="flex-1 overflow-auto scroll-thin bg-stone-50">
        <div className="max-w-4xl mx-auto p-6 md:p-10">
          <Link
            href="/dashboard/contracts"
            className="inline-flex items-center gap-1.5 text-sm text-stone-500 hover:text-stone-900 mb-4"
          >
            <ArrowLeft size={14} /> Zurück zu Verträgen
          </Link>

          <div className="flex items-center gap-3 mb-2 flex-wrap">
            <span className="font-mono text-xs text-stone-500">{c.contract_nr}</span>
            <ContractStatusBadge status={c.status} />
            <span className="font-mono text-xs text-stone-500">· {c.plate}</span>
          </div>
          <h1 className="font-display font-bold text-3xl tracking-tight">{c.renter_name}</h1>
          {c.renter_address && <div className="mt-1 text-sm text-stone-500">{c.renter_address}</div>}

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
              <Row label="Kennzeichen" value={c.plate} mono />
            </InfoCard>

            <InfoCard Icon={Coins} title="Kosten">
              <Row label="Tagespreis" value={fmtEur(c.daily_rate)} mono />
              <Row label="Gesamtbetrag" value={fmtEur(c.total_amount)} mono />
              <Row label="Kaution" value={fmtEur(c.deposit)} mono />
            </InfoCard>

            <InfoCard Icon={ScrollText} title="Kilometer & Notizen">
              <Row label="km Abholung" value={c.km_pickup ?? "—"} mono />
              <Row label="km Rückgabe" value={c.km_return ?? "—"} mono />
              <Row label="Freikilometer" value={c.km_limit ?? "unbegrenzt"} mono />
              {km && (
                <>
                  <Row label="Gefahren" value={`${km.drivenKm} km`} mono />
                  {km.extraKm > 0 && (
                    <Row
                      label="Mehrkilometer"
                      value={
                        <span className="text-amber-700 font-mono">
                          {km.extraKm} km × {km.pricePerKm.toFixed(2).replace(".", ",")} € ={" "}
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

          {km && km.extraKm > 0 && (
            <div className="mt-6 rounded-xl bg-amber-50 ring-1 ring-amber-200 p-5">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-lg bg-white text-amber-700 flex items-center justify-center shrink-0 ring-1 ring-amber-200">
                  <ScrollText size={18} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[11px] uppercase tracking-wider text-amber-800 font-semibold">
                    Mehrkilometer
                  </div>
                  <div className="font-display font-semibold text-lg text-amber-900 mt-0.5">
                    {km.drivenKm} km gefahren · {c.km_limit} km frei · {km.extraKm} km zusätzlich
                  </div>
                  <div className="text-sm text-amber-800 mt-1">
                    {km.extraKm} km × {km.pricePerKm.toFixed(2).replace(".", ",")} €/km ={" "}
                    <strong className="font-mono">{fmtEur(km.cost)}</strong>
                    {pricePerKm == null && (
                      <span className="text-xs ml-2 opacity-80">
                        (Fahrzeug-Preis fehlt — bitte am Fahrzeug eintragen)
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="mt-6">
            <ContractActions contract={c} pdfUrl={pdfUrl} />
          </div>

          <div className="mt-6">
            <div className="text-xs uppercase tracking-wider text-stone-500 font-medium mb-2">
              Verknüpfte Strafzettel ({linkedTickets.length})
            </div>
            <div className="rounded-xl bg-white ring-1 ring-stone-200 overflow-hidden">
              {linkedTickets.length === 0 && (
                <div className="px-5 py-8 text-center text-sm text-stone-500">
                  Noch keine Strafzettel diesem Vertrag zugeordnet.
                </div>
              )}
              {linkedTickets.map((t) => (
                <Link
                  key={t.id}
                  href={`/dashboard/tickets/${t.id}`}
                  className="grid grid-cols-[100px_1fr_120px_100px_24px] items-center gap-3 px-5 py-3 border-b border-stone-50 last:border-0 text-sm hover:bg-stone-50"
                >
                  <span className="font-mono text-xs">{t.ticket_nr}</span>
                  <span className="truncate">{t.offense || "—"}</span>
                  <span className="text-xs text-stone-500 font-mono">{fmtDate(t.offense_date)}</span>
                  <StatusBadge status={t.status} />
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
  Icon: typeof User;
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
  <div className="grid grid-cols-[120px_1fr] gap-2 text-sm">
    <div className="text-stone-500 text-xs">{label}</div>
    <div className={mono ? "font-mono text-stone-800" : "text-stone-800"}>{value}</div>
  </div>
);

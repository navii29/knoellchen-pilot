import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Calendar, Car, Check, Coins, FileSignature, KeyRound, LogOut } from "lucide-react";
import { getPortalCustomer } from "@/lib/portal-auth";
import { createAdminClient } from "@/lib/supabase/server";
import { fmtDate, fmtEur } from "@/lib/utils";
import type { Contract } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function PortalContractDetail({
  params,
}: {
  params: { id: string };
}) {
  const ctx = await getPortalCustomer();
  if (!ctx) return null;

  const admin = createAdminClient();
  const { data: contract } = await admin
    .from("contracts")
    .select("*")
    .eq("id", params.id)
    .eq("org_id", ctx.session.org_id)
    .eq("customer_id", ctx.session.customer_id)
    .maybeSingle();
  if (!contract) notFound();
  const c = contract as Contract;

  return (
    <div className="px-5 py-3 space-y-4">
      <Link
        href="/portal/contracts"
        className="inline-flex items-center gap-1.5 text-[13px] text-stone-500 hover:text-stone-900"
      >
        <ArrowLeft size={13} /> Alle Verträge
      </Link>

      <div>
        <div className="flex items-center gap-2 flex-wrap text-[12px] text-stone-500 mb-1">
          <span className="font-mono text-stone-700">{c.plate}</span>
          <span>·</span>
          <span>{c.contract_nr}</span>
          <span>·</span>
          <span className="capitalize">{c.status}</span>
        </div>
        <h1 className="font-display text-[24px] tracking-tight font-medium text-stone-900">
          {c.vehicle_type || "Mietvertrag"}
        </h1>
      </div>

      {c.signed_at ? (
        <div className="rounded-2xl bg-emerald-50 ring-1 ring-emerald-200 p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center shrink-0">
            <Check size={18} className="text-emerald-700" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[12px] uppercase tracking-wider font-semibold text-emerald-800">
              Vertrag unterschrieben
            </div>
            <div className="font-display text-[16px] text-emerald-900 leading-tight">
              am {fmtDate(c.signed_at)}
            </div>
          </div>
          <a
            href={`/api/portal/contracts/${c.id}/contract-pdf`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[12.5px] font-medium px-3 py-2 rounded-md bg-white ring-1 ring-emerald-200 text-emerald-800 hover:bg-emerald-100 shrink-0"
          >
            PDF öffnen ↗
          </a>
        </div>
      ) : (
        <Link
          href={`/portal/contracts/${c.id}/sign`}
          className="rounded-2xl bg-stone-900 text-white p-4 flex items-center gap-3 hover:bg-stone-800"
        >
          <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center shrink-0">
            <FileSignature size={18} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-display text-[16px] font-medium leading-tight">
              Vertrag unterschreiben
            </div>
            <div className="text-[12.5px] text-white/70 mt-0.5">
              Per Finger oder Stift auf dem Display.
            </div>
          </div>
        </Link>
      )}

      {c.status === "aktiv" && (c.checkin_step ?? 0) < 5 && (
        <Link
          href={`/portal/contracts/${c.id}/checkin`}
          className="rounded-2xl bg-teal-600 text-white p-4 flex items-center gap-3 hover:bg-teal-700"
        >
          <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center shrink-0">
            <KeyRound size={18} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-display text-[16px] font-medium leading-tight">
              {(c.checkin_step ?? 0) > 0 ? "Check-in fortsetzen" : "Self-Check-in starten"}
            </div>
            <div className="text-[12.5px] text-white/80 mt-0.5">
              {(c.checkin_step ?? 0) > 0
                ? `Schritt ${c.checkin_step ?? 0} von 5 erledigt`
                : "Führerschein, Ausweis, Fotos, Unterschrift — in 5 Schritten."}
            </div>
          </div>
        </Link>
      )}

      {c.status === "aktiv" && c.signed_at && (c.checkin_step ?? 0) >= 5 && (
        <Link
          href={`/portal/contracts/${c.id}/checkout`}
          className="rounded-2xl bg-stone-900 text-white p-4 flex items-center gap-3 hover:bg-stone-800"
        >
          <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center shrink-0">
            <LogOut size={18} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-display text-[16px] font-medium leading-tight">
              {(c.checkout_step ?? 0) > 0 ? "Check-out fortsetzen" : "Self-Check-out starten"}
            </div>
            <div className="text-[12.5px] text-white/70 mt-0.5">
              Fotos · Kilometerstand · Tank — in 4 Schritten.
            </div>
          </div>
        </Link>
      )}

      <Card Icon={Car} title="Fahrzeug">
        <Row label="Kennzeichen" value={c.plate} mono />
        <Row label="Typ" value={c.vehicle_type ?? "—"} />
        {c.km_pickup != null && (
          <Row
            label="Km bei Übergabe"
            value={c.km_pickup.toLocaleString("de-DE")}
            mono
          />
        )}
      </Card>

      <Card Icon={Calendar} title="Mietzeitraum">
        <Row
          label="Übernahme"
          value={`${fmtDate(c.pickup_date)}${c.pickup_time ? " · " + c.pickup_time : ""}`}
        />
        <Row
          label="Geplante Rückgabe"
          value={`${fmtDate(c.return_date)}${c.return_time ? " · " + c.return_time : ""}`}
        />
        {c.actual_return_date && (
          <Row label="Tatsächliche Rückgabe" value={fmtDate(c.actual_return_date)} />
        )}
      </Card>

      <Card Icon={Coins} title="Kosten">
        {c.daily_rate != null && (
          <Row label="Tagespreis" value={fmtEur(c.daily_rate)} mono />
        )}
        {c.total_amount != null && (
          <Row label="Gesamtbetrag" value={fmtEur(c.total_amount)} mono />
        )}
        {c.deposit != null && c.deposit > 0 && (
          <Row label="Kaution" value={fmtEur(c.deposit)} mono />
        )}
      </Card>
    </div>
  );
}

const Card = ({
  title,
  Icon,
  children,
}: {
  title: string;
  Icon: typeof Car;
  children: React.ReactNode;
}) => (
  <div className="rounded-2xl bg-white ring-1 ring-stone-200 p-4">
    <div className="flex items-center gap-2 text-[11px] uppercase tracking-wider text-stone-500 font-semibold mb-3">
      <Icon size={12} />
      {title}
    </div>
    <div className="space-y-2">{children}</div>
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
    <div className="text-stone-500 text-[12.5px]">{label}</div>
    <div className={mono ? "tabular-nums text-stone-900" : "text-stone-900"}>
      {value}
    </div>
  </div>
);

import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Calendar, Car, Check, Coins, FileSignature, KeyRound, LogOut } from "lucide-react";
import { getPortalCustomer } from "@/lib/portal-auth";
import { createAdminClient } from "@/lib/supabase/server";
import { fmtDate, fmtEur } from "@/lib/utils";
import type { Contract } from "@/lib/types";
import { Plate } from "@/components/ui/Plate";
import { ButtonLink } from "@/components/ui/Button";

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
        className="inline-flex items-center gap-1.5 text-[13px] text-ink-muted hover:text-ink transition-colors"
      >
        <ArrowLeft size={13} /> Alle Verträge
      </Link>

      <div>
        <div className="flex items-center gap-2 flex-wrap mb-1">
          <Plate value={c.plate} size="sm" />
          <span className="text-[12px] text-ink-muted font-mono">{c.contract_nr}</span>
          <span className="text-[12px] text-ink-muted capitalize">· {c.status}</span>
        </div>
        <h1 className="font-display text-[24px] tracking-tightest font-bold text-ink">
          {c.vehicle_type || "Mietvertrag"}
        </h1>
      </div>

      {c.signed_at ? (
        <div className="bg-canvas border border-hairline rounded-card p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-card bg-paper border border-hairline flex items-center justify-center shrink-0">
            <Check size={16} className="text-ink-soft" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="kicker text-ink-muted mb-0.5">Vertrag unterschrieben</div>
            <div className="font-display text-[15px] text-ink font-semibold leading-tight">
              am {fmtDate(c.signed_at)}
            </div>
          </div>
          <a
            href={`/api/portal/contracts/${c.id}/contract-pdf`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[12px] font-medium px-3 py-2 rounded-btn bg-paper border border-hairline text-ink-soft hover:text-ink hover:bg-canvas transition-colors shrink-0"
          >
            PDF ↗
          </a>
        </div>
      ) : (
        <ButtonLink
          href={`/portal/contracts/${c.id}/sign`}
          variant="signal"
          size="lg"
          className="w-full"
        >
          <FileSignature size={16} />
          Vertrag unterschreiben
        </ButtonLink>
      )}

      {c.status === "aktiv" && (c.checkin_step ?? 0) < 5 && (
        <Link
          href={`/portal/contracts/${c.id}/checkin`}
          className="bg-ink text-white rounded-card p-4 flex items-center gap-3 hover:bg-ink-soft transition-colors"
        >
          <div className="w-10 h-10 rounded-card bg-white/10 flex items-center justify-center shrink-0">
            <KeyRound size={18} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-display text-[15px] font-semibold leading-tight">
              {(c.checkin_step ?? 0) > 0 ? "Check-in fortsetzen" : "Self-Check-in starten"}
            </div>
            <div className="text-[12px] text-white/70 mt-0.5">
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
          className="bg-ink text-white rounded-card p-4 flex items-center gap-3 hover:bg-ink-soft transition-colors"
        >
          <div className="w-10 h-10 rounded-card bg-white/10 flex items-center justify-center shrink-0">
            <LogOut size={18} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-display text-[15px] font-semibold leading-tight">
              {(c.checkout_step ?? 0) > 0 ? "Check-out fortsetzen" : "Self-Check-out starten"}
            </div>
            <div className="text-[12px] text-white/70 mt-0.5">
              Fotos · Kilometerstand · Tank — in 4 Schritten.
            </div>
          </div>
        </Link>
      )}

      <Card Icon={Car} title="Fahrzeug">
        <Row label="Kennzeichen" value={<Plate value={c.plate} size="sm" />} />
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
          mono
        />
        <Row
          label="Geplante Rückgabe"
          value={`${fmtDate(c.return_date)}${c.return_time ? " · " + c.return_time : ""}`}
          mono
        />
        {c.actual_return_date && (
          <Row label="Tatsächliche Rückgabe" value={fmtDate(c.actual_return_date)} mono />
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
  <div className="bg-paper border border-hairline rounded-card shadow-panel p-4">
    <div className="flex items-center gap-1.5 kicker text-ink-muted mb-3">
      <Icon size={11} />
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
    <div className="text-ink-muted text-[12px]">{label}</div>
    <div className={mono ? "font-mono tnum text-ink" : "text-ink"}>
      {value}
    </div>
  </div>
);

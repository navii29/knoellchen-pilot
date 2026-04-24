import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Calendar, Car, ChevronRight, FileSignature } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Topbar } from "@/components/dashboard/Topbar";
import { ContractStatusBadge } from "@/components/contract/StatusBadge";
import { VehicleEditClient } from "./VehicleEditClient";
import { fmtDate } from "@/lib/utils";
import { computeDecommission } from "@/lib/decommission";
import type { Contract, Vehicle } from "@/lib/types";

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

  const { data: contracts } = await supabase
    .from("contracts")
    .select("*")
    .eq("plate", v.plate)
    .order("pickup_date", { ascending: false })
    .limit(50);
  const linkedContracts = (contracts || []) as Contract[];

  const info = computeDecommission(v);

  return (
    <>
      <Topbar section={`Fahrzeug · ${v.plate}`} />
      <div className="flex-1 overflow-auto scroll-thin bg-stone-50">
        <div className="max-w-4xl mx-auto p-6 md:p-10">
          <Link
            href="/dashboard/vehicles"
            className="inline-flex items-center gap-1.5 text-sm text-stone-500 hover:text-stone-900 mb-4"
          >
            <ArrowLeft size={14} /> Zurück zu Fahrzeugen
          </Link>

          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <div className="text-xs text-stone-500 mb-1 font-mono">{v.vehicle_type || "Fahrzeug"}</div>
              <h1 className="font-display font-bold text-3xl tracking-tight font-mono">{v.plate}</h1>
              {v.color && <div className="mt-1 text-sm text-stone-500">Farbe: {v.color}</div>}
            </div>
          </div>

          {v.decommission_date && (
            <div
              className="mt-6 rounded-2xl p-6 flex items-center gap-5"
              style={{
                background: info.bg,
                boxShadow: `inset 0 0 0 1px ${info.ring}`,
              }}
            >
              <div
                className="w-14 h-14 rounded-xl flex items-center justify-center shrink-0"
                style={{ background: "white", color: info.color }}
              >
                <Calendar size={26} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[11px] uppercase tracking-wider font-semibold" style={{ color: info.textColor }}>
                  Aussteuerung
                </div>
                <div className="font-display font-semibold text-2xl mt-0.5" style={{ color: info.textColor }}>
                  {fmtDate(v.decommission_date)}
                </div>
                <div className="text-sm mt-1" style={{ color: info.textColor }}>
                  {info.label}
                </div>
              </div>
              <div className="text-right">
                <div
                  className="font-display font-bold text-4xl tabular-nums"
                  style={{ color: info.color }}
                >
                  {info.daysLeft != null ? (info.daysLeft >= 0 ? info.daysLeft : `${info.daysLeft}`) : "—"}
                </div>
                <div className="text-[11px] uppercase tracking-wider" style={{ color: info.textColor }}>
                  {info.daysLeft != null && info.daysLeft >= 0 ? "Tage" : "überfällig"}
                </div>
              </div>
            </div>
          )}

          <div className="mt-6">
            <VehicleEditClient
              vehicleId={v.id}
              initial={{
                vehicle_type: v.vehicle_type || "",
                color: v.color || "",
                first_registration: v.first_registration || "",
                decommission_reminded: v.decommission_reminded,
              }}
            />
          </div>

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
                  <span className="text-xs text-stone-500 font-mono">
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

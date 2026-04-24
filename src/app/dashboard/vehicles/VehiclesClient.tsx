"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Car, ChevronRight, Loader2, Plus, Trash2 } from "lucide-react";
import { THEME } from "@/lib/theme";
import { fmtDate } from "@/lib/utils";
import { computeDecommission } from "@/lib/decommission";
import type { Vehicle } from "@/lib/types";

export const VehiclesClient = ({ initial }: { initial: Vehicle[] }) => {
  const router = useRouter();
  const [plate, setPlate] = useState("");
  const [type, setType] = useState("");
  const [color, setColor] = useState("");
  const [firstReg, setFirstReg] = useState("");
  const [extraKmPrice, setExtraKmPrice] = useState("0.29");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await fetch("/api/vehicles", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        plate,
        vehicle_type: type,
        color,
        first_registration: firstReg || null,
        extra_km_price: extraKmPrice ? Number(extraKmPrice.replace(",", ".")) : null,
      }),
    });
    setBusy(false);
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setError(j.error || "Fehler");
      return;
    }
    setPlate("");
    setType("");
    setColor("");
    setFirstReg("");
    setExtraKmPrice("0.29");
    router.refresh();
  };

  const remove = async (id: string) => {
    if (!confirm("Fahrzeug wirklich löschen?")) return;
    const res = await fetch(`/api/vehicles?id=${id}`, { method: "DELETE" });
    if (res.ok) router.refresh();
  };

  return (
    <>
      <div className="font-display font-bold text-2xl tracking-tight">Fahrzeuge</div>
      <p className="text-sm text-stone-500 mt-1">
        Übersicht der Mietflotte. Erstzulassung eintragen — Aussteuerungsdatum wird automatisch berechnet (+ 180 Tage).
      </p>

      <form
        onSubmit={add}
        className="mt-6 rounded-xl bg-white ring-1 ring-stone-200 p-4 md:p-5 grid grid-cols-2 sm:grid-cols-[140px_1fr_110px_140px_120px_auto] gap-3 items-end"
      >
        <Field label="Kennzeichen *">
          <input
            required
            value={plate}
            onChange={(e) => setPlate(e.target.value)}
            placeholder="M-KP 2847"
            className="w-full px-3 py-2 text-sm rounded-lg ring-1 ring-stone-200 outline-none focus:ring-stone-400 font-mono uppercase"
          />
        </Field>
        <Field label="Fahrzeugtyp">
          <input
            value={type}
            onChange={(e) => setType(e.target.value)}
            placeholder="VW Golf VIII"
            className="w-full px-3 py-2 text-sm rounded-lg ring-1 ring-stone-200 outline-none focus:ring-stone-400"
          />
        </Field>
        <Field label="Farbe">
          <input
            value={color}
            onChange={(e) => setColor(e.target.value)}
            placeholder="weiß"
            className="w-full px-3 py-2 text-sm rounded-lg ring-1 ring-stone-200 outline-none focus:ring-stone-400"
          />
        </Field>
        <Field label="Erstzulassung">
          <input
            type="date"
            value={firstReg}
            onChange={(e) => setFirstReg(e.target.value)}
            className="w-full px-3 py-2 text-sm rounded-lg ring-1 ring-stone-200 outline-none focus:ring-stone-400 font-mono"
          />
        </Field>
        <Field label="Mehr-km Preis">
          <div className="relative">
            <input
              value={extraKmPrice}
              onChange={(e) => setExtraKmPrice(e.target.value)}
              placeholder="0.29"
              className="w-full px-3 py-2 pr-9 text-sm rounded-lg ring-1 ring-stone-200 outline-none focus:ring-stone-400 font-mono"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-stone-400">€/km</span>
          </div>
        </Field>
        <button
          type="submit"
          disabled={busy}
          className="inline-flex items-center justify-center gap-1.5 text-sm text-white px-4 py-2 rounded-lg font-medium"
          style={{ background: THEME.primary }}
        >
          {busy ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />} Hinzufügen
        </button>
      </form>
      {firstReg && (
        <div className="mt-2 text-xs text-stone-500">
          Aussteuerung berechnet auf:{" "}
          <span className="font-mono text-stone-700">
            {fmtDate(addDays(firstReg, 180))}
          </span>
        </div>
      )}
      {error && (
        <div className="mt-3 text-sm text-red-700 bg-red-50 ring-1 ring-red-200 rounded-lg px-3 py-2">{error}</div>
      )}

      <div className="mt-6 rounded-xl bg-white ring-1 ring-stone-200 overflow-hidden">
        {initial.length === 0 && (
          <div className="px-5 py-12 text-center text-sm text-stone-500">Noch keine Fahrzeuge.</div>
        )}
        {initial.map((v) => {
          const info = computeDecommission(v);
          return (
            <div
              key={v.id}
              className="border-b border-stone-50 last:border-0"
            >
              {/* Desktop */}
              <div className="hidden md:grid grid-cols-[40px_120px_1fr_100px_220px_24px_auto] items-center gap-3 px-5 py-3 text-sm">
                <div className="w-8 h-8 rounded-lg bg-stone-100 text-stone-700 flex items-center justify-center">
                  <Car size={15} />
                </div>
                <span className="font-mono font-semibold">{v.plate}</span>
                <span className="text-stone-700 truncate">
                  {v.vehicle_type || "—"}
                  {v.extra_km_price != null && (
                    <span className="text-stone-400 text-[11px] ml-2 font-mono">
                      · {Number(v.extra_km_price).toFixed(2).replace(".", ",")} €/km
                    </span>
                  )}
                </span>
                <span className="text-stone-500 text-xs">{v.color || "—"}</span>
                <span>
                  {v.decommission_date ? (
                    <span
                      className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-[11px] font-medium"
                      style={{
                        background: info.bg,
                        color: info.textColor,
                        boxShadow: `inset 0 0 0 1px ${info.ring}`,
                      }}
                    >
                      <span
                        className="w-1.5 h-1.5 rounded-full"
                        style={{ background: info.color }}
                      />
                      {info.label}
                    </span>
                  ) : (
                    <span className="text-xs text-stone-400">Erstzulassung fehlt</span>
                  )}
                </span>
                <Link
                  href={`/dashboard/vehicles/${v.id}`}
                  className="text-stone-400 hover:text-stone-700 p-1.5"
                  title="Detail"
                >
                  <ChevronRight size={14} />
                </Link>
                <button
                  onClick={() => remove(v.id)}
                  className="text-stone-400 hover:text-red-600 p-1.5"
                  title="Löschen"
                >
                  <Trash2 size={14} />
                </button>
              </div>

              {/* Mobile */}
              <div className="md:hidden flex items-start gap-3 px-4 py-3">
                <Link
                  href={`/dashboard/vehicles/${v.id}`}
                  className="flex-1 min-w-0 flex items-start gap-3 active:bg-stone-100 -mx-4 -my-3 px-4 py-3"
                >
                  <div className="w-9 h-9 rounded-lg bg-stone-100 text-stone-700 flex items-center justify-center shrink-0">
                    <Car size={16} />
                  </div>
                  <div className="flex-1 min-w-0 space-y-0.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono font-semibold text-sm">{v.plate}</span>
                      {v.color && (
                        <span className="text-[11px] text-stone-400">· {v.color}</span>
                      )}
                    </div>
                    <div className="text-xs text-stone-500 truncate">
                      {v.vehicle_type || "—"}
                      {v.extra_km_price != null && (
                        <span className="text-stone-400 ml-1.5 font-mono">
                          · {Number(v.extra_km_price).toFixed(2).replace(".", ",")} €/km
                        </span>
                      )}
                    </div>
                    {v.decommission_date && (
                      <span
                        className="inline-flex items-center gap-1.5 px-1.5 py-0.5 rounded text-[10px] font-medium mt-1"
                        style={{
                          background: info.bg,
                          color: info.textColor,
                          boxShadow: `inset 0 0 0 1px ${info.ring}`,
                        }}
                      >
                        <span
                          className="w-1 h-1 rounded-full"
                          style={{ background: info.color }}
                        />
                        {info.label}
                      </span>
                    )}
                  </div>
                </Link>
                <button
                  onClick={() => remove(v.id)}
                  className="touch-target flex items-center justify-center text-stone-400 hover:text-red-600"
                  title="Löschen"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
};

const addDays = (iso: string, days: number): string => {
  const d = new Date(iso);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
};

const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <label className="block">
    <div className="text-[11px] uppercase tracking-wider text-stone-500 font-medium mb-1">{label}</div>
    {children}
  </label>
);

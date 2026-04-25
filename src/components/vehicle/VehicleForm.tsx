"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, Loader2, Save } from "lucide-react";
import { THEME } from "@/lib/theme";
import { fmtDate } from "@/lib/utils";
import {
  BODY_TYPES,
  CATEGORIES,
  DOORS,
  FUEL_TYPES,
  MANUFACTURERS,
  TRANSMISSIONS,
  VEHICLE_STATUS_META,
  VEHICLE_STATUSES,
  buildVehicleType,
} from "@/lib/vehicle";
import type { Vehicle, VehicleStatus } from "@/lib/types";

type Mode = "create" | "edit";

export type VehicleFormState = {
  // Stammdaten
  manufacturer: string;
  model: string;
  plate: string;
  fin_number: string;
  power_ps: string;
  fuel_type: string;
  transmission: string;
  doors: string;
  seats: string;
  luggage: string;
  body_type: string;
  color: string;
  category: string;

  // Verfügbarkeit
  available_from: string;
  km_at_intake: string;
  first_registration: string;
  max_km_total: string;
  inclusive_km_month: string;
  extra_km_price: string;

  // Preise
  daily_rate: string;
  weekly_rate: string;
  monthly_rate: string;
  deposit: string;

  // Sonstiges
  accessories: string;
  status: VehicleStatus;
};

const empty: VehicleFormState = {
  manufacturer: "",
  model: "",
  plate: "",
  fin_number: "",
  power_ps: "",
  fuel_type: "",
  transmission: "",
  doors: "",
  seats: "",
  luggage: "",
  body_type: "",
  color: "",
  category: "",
  available_from: new Date().toISOString().slice(0, 10),
  km_at_intake: "",
  first_registration: "",
  max_km_total: "",
  inclusive_km_month: "",
  extra_km_price: "0.29",
  daily_rate: "",
  weekly_rate: "",
  monthly_rate: "",
  deposit: "",
  accessories: "",
  status: "aktiv",
};

const fromVehicle = (v: Vehicle): VehicleFormState => ({
  manufacturer: v.manufacturer || "",
  model: v.model || "",
  plate: v.plate || "",
  fin_number: v.fin_number || "",
  power_ps: v.power_ps != null ? String(v.power_ps) : "",
  fuel_type: v.fuel_type || "",
  transmission: v.transmission || "",
  doors: v.doors || "",
  seats: v.seats != null ? String(v.seats) : "",
  luggage: v.luggage != null ? String(v.luggage) : "",
  body_type: v.body_type || "",
  color: v.color || "",
  category: v.category || "",
  available_from: v.available_from || "",
  km_at_intake: v.km_at_intake != null ? String(v.km_at_intake) : "",
  first_registration: v.first_registration || "",
  max_km_total: v.max_km_total != null ? String(v.max_km_total) : "",
  inclusive_km_month: v.inclusive_km_month != null ? String(v.inclusive_km_month) : "",
  extra_km_price: v.extra_km_price != null ? String(v.extra_km_price) : "",
  daily_rate: v.daily_rate != null ? String(v.daily_rate) : "",
  weekly_rate: v.weekly_rate != null ? String(v.weekly_rate) : "",
  monthly_rate: v.monthly_rate != null ? String(v.monthly_rate) : "",
  deposit: v.deposit != null ? String(v.deposit) : "",
  accessories: v.accessories || "",
  status: v.status || "aktiv",
});

const addDays = (iso: string, days: number): string => {
  if (!iso) return "";
  const d = new Date(iso);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
};

export const VehicleForm = ({
  mode,
  initial,
}: {
  mode: Mode;
  initial?: Vehicle;
}) => {
  const router = useRouter();
  const [data, setData] = useState<VehicleFormState>(
    initial ? fromVehicle(initial) : empty
  );
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = (k: keyof VehicleFormState) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
      const v = e.target.value;
      setData((d) => ({ ...d, [k]: v }));
    };

  const previewType = useMemo(
    () => buildVehicleType(data.manufacturer, data.model),
    [data.manufacturer, data.model]
  );

  const decommissionPreview = data.first_registration
    ? addDays(data.first_registration, 180)
    : "";

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!data.plate.trim()) {
      setError("Kennzeichen ist Pflichtfeld");
      return;
    }
    setSaving(true);
    setSaved(false);

    const payload = { ...data };
    const url = mode === "create" ? "/api/vehicles" : `/api/vehicles/${initial!.id}`;
    const method = mode === "create" ? "POST" : "PATCH";
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    setSaving(false);
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setError(j.error || "Speichern fehlgeschlagen");
      return;
    }
    setSaved(true);
    if (mode === "create") {
      const j = (await res.json()) as { vehicle: { id: string } };
      router.push(`/dashboard/vehicles/${j.vehicle.id}`);
    }
    router.refresh();
  };

  return (
    <>
      {mode === "create" && (
        <Link
          href="/dashboard/vehicles"
          className="inline-flex items-center gap-1.5 text-sm text-stone-500 hover:text-stone-900 mb-4"
        >
          <ArrowLeft size={14} /> Zurück zu Fahrzeugen
        </Link>
      )}

      {mode === "create" && (
        <>
          <div className="font-display font-bold text-2xl tracking-tight">Neues Fahrzeug</div>
          <p className="text-sm text-stone-500 mt-1">
            Vollständige Stammdaten — kannst auch jederzeit später ergänzen.
          </p>
        </>
      )}

      <form onSubmit={submit} className="mt-6 space-y-6">
        <Card title="Fahrzeugdaten">
          <Field label="Hersteller">
            <select value={data.manufacturer} onChange={set("manufacturer")} className="input">
              <option value="">—</option>
              {MANUFACTURERS.map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </Field>
          <Field label="Modell">
            <input value={data.model} onChange={set("model")} placeholder="X3 20d" className="input" />
          </Field>
          <Field label="Kennzeichen *">
            <input
              required
              value={data.plate}
              onChange={set("plate")}
              placeholder="M-KP 2847"
              className="input font-mono uppercase"
            />
          </Field>
          <Field label="FIN (Fahrgestellnummer)">
            <input
              value={data.fin_number}
              onChange={set("fin_number")}
              placeholder="WBA8E91040K123456"
              className="input font-mono"
            />
          </Field>
          <Field label="Leistung (PS)">
            <input
              value={data.power_ps}
              onChange={set("power_ps")}
              placeholder="190"
              className="input font-mono"
            />
          </Field>
          <Field label="Kraftstoff">
            <select value={data.fuel_type} onChange={set("fuel_type")} className="input">
              <option value="">—</option>
              {FUEL_TYPES.map((f) => (
                <option key={f} value={f}>{f}</option>
              ))}
            </select>
          </Field>
          <Field label="Getriebe">
            <select value={data.transmission} onChange={set("transmission")} className="input">
              <option value="">—</option>
              {TRANSMISSIONS.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </Field>
          <Field label="Türen">
            <select value={data.doors} onChange={set("doors")} className="input">
              <option value="">—</option>
              {DOORS.map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </Field>
          <Field label="Sitzplätze">
            <input
              value={data.seats}
              onChange={set("seats")}
              placeholder="5"
              className="input font-mono"
            />
          </Field>
          <Field label="Gepäckstücke">
            <input
              value={data.luggage}
              onChange={set("luggage")}
              placeholder="2"
              className="input font-mono"
            />
          </Field>
          <Field label="Karosserieform">
            <select value={data.body_type} onChange={set("body_type")} className="input">
              <option value="">—</option>
              {BODY_TYPES.map((b) => (
                <option key={b} value={b}>{b}</option>
              ))}
            </select>
          </Field>
          <Field label="Farbe">
            <input
              value={data.color}
              onChange={set("color")}
              placeholder="weiß"
              className="input"
            />
          </Field>
          <Field label="Kategorie">
            <select value={data.category} onChange={set("category")} className="input">
              <option value="">—</option>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </Field>
          <Field label="Anzeige-Name (auto)">
            <div className="input bg-stone-50 text-stone-500 font-mono">
              {previewType || "wird aus Hersteller + Modell erstellt"}
            </div>
          </Field>
        </Card>

        <Card title="Verfügbarkeit & Kilometer">
          <Field label="Verfügbar ab">
            <input
              type="date"
              value={data.available_from}
              onChange={set("available_from")}
              className="input font-mono"
            />
          </Field>
          <Field label="Km-Stand bei Einflottung">
            <input
              value={data.km_at_intake}
              onChange={set("km_at_intake")}
              placeholder="12500"
              className="input font-mono"
            />
          </Field>
          <Field label="Erstzulassung">
            <input
              type="date"
              value={data.first_registration}
              onChange={set("first_registration")}
              className="input font-mono"
            />
          </Field>
          <Field label="Aussteuerung (auto)">
            <div className="input bg-stone-50 text-stone-500 font-mono">
              {decommissionPreview ? fmtDate(decommissionPreview) + " (+ 180 Tage)" : "—"}
            </div>
          </Field>
          <Field label="Maximalkilometer gesamt">
            <input
              value={data.max_km_total}
              onChange={set("max_km_total")}
              placeholder="80000"
              className="input font-mono"
            />
          </Field>
          <Field label="Inklusivkilometer / Monat">
            <input
              value={data.inclusive_km_month}
              onChange={set("inclusive_km_month")}
              placeholder="2000"
              className="input font-mono"
            />
          </Field>
          <Field label="Mehrkilometer-Preis (€/km)">
            <div className="relative">
              <input
                value={data.extra_km_price}
                onChange={set("extra_km_price")}
                placeholder="0.29"
                className="input pr-10 font-mono"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-stone-400">
                €/km
              </span>
            </div>
          </Field>
        </Card>

        <Card title="Preise (Brutto)">
          <Field label="Tagesmiete (€)">
            <div className="relative">
              <input
                value={data.daily_rate}
                onChange={set("daily_rate")}
                placeholder="49.00"
                className="input pr-8 font-mono"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-stone-400">€</span>
            </div>
          </Field>
          <Field label="Wochenmiete (€)">
            <div className="relative">
              <input
                value={data.weekly_rate}
                onChange={set("weekly_rate")}
                placeholder="299.00"
                className="input pr-8 font-mono"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-stone-400">€</span>
            </div>
          </Field>
          <Field label="Monatsmiete (€)">
            <div className="relative">
              <input
                value={data.monthly_rate}
                onChange={set("monthly_rate")}
                placeholder="999.00"
                className="input pr-8 font-mono"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-stone-400">€</span>
            </div>
          </Field>
          <Field label="Kaution (€)">
            <div className="relative">
              <input
                value={data.deposit}
                onChange={set("deposit")}
                placeholder="500.00"
                className="input pr-8 font-mono"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-stone-400">€</span>
            </div>
          </Field>
        </Card>

        <Card title="Sonstiges">
          <div className="sm:col-span-2">
            <Field label="Zubehör">
              <textarea
                value={data.accessories}
                onChange={set("accessories")}
                rows={3}
                placeholder="Navi, Kindersitz, Dachbox, Anhängerkupplung…"
                className="input resize-none"
              />
            </Field>
          </div>
          <Field label="Status">
            <select value={data.status} onChange={set("status")} className="input">
              {VEHICLE_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {VEHICLE_STATUS_META[s].label}
                </option>
              ))}
            </select>
          </Field>
        </Card>

        {error && (
          <div className="text-sm text-red-700 bg-red-50 ring-1 ring-red-200 rounded-lg px-3 py-2">{error}</div>
        )}

        <div className="flex items-center justify-end gap-3 sticky bottom-0 bg-stone-50 py-3 -mx-4 md:-mx-0 md:py-0 md:bg-transparent px-4 md:px-0">
          {saved && (
            <span className="inline-flex items-center gap-1 text-xs text-emerald-700">
              <CheckCircle2 size={13} /> Gespeichert
            </span>
          )}
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-1.5 text-white text-sm px-4 py-2.5 rounded-lg font-medium disabled:opacity-50"
            style={{ background: THEME.primary }}
          >
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            {mode === "create" ? "Fahrzeug anlegen" : "Speichern"}
          </button>
        </div>

        <style jsx>{`
          .input {
            display: block;
            width: 100%;
            padding: 0.5rem 0.75rem;
            font-size: 0.875rem;
            border-radius: 0.5rem;
            outline: none;
            background: white;
            box-shadow: inset 0 0 0 1px rgb(231 229 228);
          }
          .input:focus {
            box-shadow: inset 0 0 0 1px rgb(168 162 158);
          }
        `}</style>
      </form>
    </>
  );
};

const Card = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div className="rounded-xl bg-white ring-1 ring-stone-200 p-4 md:p-5">
    <div className="text-[11px] uppercase tracking-wider text-stone-500 font-semibold mb-3">
      {title}
    </div>
    <div className="grid sm:grid-cols-2 gap-4">{children}</div>
  </div>
);

const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <label className="block">
    <div className="text-[11px] uppercase tracking-wider text-stone-500 font-medium mb-1">
      {label}
    </div>
    {children}
  </label>
);

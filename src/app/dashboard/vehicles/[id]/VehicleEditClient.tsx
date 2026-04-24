"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Loader2, Save } from "lucide-react";
import { THEME } from "@/lib/theme";
import { fmtDate } from "@/lib/utils";

type Initial = {
  vehicle_type: string;
  color: string;
  first_registration: string;
  decommission_reminded: boolean;
};

const addDays = (iso: string, days: number): string => {
  const d = new Date(iso);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
};

export const VehicleEditClient = ({
  vehicleId,
  initial,
}: {
  vehicleId: string;
  initial: Initial;
}) => {
  const router = useRouter();
  const [data, setData] = useState<Initial>(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const set = <K extends keyof Initial>(k: K, v: Initial[K]) =>
    setData((d) => ({ ...d, [k]: v }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setSaved(false);
    const res = await fetch(`/api/vehicles/${vehicleId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        vehicle_type: data.vehicle_type,
        color: data.color,
        first_registration: data.first_registration || null,
        decommission_reminded: data.decommission_reminded,
      }),
    });
    setBusy(false);
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setError(j.error || "Speichern fehlgeschlagen");
      return;
    }
    setSaved(true);
    router.refresh();
  };

  return (
    <form onSubmit={submit} className="rounded-xl bg-white ring-1 ring-stone-200 p-5 space-y-4">
      <div className="text-[11px] uppercase tracking-wider text-stone-500 font-semibold">
        Fahrzeugdaten
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <Field label="Fahrzeugtyp">
          <input
            value={data.vehicle_type}
            onChange={(e) => set("vehicle_type", e.target.value)}
            className="input"
          />
        </Field>
        <Field label="Farbe">
          <input
            value={data.color}
            onChange={(e) => set("color", e.target.value)}
            className="input"
          />
        </Field>
        <Field label="Erstzulassung">
          <input
            type="date"
            value={data.first_registration}
            onChange={(e) => set("first_registration", e.target.value)}
            className="input font-mono"
          />
          {data.first_registration && (
            <div className="text-[11px] text-stone-500 mt-1">
              Aussteuerung: {fmtDate(addDays(data.first_registration, 180))}
            </div>
          )}
        </Field>
        <Field label="Reminder">
          <label className="inline-flex items-center gap-2 mt-2 text-sm cursor-pointer select-none">
            <input
              type="checkbox"
              checked={data.decommission_reminded}
              onChange={(e) => set("decommission_reminded", e.target.checked)}
              className="rounded"
            />
            Aussteuerungs-Reminder bereits gesendet
          </label>
        </Field>
      </div>

      {error && (
        <div className="text-sm text-red-700 bg-red-50 ring-1 ring-red-200 rounded-lg px-3 py-2">{error}</div>
      )}
      <div className="flex items-center justify-end gap-3">
        {saved && (
          <span className="inline-flex items-center gap-1 text-xs text-emerald-700">
            <CheckCircle2 size={13} /> Gespeichert
          </span>
        )}
        <button
          type="submit"
          disabled={busy}
          className="inline-flex items-center gap-1.5 text-white text-sm px-4 py-2 rounded-lg font-medium disabled:opacity-50"
          style={{ background: THEME.primary }}
        >
          {busy ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Speichern
        </button>
      </div>

      <style jsx>{`
        .input {
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
  );
};

const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <label className="block">
    <div className="text-[11px] uppercase tracking-wider text-stone-500 font-medium mb-1">{label}</div>
    {children}
  </label>
);

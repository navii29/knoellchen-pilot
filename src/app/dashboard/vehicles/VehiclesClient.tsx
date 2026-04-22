"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Car, Loader2, Plus, Trash2 } from "lucide-react";
import { THEME } from "@/lib/theme";
import type { Vehicle } from "@/lib/types";

export const VehiclesClient = ({ initial }: { initial: Vehicle[] }) => {
  const router = useRouter();
  const [plate, setPlate] = useState("");
  const [type, setType] = useState("");
  const [color, setColor] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await fetch("/api/vehicles", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ plate, vehicle_type: type, color }),
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
        Übersicht Ihrer Mietflotte. Wird automatisch beim Buchungs-Import ergänzt.
      </p>

      <form onSubmit={add} className="mt-6 rounded-xl bg-white ring-1 ring-stone-200 p-5 grid sm:grid-cols-[160px_1fr_140px_auto] gap-3 items-end">
        <Field label="Kennzeichen *">
          <input required value={plate} onChange={(e) => setPlate(e.target.value)} placeholder="M-KP 2847" className="w-full px-3 py-2 text-sm rounded-lg ring-1 ring-stone-200 outline-none focus:ring-stone-400 font-mono uppercase" />
        </Field>
        <Field label="Fahrzeugtyp">
          <input value={type} onChange={(e) => setType(e.target.value)} placeholder="VW Golf VIII" className="w-full px-3 py-2 text-sm rounded-lg ring-1 ring-stone-200 outline-none focus:ring-stone-400" />
        </Field>
        <Field label="Farbe">
          <input value={color} onChange={(e) => setColor(e.target.value)} placeholder="weiß" className="w-full px-3 py-2 text-sm rounded-lg ring-1 ring-stone-200 outline-none focus:ring-stone-400" />
        </Field>
        <button type="submit" disabled={busy} className="inline-flex items-center justify-center gap-1.5 text-sm text-white px-4 py-2 rounded-lg font-medium" style={{ background: THEME.primary }}>
          {busy ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />} Hinzufügen
        </button>
      </form>
      {error && (
        <div className="mt-3 text-sm text-red-700 bg-red-50 ring-1 ring-red-200 rounded-lg px-3 py-2">{error}</div>
      )}

      <div className="mt-6 rounded-xl bg-white ring-1 ring-stone-200 overflow-hidden">
        {initial.length === 0 && (
          <div className="px-5 py-12 text-center text-sm text-stone-500">Noch keine Fahrzeuge.</div>
        )}
        {initial.map((v) => (
          <div
            key={v.id}
            className="grid grid-cols-[40px_140px_1fr_140px_auto] items-center gap-3 px-5 py-3 border-b border-stone-50 last:border-0 text-sm"
          >
            <div className="w-8 h-8 rounded-lg bg-stone-100 text-stone-700 flex items-center justify-center">
              <Car size={15} />
            </div>
            <span className="font-mono font-semibold">{v.plate}</span>
            <span className="text-stone-700">{v.vehicle_type || "—"}</span>
            <span className="text-stone-500">{v.color || "—"}</span>
            <button onClick={() => remove(v.id)} className="text-stone-400 hover:text-red-600 p-1.5">
              <Trash2 size={14} />
            </button>
          </div>
        ))}
      </div>
    </>
  );
};

const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <label className="block">
    <div className="text-[11px] uppercase tracking-wider text-stone-500 font-medium mb-1">{label}</div>
    {children}
  </label>
);

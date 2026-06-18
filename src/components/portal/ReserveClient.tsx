"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, CalendarPlus, Check, Loader2 } from "lucide-react";

type Vehicle = { id: string; plate: string; vehicle_type: string | null };

export const ReserveClient = ({ vehicles }: { vehicles: Vehicle[] }) => {
  const today = new Date().toISOString().slice(0, 10);
  const [vehicleId, setVehicleId] = useState("");
  const [pickup, setPickup] = useState(today);
  const [ret, setRet] = useState("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pickup || !ret) {
      setError("Bitte einen Zeitraum angeben.");
      return;
    }
    if (ret < pickup) {
      setError("Die Rückgabe muss nach der Abholung liegen.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const r = await fetch("/api/portal/reservations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          vehicle_id: vehicleId || null,
          pickup_date: pickup,
          return_date: ret,
          note,
        }),
      });
      const j = (await r.json().catch(() => ({}))) as { error?: string };
      if (!r.ok) {
        setError(j.error ?? "Fehler");
        setSaving(false);
        return;
      }
      setDone(true);
    } catch {
      setError("Netzwerkfehler");
      setSaving(false);
    }
  };

  if (done) {
    return (
      <div className="px-5 py-4 space-y-4">
        <div className="glass-card rounded-card p-6 text-center">
          <div className="inline-flex w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 items-center justify-center mb-3">
            <Check size={22} />
          </div>
          <h2 className="font-display text-[18px] font-bold text-ink">Anfrage gesendet</h2>
          <p className="text-[13px] text-ink-muted mt-1">
            Die Vermietung meldet sich mit einer Bestätigung bei dir.
          </p>
          <Link
            href="/portal/contracts"
            className="inline-block mt-4 text-[13px] text-signal font-medium"
          >
            Zu meinen Mieten
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="px-5 py-4 space-y-4">
      <Link
        href="/portal/contracts"
        className="inline-flex items-center gap-1.5 text-[13px] text-ink-muted hover:text-ink transition-colors"
      >
        <ArrowLeft size={13} /> Zurück
      </Link>
      <h1 className="font-display text-[22px] tracking-tightest font-bold text-ink px-1">
        Neue Miete anfragen
      </h1>

      <form onSubmit={submit} className="glass-card glass-sheen rounded-card p-5 space-y-3">
        {vehicles.length > 0 && (
          <label className="block">
            <div className="data-label mb-1">Fahrzeug (optional)</div>
            <select
              className="field"
              value={vehicleId}
              onChange={(e) => setVehicleId(e.target.value)}
            >
              <option value="">Egal / keine Präferenz</option>
              {vehicles.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.vehicle_type || "Fahrzeug"} · {v.plate}
                </option>
              ))}
            </select>
          </label>
        )}
        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <div className="data-label mb-1">Abholung</div>
            <input
              type="date"
              className="field"
              min={today}
              value={pickup}
              onChange={(e) => setPickup(e.target.value)}
              required
            />
          </label>
          <label className="block">
            <div className="data-label mb-1">Rückgabe</div>
            <input
              type="date"
              className="field"
              min={pickup}
              value={ret}
              onChange={(e) => setRet(e.target.value)}
              required
            />
          </label>
        </div>
        <label className="block">
          <div className="data-label mb-1">Anmerkung (optional)</div>
          <textarea
            className="field"
            rows={3}
            placeholder="Wünsche, Fragen…"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </label>

        {error && (
          <div className="text-[13px] rounded-input px-3 py-2 bg-rose-50 border border-rose-200 text-rose-700">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={saving}
          className="w-full rounded-btn bg-signal text-white py-3 text-[14px] font-semibold inline-flex items-center justify-center gap-2 active:scale-[.99] disabled:opacity-60"
        >
          {saving ? <Loader2 size={15} className="animate-spin" /> : <CalendarPlus size={15} />}
          Anfrage senden
        </button>
      </form>
    </div>
  );
};

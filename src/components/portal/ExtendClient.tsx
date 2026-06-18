"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, CalendarPlus, Loader2 } from "lucide-react";
import { Plate } from "@/components/ui/Plate";

const DAY_MS = 86_400_000;
const fmtEur = (n: number) =>
  new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" }).format(n);

export const ExtendClient = ({
  contractId,
  plate,
  vehicleType,
  currentReturnDate,
  dailyRate,
}: {
  contractId: string;
  plate: string;
  vehicleType: string | null;
  currentReturnDate: string;
  dailyRate: number | null;
}) => {
  const router = useRouter();
  const minDate = new Date(new Date(currentReturnDate).getTime() + DAY_MS)
    .toISOString()
    .slice(0, 10);
  const [date, setDate] = useState(minDate);
  const [time, setTime] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const days = Math.max(
    0,
    Math.round(
      (new Date(date).getTime() - new Date(currentReturnDate).getTime()) / DAY_MS
    )
  );
  const estCost = dailyRate != null ? Math.round(days * dailyRate * 100) / 100 : null;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const r = await fetch(`/api/portal/contracts/${contractId}/extend`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requested_return_date: date, requested_return_time: time }),
      });
      const j = (await r.json().catch(() => ({}))) as { error?: string };
      if (!r.ok) {
        setError(j.error ?? "Fehler");
        setSaving(false);
        return;
      }
      router.replace(`/portal/contracts/${contractId}?verlaengert=1`);
      router.refresh();
    } catch {
      setError("Netzwerkfehler");
      setSaving(false);
    }
  };

  return (
    <div className="px-5 py-4 space-y-4">
      <Link
        href={`/portal/contracts/${contractId}`}
        className="inline-flex items-center gap-1.5 text-[13px] text-ink-muted hover:text-ink transition-colors"
      >
        <ArrowLeft size={13} /> Zurück zum Vertrag
      </Link>

      <div className="flex items-center gap-2">
        <Plate value={plate} size="sm" />
        <span className="text-[13px] text-ink-soft">{vehicleType || "Fahrzeug"}</span>
      </div>
      <h1 className="font-display text-[22px] tracking-tightest font-bold text-ink">
        Miete verlängern
      </h1>

      <form onSubmit={submit} className="glass-card glass-sheen rounded-card p-5 space-y-3">
        <div className="text-[12px] text-ink-muted">
          Aktuelle Rückgabe:{" "}
          <span className="font-mono text-ink-soft">
            {new Date(currentReturnDate).toLocaleDateString("de-DE")}
          </span>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <div className="data-label mb-1">Neues Rückgabedatum</div>
            <input
              type="date"
              className="field"
              min={minDate}
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
            />
          </label>
          <label className="block">
            <div className="data-label mb-1">Uhrzeit</div>
            <input
              type="time"
              className="field"
              value={time}
              onChange={(e) => setTime(e.target.value)}
            />
          </label>
        </div>

        <div className="rounded-card bg-signal-soft border border-blue-200 px-4 py-3 flex items-center justify-between">
          <span className="text-[13px] text-signal-ink font-medium">
            +{days} {days === 1 ? "Tag" : "Tage"}
          </span>
          {estCost != null && (
            <span className="font-mono tnum text-[14px] font-bold text-signal-ink">
              ~ {fmtEur(estCost)}
            </span>
          )}
        </div>
        <p className="text-[11px] text-ink-muted">
          Geschätzte Mehrkosten. Die Verlängerung wird von der Vermietung bestätigt.
        </p>

        {error && (
          <div className="text-[13px] rounded-input px-3 py-2 bg-rose-50 border border-rose-200 text-rose-700">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={saving || days <= 0}
          className="w-full rounded-btn bg-signal text-white py-3 text-[14px] font-semibold inline-flex items-center justify-center gap-2 active:scale-[.99] disabled:opacity-60"
        >
          {saving ? <Loader2 size={15} className="animate-spin" /> : <CalendarPlus size={15} />}
          Verlängerung anfragen
        </button>
      </form>
    </div>
  );
};

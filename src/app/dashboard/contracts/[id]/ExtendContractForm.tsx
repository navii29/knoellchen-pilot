"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarPlus, Check, Loader2, X } from "lucide-react";
import { daysBetween } from "@/lib/km";
import { fmtEur } from "@/lib/utils";

// Operator-initiierte Verlängerung direkt im Dashboard (ein Klick: verlängern +
// Nachtrag). Ruft POST /api/contracts/[id]/extension mit action:"create".
// Die Kostenschätzung nutzt denselben effektiven Tagessatz wie die Seite; die
// verbindliche Berechnung passiert serverseitig.
export const ExtendContractForm = ({
  contractId,
  currentReturnDate,
  effectiveDailyRate,
}: {
  contractId: string;
  currentReturnDate: string | null;
  effectiveDailyRate: number | null;
}) => {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const extraDays =
    date && currentReturnDate ? daysBetween(currentReturnDate, date) : null;
  const validExtra = extraDays != null && Number.isFinite(extraDays) && extraDays > 0;
  const estCost =
    validExtra && effectiveDailyRate != null
      ? Math.round(extraDays * effectiveDailyRate * 100) / 100
      : null;

  const submit = async () => {
    setError(null);
    if (!validExtra) {
      setError("Bitte ein Datum nach dem aktuellen Rückgabedatum wählen.");
      return;
    }
    setBusy(true);
    const res = await fetch(`/api/contracts/${contractId}/extension`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "create",
        requested_return_date: date,
        requested_return_time: time || undefined,
      }),
    });
    setBusy(false);
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setError(j.error || "Verlängern fehlgeschlagen");
      return;
    }
    setOpen(false);
    setDate("");
    setTime("");
    router.refresh();
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 h-9 px-3.5 rounded-btn border border-hairline bg-paper text-ink text-[13px] font-medium hover:bg-canvas transition-colors"
      >
        <CalendarPlus size={14} /> Vertrag verlängern
      </button>
    );
  }

  return (
    <div className="panel px-4 py-3.5">
      <div className="flex items-center justify-between mb-3">
        <div className="font-display font-semibold text-ink text-[14px]">Vertrag verlängern</div>
        <button
          onClick={() => { setOpen(false); setError(null); }}
          aria-label="Schließen"
          className="w-7 h-7 inline-flex items-center justify-center rounded-btn text-ink-muted hover:bg-canvas"
        >
          <X size={14} />
        </button>
      </div>

      <div className="text-[12px] text-ink-muted mb-2">
        Aktuelles Rückgabedatum: <span className="font-mono tnum text-ink-soft">{currentReturnDate ?? "—"}</span>
      </div>

      <div className="grid sm:grid-cols-2 gap-3">
        <label className="block">
          <span className="data-label text-ink-muted">Neues Rückgabedatum *</span>
          <input
            type="date"
            value={date}
            min={currentReturnDate ?? undefined}
            onChange={(e) => setDate(e.target.value)}
            className="field font-mono tnum mt-1"
          />
        </label>
        <label className="block">
          <span className="data-label text-ink-muted">Uhrzeit (optional)</span>
          <input
            type="time"
            value={time}
            onChange={(e) => setTime(e.target.value)}
            className="field font-mono tnum mt-1"
          />
        </label>
      </div>

      {validExtra && (
        <div className="mt-3 text-[13px] text-ink-soft">
          <span className="text-ink-muted">Zusatztage:</span>{" "}
          <span className="font-mono tnum">{extraDays}</span>
          {estCost != null && (
            <>
              {" · "}
              <span className="text-ink-muted">geschätzte Zusatzkosten:</span>{" "}
              <span className="font-mono tnum">{fmtEur(estCost)}</span>
            </>
          )}
          {effectiveDailyRate == null && (
            <span className="text-ink-muted"> · kein Tagespreis hinterlegt</span>
          )}
        </div>
      )}

      {error && (
        <div className="mt-3 flex items-center gap-2 text-[13px] rounded-panel px-3 py-2 bg-red-50 border border-red-200 text-red-700">
          {error}
        </div>
      )}

      <div className="mt-4 flex items-center gap-2">
        <button
          onClick={submit}
          disabled={busy || !validExtra}
          className="inline-flex items-center gap-2 h-9 px-4 rounded-btn bg-signal text-white text-[13px] font-medium shadow-signal disabled:opacity-50"
        >
          {busy ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
          Verlängern & Nachtrag erzeugen
        </button>
        <button
          onClick={() => { setOpen(false); setError(null); }}
          disabled={busy}
          className="h-9 px-3 rounded-btn text-ink-muted text-[13px] hover:bg-canvas disabled:opacity-50"
        >
          Abbrechen
        </button>
      </div>
    </div>
  );
};

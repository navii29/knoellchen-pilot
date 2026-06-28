"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Pencil, X } from "lucide-react";
import { fmtEur } from "@/lib/utils";

// Inline-Bearbeitung NUR für den Tagespreis am bestehenden Vertrag. Nutzt die
// vorhandene, org-scoped PATCH-Route (daily_rate ist dort bereits erlaubt).
// Kein Owner-Gating — wie die übrigen Vertrags-Edits jeder Operator.
export const DailyRateRow = ({
  contractId,
  value,
}: {
  contractId: string;
  value: number | null;
}) => {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [input, setInput] = useState(value != null ? String(value) : "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const save = async () => {
    const trimmed = input.trim().replace(",", ".");
    // Leer → null (Preis löschen); sonst eine endliche, nicht-negative Zahl.
    let daily_rate: number | null = null;
    if (trimmed !== "") {
      const n = Number(trimmed);
      if (!Number.isFinite(n) || n < 0) {
        setError("Bitte eine gültige Zahl eingeben.");
        return;
      }
      daily_rate = n;
    }
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/contracts/${contractId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ daily_rate }),
    });
    setBusy(false);
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setError(j.error || "Speichern fehlgeschlagen");
      return;
    }
    setEditing(false);
    router.refresh();
  };

  return (
    <div className="grid grid-cols-[120px_1fr] gap-2 text-[13px]">
      <div className="text-ink-muted text-[12px]">Tagespreis</div>
      {editing ? (
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-1.5">
            <input
              autoFocus
              inputMode="decimal"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="z. B. 69"
              className="w-24 px-2 py-1 rounded-btn border border-hairline bg-canvas text-ink font-mono tnum text-[13px] outline-none focus:border-signal/40 focus:ring-2 focus:ring-signal/15"
            />
            <span className="text-ink-muted text-[12px]">€</span>
            <button
              onClick={save}
              disabled={busy}
              aria-label="Speichern"
              className="w-7 h-7 inline-flex items-center justify-center rounded-btn text-emerald-700 hover:bg-emerald-50 disabled:opacity-50"
            >
              <Check size={14} />
            </button>
            <button
              onClick={() => { setEditing(false); setInput(value != null ? String(value) : ""); setError(null); }}
              disabled={busy}
              aria-label="Abbrechen"
              className="w-7 h-7 inline-flex items-center justify-center rounded-btn text-ink-muted hover:bg-canvas disabled:opacity-50"
            >
              <X size={14} />
            </button>
          </div>
          {error && <span className="text-[12px] text-red-700">{error}</span>}
        </div>
      ) : (
        <div className="flex items-center gap-2 group">
          <span className="font-mono tnum text-ink">{fmtEur(value)}</span>
          <button
            onClick={() => setEditing(true)}
            aria-label="Tagespreis bearbeiten"
            className="w-6 h-6 inline-flex items-center justify-center rounded-btn text-ink-muted hover:text-ink hover:bg-canvas transition-colors"
          >
            <Pencil size={12} />
          </button>
        </div>
      )}
    </div>
  );
};

"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Coins, Loader2, Save } from "lucide-react";
import { THEME } from "@/lib/theme";
import { fmtEur } from "@/lib/utils";
import { computeCharge, VAT_RATE } from "@/lib/charge";
import type { Ticket } from "@/lib/types";

const fmtPercent = (n: number) => `${Math.round(n * 100)}%`;

export const ChargeEditor = ({ ticket }: { ticket: Ticket }) => {
  const router = useRouter();
  const [chargeFine, setChargeFine] = useState<boolean>(ticket.charge_fine ?? true);
  const [chargeFee, setChargeFee] = useState<boolean>(ticket.charge_fee ?? true);
  const [feeNetInput, setFeeNetInput] = useState<string>(
    ticket.fee_net != null ? String(ticket.fee_net) : "25"
  );
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const feeNet = Number(feeNetInput.replace(",", ".")) || 0;
  const fineAmount = Number(ticket.fine_amount ?? 0) || 0;

  const breakdown = useMemo(
    () =>
      computeCharge({
        fineAmount,
        chargeFine,
        feeNet,
        chargeFee,
      }),
    [fineAmount, chargeFine, feeNet, chargeFee]
  );

  const dirty =
    chargeFine !== (ticket.charge_fine ?? true) ||
    chargeFee !== (ticket.charge_fee ?? true) ||
    Math.abs(feeNet - Number(ticket.fee_net ?? 0)) > 0.001;

  const save = async () => {
    setSaving(true);
    setSaved(false);
    setError(null);
    const res = await fetch(`/api/tickets/${ticket.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        charge_fine: chargeFine,
        charge_fee: chargeFee,
        fee_net: feeNet,
      }),
    });
    setSaving(false);
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setError(j.error || "Speichern fehlgeschlagen");
      return;
    }
    setSaved(true);
    router.refresh();
  };

  return (
    <div className="rounded-xl ring-1 ring-stone-200 bg-white overflow-hidden">
      <div className="px-4 py-3 border-b border-stone-100 flex items-center gap-2">
        <Coins size={14} className="text-stone-400" />
        <div className="text-[11px] uppercase tracking-wider text-stone-500 font-semibold">
          Weiterbelastung an Mieter
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Bußgeld */}
        <label className="flex items-start gap-3 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={chargeFine}
            onChange={(e) => setChargeFine(e.target.checked)}
            className="mt-0.5 w-4 h-4 rounded accent-teal-600"
          />
          <div className="flex-1">
            <div className="flex items-center justify-between gap-3">
              <div className="text-sm font-medium text-stone-900">Bußgeld weiterbelasten</div>
              <div
                className={`tabular-nums text-sm ${chargeFine ? "text-stone-900" : "text-stone-300 line-through"}`}
              >
                {fmtEur(fineAmount)}
              </div>
            </div>
            <div className="text-xs text-stone-500 mt-0.5">
              Behördliches Bußgeld 1:1 weitergeben (durchlaufender Posten, keine USt).
            </div>
          </div>
        </label>

        <div className="border-t border-stone-100" />

        {/* Bearbeitungsgebühr */}
        <label className="flex items-start gap-3 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={chargeFee}
            onChange={(e) => setChargeFee(e.target.checked)}
            className="mt-0.5 w-4 h-4 rounded accent-teal-600"
          />
          <div className="flex-1">
            <div className="text-sm font-medium text-stone-900">Bearbeitungsgebühr berechnen</div>
            <div className="text-xs text-stone-500 mt-0.5">
              Eigene Aufwandspauschale für die Bearbeitung. Wird mit {fmtPercent(VAT_RATE)} MwSt
              versteuert.
            </div>
          </div>
        </label>

        {chargeFee && (
          <div className="ml-7 space-y-2">
            <div className="grid grid-cols-[1fr_140px] gap-3 items-center text-sm">
              <label className="text-stone-700">Bearbeitungsgebühr netto</label>
              <div className="relative">
                <input
                  value={feeNetInput}
                  onChange={(e) => setFeeNetInput(e.target.value)}
                  className="w-full px-3 py-1.5 text-right pr-7 rounded-md ring-1 ring-stone-200 outline-none focus:ring-stone-400 tabular-nums"
                />
                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-stone-400 text-xs">
                  €
                </span>
              </div>
            </div>
            <BreakdownRow label={`zzgl. ${fmtPercent(VAT_RATE)} MwSt`} value={breakdown.fee_vat} muted />
            <BreakdownRow label="Bearbeitungsgebühr brutto" value={breakdown.fee_gross} bold />
          </div>
        )}

        <div className="border-t border-stone-100" />

        {/* Total */}
        <div className="flex items-center justify-between text-base">
          <div className="font-semibold text-stone-900">Gesamtbetrag</div>
          <div className="tabular-nums font-display font-semibold text-xl" style={{ color: THEME.primary }}>
            {fmtEur(breakdown.total_charge)}
          </div>
        </div>

        {/* Erklärung wenn alles aus */}
        {!chargeFine && !chargeFee && (
          <div className="text-xs text-amber-700 bg-amber-50 ring-1 ring-amber-200 rounded-md px-3 py-2">
            Es wird nichts an den Mieter weiterbelastet — Anschreiben und Rechnung enthalten keine Beträge.
          </div>
        )}

        {error && (
          <div className="text-sm text-red-700 bg-red-50 ring-1 ring-red-200 rounded-md px-3 py-2">
            {error}
          </div>
        )}

        <div className="flex items-center justify-end gap-3 pt-1">
          {saved && !dirty && (
            <span className="inline-flex items-center gap-1 text-xs text-emerald-700">
              <CheckCircle2 size={13} /> Gespeichert
            </span>
          )}
          <button
            onClick={save}
            disabled={saving || !dirty}
            className="inline-flex items-center gap-1.5 text-white text-sm px-3.5 py-2 rounded-lg font-medium disabled:opacity-50"
            style={{ background: THEME.primary }}
          >
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            Übernehmen
          </button>
        </div>
      </div>
    </div>
  );
};

const BreakdownRow = ({
  label,
  value,
  muted,
  bold,
}: {
  label: string;
  value: number;
  muted?: boolean;
  bold?: boolean;
}) => (
  <div
    className={`grid grid-cols-[1fr_140px] gap-3 text-sm ${
      muted ? "text-stone-500" : "text-stone-800"
    }`}
  >
    <div className={bold ? "font-medium" : ""}>{label}</div>
    <div className={`text-right pr-7 tabular-nums ${bold ? "font-semibold" : ""}`}>
      {fmtEur(value)}
    </div>
  </div>
);

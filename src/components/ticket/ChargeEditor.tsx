"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Coins, Loader2, Save } from "lucide-react";
import { fmtEur } from "@/lib/utils";
import { computeCharge, VAT_RATE } from "@/lib/charge";
import type { Ticket } from "@/lib/types";
import { Panel, PanelHeader } from "@/components/ui/Panel";
import { Button } from "@/components/ui/Button";

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
    <Panel flush>
      <PanelHeader Icon={Coins} title="Weiterbelastung an Mieter" />

      <div className="p-4 space-y-4">
        {/* Bußgeld */}
        <label className="flex items-start gap-3 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={chargeFine}
            onChange={(e) => setChargeFine(e.target.checked)}
            className="mt-0.5 w-4 h-4 rounded"
          />
          <div className="flex-1">
            <div className="flex items-center justify-between gap-3">
              <div className="text-[13.5px] font-medium text-ink">Bußgeld weiterbelasten</div>
              <div
                className={`font-mono tnum text-[13.5px] ${chargeFine ? "text-ink" : "text-ink-muted line-through"}`}
              >
                {fmtEur(fineAmount)}
              </div>
            </div>
            <div className="text-[12px] text-ink-muted mt-0.5">
              Behördliches Bußgeld 1:1 weitergeben (durchlaufender Posten, keine USt).
            </div>
          </div>
        </label>

        <div className="border-t border-hairline" />

        {/* Bearbeitungsgebühr */}
        <label className="flex items-start gap-3 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={chargeFee}
            onChange={(e) => setChargeFee(e.target.checked)}
            className="mt-0.5 w-4 h-4 rounded"
          />
          <div className="flex-1">
            <div className="text-[13.5px] font-medium text-ink">Bearbeitungsgebühr berechnen</div>
            <div className="text-[12px] text-ink-muted mt-0.5">
              Eigene Aufwandspauschale für die Bearbeitung. Wird mit {fmtPercent(VAT_RATE)} MwSt
              versteuert.
            </div>
          </div>
        </label>

        {chargeFee && (
          <div className="ml-7 space-y-2">
            <div className="grid grid-cols-[1fr_140px] gap-3 items-center text-[13.5px]">
              <label className="text-ink-soft">Bearbeitungsgebühr netto</label>
              <div className="relative">
                <input
                  value={feeNetInput}
                  onChange={(e) => setFeeNetInput(e.target.value)}
                  className="field text-right pr-7 font-mono tnum"
                />
                <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-ink-muted text-[12px]">
                  €
                </span>
              </div>
            </div>
            <BreakdownRow label={`zzgl. ${fmtPercent(VAT_RATE)} MwSt`} value={breakdown.fee_vat} muted />
            <BreakdownRow label="Bearbeitungsgebühr brutto" value={breakdown.fee_gross} bold />
          </div>
        )}

        <div className="border-t border-hairline" />

        {/* Total */}
        <div className="flex items-center justify-between">
          <div className="text-[13.5px] font-semibold text-ink">Gesamtbetrag</div>
          <div className="font-display font-bold text-xl font-mono tnum text-signal">
            {fmtEur(breakdown.total_charge)}
          </div>
        </div>

        {!chargeFine && !chargeFee && (
          <div className="text-[12px] text-amber-700 bg-amber-50 border border-amber-200 rounded-card px-3 py-2">
            Es wird nichts an den Mieter weiterbelastet — Anschreiben und Rechnung enthalten keine Beträge.
          </div>
        )}

        {error && (
          <div className="text-[13px] text-red-700 bg-red-50 border border-red-200 rounded-card px-3 py-2">
            {error}
          </div>
        )}

        <div className="flex items-center justify-end gap-3 pt-1">
          {saved && !dirty && (
            <span className="inline-flex items-center gap-1 text-[12px] text-ink-soft">
              <CheckCircle2 size={13} /> Gespeichert
            </span>
          )}
          <Button
            onClick={save}
            disabled={saving || !dirty}
            variant="signal"
            size="sm"
          >
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            Übernehmen
          </Button>
        </div>
      </div>
    </Panel>
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
    className={`grid grid-cols-[1fr_140px] gap-3 text-[13px] ${
      muted ? "text-ink-muted" : "text-ink"
    }`}
  >
    <div className={bold ? "font-medium" : ""}>{label}</div>
    <div className={`text-right pr-7 font-mono tnum ${bold ? "font-semibold" : ""}`}>
      {fmtEur(value)}
    </div>
  </div>
);

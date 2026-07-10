"use client";

import { useEffect, useRef, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Download,
  Eraser,
  FileSignature,
  Gauge,
  Loader2,
  Mail,
} from "lucide-react";
import {
  SignatureCanvas,
  type SignatureCanvasHandle,
} from "@/components/ui/SignatureCanvas";
import type { HandoverPhotoType } from "@/lib/types";
import { FUEL_LEVELS } from "@/lib/fuel";
import type { ReturnSummary } from "@/lib/km";
import { fmtEur } from "@/lib/utils";

export type ProtocolPrefill = {
  km: number | null;
  fuel: string | null;
  condition: string | null;
};

// Eine Eingabemaske für genau einen Vorgang (Übergabe/Rückgabe). Erfasst
// km-Stand, Tankstand, Zustand + zwei Unterschriften und erzeugt das
// Übergabeprotokoll-PDF über die Protocol-Route.
export const ProtocolPanel = ({
  contractId,
  type,
  prefill,
  customerEmail,
}: {
  contractId: string;
  type: HandoverPhotoType;
  prefill: ProtocolPrefill;
  customerEmail: string | null;
}) => {
  const eventLabel = type === "pickup" ? "Übergabe" : "Rückgabe";

  const [km, setKm] = useState<string>(prefill.km != null ? String(prefill.km) : "");
  const [fuel, setFuel] = useState<string>(prefill.fuel ?? "");
  const [condition, setCondition] = useState<string>(prefill.condition ?? "");
  const [submitting, setSubmitting] = useState(false);
  const [emailing, setEmailing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [emailed, setEmailed] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  // Nur Rückgabe: Mieter nicht vor Ort → seine Unterschrift entfällt.
  const [renterAbsent, setRenterAbsent] = useState(false);

  const lessorRef = useRef<SignatureCanvasHandle>(null);
  const renterRef = useRef<SignatureCanvasHandle>(null);

  const docLabel = type === "pickup" ? "Übergabeprotokoll" : "Rückgabeprotokoll";

  // Rückgabe: tatsächliches Rückgabedatum + Mehrkosten-Vorschau (wie früher im
  // Schnell-Modal). Nur im Rücknahme-Tab relevant.
  const [returnDate, setReturnDate] = useState<string>(() => new Date().toISOString().slice(0, 10));
  const [summary, setSummary] = useState<ReturnSummary | null>(null);
  const [previewBusy, setPreviewBusy] = useState(false);

  useEffect(() => {
    if (type !== "return" || !returnDate || !km) {
      setSummary(null);
      return;
    }
    const t = setTimeout(async () => {
      setPreviewBusy(true);
      const res = await fetch(`/api/contracts/${contractId}/return-preview`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ actual_return_date: returnDate, km_return: km.replace(",", ".") }),
      });
      setPreviewBusy(false);
      if (!res.ok) {
        setSummary(null);
        return;
      }
      const j = (await res.json()) as { summary: ReturnSummary };
      setSummary(j.summary);
    }, 350);
    return () => clearTimeout(t);
  }, [type, returnDate, km, contractId]);

  const post = async (sendEmail: boolean) => {
    setError(null);
    const sigLessor = lessorRef.current?.toPNG() ?? null;
    const sigRenter = renterRef.current?.toPNG() ?? null;
    const absent = type === "return" && renterAbsent;
    if (!sigLessor) {
      setError("Bitte die Vermieter-Unterschrift setzen.");
      return false;
    }
    if (!absent && !sigRenter) {
      setError('Bitte die Mieter-Unterschrift setzen — oder „Mieter nicht vor Ort" markieren.');
      return false;
    }
    const res = await fetch(`/api/contracts/${contractId}/handover/protocol`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type,
        km,
        fuel_level: fuel,
        condition_notes: condition,
        signature_lessor: sigLessor,
        signature_renter: absent ? undefined : sigRenter,
        send_email: sendEmail,
        actual_return_date: type === "return" ? returnDate : undefined,
        renter_absent: absent,
      }),
    });
    const j = (await res.json().catch(() => ({}))) as {
      ok?: boolean;
      url?: string | null;
      emailed?: boolean;
      error?: string;
      alreadyClosed?: boolean;
    };
    if (!res.ok || !j.ok) {
      setError(j.error ?? "Erzeugen fehlgeschlagen.");
      return false;
    }
    if (j.url) setDownloadUrl(j.url);
    setEmailed(Boolean(j.emailed));
    // Nicht stillschweigend: war der Vertrag schon abgeschlossen (z. B. Self-
    // Check-out), wurden km/Tankstand/Rückgabedatum NICHT überschrieben.
    setNotice(
      j.alreadyClosed
        ? "Vertrag war bereits abgeschlossen — km, Tankstand und Rückgabedatum wurden nicht überschrieben. Das Protokoll wurde mit den gespeicherten Werten erstellt."
        : null
    );
    return true;
  };

  const create = async () => {
    setSubmitting(true);
    await post(false);
    setSubmitting(false);
  };

  const sendEmail = async () => {
    setEmailing(true);
    await post(true);
    setEmailing(false);
  };

  return (
    <div className="mt-8 panel p-4 sm:p-5">
      <div className="flex items-center gap-2 data-label text-ink-muted mb-4">
        <FileSignature size={13} />
        {docLabel} · {eventLabel}
      </div>

      {type === "return" && (
        <div className="mb-4">
          <label className="block text-[12px] font-medium text-ink-soft mb-1.5">
            Tatsächliches Rückgabedatum
          </label>
          <input
            type="date"
            value={returnDate}
            onChange={(e) => setReturnDate(e.target.value)}
            className="w-full h-9 px-3 rounded-input border border-hairline bg-canvas text-[14px] text-ink font-mono tnum focus:outline-none focus:ring-2 focus:ring-signal/30"
          />
        </div>
      )}

      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-[12px] font-medium text-ink-soft mb-1.5">
            km-Stand{type === "return" ? " *" : ""}
          </label>
          <div className="relative">
            <Gauge
              size={14}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted pointer-events-none"
            />
            <input
              type="number"
              inputMode="numeric"
              value={km}
              onChange={(e) => setKm(e.target.value)}
              placeholder="z. B. 45200"
              className="w-full h-9 pl-9 pr-3 rounded-input border border-hairline bg-canvas text-[14px] text-ink focus:outline-none focus:ring-2 focus:ring-signal/30"
            />
          </div>
        </div>

        <div>
          <label className="block text-[12px] font-medium text-ink-soft mb-1.5">
            Tankstand
          </label>
          <select
            value={fuel}
            onChange={(e) => setFuel(e.target.value)}
            className="w-full h-9 px-3 rounded-input border border-hairline bg-canvas text-[14px] text-ink focus:outline-none focus:ring-2 focus:ring-signal/30"
          >
            <option value="">– bitte wählen –</option>
            {FUEL_LEVELS.map((f) => (
              <option key={f.value} value={f.value}>
                {f.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="mt-4">
        <label className="block text-[12px] font-medium text-ink-soft mb-1.5">
          Zustand / Schäden
        </label>
        <textarea
          value={condition}
          onChange={(e) => setCondition(e.target.value)}
          rows={3}
          placeholder="Auffälligkeiten, Kratzer, Vorschäden …"
          className="w-full px-3 py-2 rounded-input border border-hairline bg-canvas text-[14px] text-ink focus:outline-none focus:ring-2 focus:ring-signal/30 resize-y"
        />
      </div>

      {type === "return" && (summary || previewBusy) && (
        <div className="mt-4 rounded-panel border border-hairline bg-canvas p-3 text-[13px]">
          <div className="data-label text-ink-muted mb-2">Mehrkosten-Vorschau</div>
          {previewBusy && !summary ? (
            <div className="text-ink-muted inline-flex items-center gap-1.5">
              <Loader2 size={12} className="animate-spin" /> Berechne…
            </div>
          ) : summary ? (
            <div className="space-y-1">
              <PreviewRow
                label="Miettage"
                value={`${summary.actualDays}${
                  summary.daysDiff !== 0
                    ? ` (${summary.daysDiff > 0 ? "+" : ""}${summary.daysDiff} ggü. geplant)`
                    : ""
                }`}
              />
              {summary.drivenKm != null && (
                <PreviewRow label="Gefahren" value={`${summary.drivenKm.toLocaleString("de-DE")} km`} />
              )}
              {summary.excessKm > 0 && (
                <PreviewRow
                  label="Mehrkilometer"
                  value={`${summary.excessKm.toLocaleString("de-DE")} km × ${summary.pricePerKm
                    .toFixed(2)
                    .replace(".", ",")} € = ${fmtEur(summary.cost)}`}
                />
              )}
              {summary.extraDays > 0 && (
                <PreviewRow
                  label="Zusatztage"
                  value={`${summary.extraDays} × ${summary.dailyRate
                    .toFixed(2)
                    .replace(".", ",")} € = ${fmtEur(summary.extraDaysCost)}`}
                />
              )}
              {(summary.excessKm > 0 || summary.extraDays > 0) && (
                <PreviewRow label="Mehrkosten gesamt" value={fmtEur(summary.totalExtraCost)} bold />
              )}
            </div>
          ) : null}
        </div>
      )}

      <div className="mt-5 grid sm:grid-cols-2 gap-4">
        <SignatureField label="Unterschrift Vermieter" canvasRef={lessorRef} />
        <div>
          {type === "return" && renterAbsent ? (
            <div>
              <div className="data-label text-ink-muted mb-1">Unterschrift Mieter</div>
              <div className="flex items-center justify-center h-[150px] rounded-panel border border-dashed border-hairline text-[13px] text-ink-muted">
                Mieter nicht vor Ort
              </div>
            </div>
          ) : (
            <SignatureField label="Unterschrift Mieter" canvasRef={renterRef} />
          )}
          {type === "return" && (
            <label className="mt-2 flex items-center gap-2 text-[13px] text-ink-soft cursor-pointer select-none">
              <input
                type="checkbox"
                checked={renterAbsent}
                onChange={(e) => setRenterAbsent(e.target.checked)}
                className="w-4 h-4 rounded border-hairline accent-signal"
              />
              Mieter nicht vor Ort (Unterschrift entfällt)
            </label>
          )}
        </div>
      </div>

      {error && (
        <div className="mt-4 flex items-center gap-2 text-[13px] rounded-panel px-3 py-2 bg-red-50 border border-red-200 text-red-700">
          <AlertTriangle size={14} /> {error}
        </div>
      )}

      {notice && (
        <div className="mt-4 flex items-start gap-2 text-[13px] rounded-panel px-3 py-2 bg-amber-50 border border-amber-200 text-amber-800">
          <AlertTriangle size={14} className="shrink-0 mt-0.5" /> {notice}
        </div>
      )}

      {downloadUrl && (
        <div className="mt-4 flex items-center gap-2 text-[13px] rounded-panel px-3 py-2 bg-emerald-50 border border-emerald-200 text-emerald-800">
          <CheckCircle2 size={14} />
          Protokoll erzeugt.
          {emailed && <span>· Per E-Mail versendet.</span>}
        </div>
      )}

      <div className="mt-5 flex items-center gap-3 flex-wrap">
        <button
          type="button"
          onClick={create}
          disabled={submitting || emailing || (type === "return" && !km)}
          className="inline-flex items-center justify-center gap-1.5 h-9 px-4 rounded-btn bg-signal text-white text-[13px] font-medium shadow-signal hover:bg-signal-strong disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          {submitting ? (
            <Loader2 size={14} className="animate-spin" />
          ) : (
            <FileSignature size={14} />
          )}
          {docLabel} erzeugen
        </button>

        {downloadUrl && (
          <a
            href={downloadUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 h-9 px-4 rounded-btn border border-hairline text-[13px] text-ink-soft hover:text-ink hover:bg-canvas transition-colors"
          >
            <Download size={14} /> Herunterladen
          </a>
        )}

        <button
          type="button"
          onClick={sendEmail}
          disabled={submitting || emailing || !customerEmail}
          title={
            customerEmail
              ? `An ${customerEmail} senden`
              : "Keine E-Mail-Adresse für den Kunden hinterlegt"
          }
          className="inline-flex items-center gap-1.5 h-9 px-4 rounded-btn border border-hairline text-[13px] text-ink-soft hover:text-ink hover:bg-canvas disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          {emailing ? (
            <Loader2 size={14} className="animate-spin" />
          ) : (
            <Mail size={14} />
          )}
          Per E-Mail an Kunden senden
        </button>
      </div>
    </div>
  );
};

const PreviewRow = ({ label, value, bold }: { label: string; value: string; bold?: boolean }) => (
  <div className="flex items-center justify-between gap-3">
    <span className="text-ink-muted">{label}</span>
    <span className={`font-mono tnum ${bold ? "font-semibold text-ink" : "text-ink-soft"}`}>
      {value}
    </span>
  </div>
);

const SignatureField = ({
  label,
  canvasRef,
}: {
  label: string;
  canvasRef: React.RefObject<SignatureCanvasHandle>;
}) => {
  const [hasInk, setHasInk] = useState(false);
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <label className="text-[12px] font-medium text-ink-soft">{label}</label>
        <button
          type="button"
          onClick={() => {
            canvasRef.current?.clear();
            setHasInk(false);
          }}
          disabled={!hasInk}
          className="inline-flex items-center gap-1 text-[11px] text-ink-muted hover:text-ink disabled:opacity-40 transition-colors"
        >
          <Eraser size={11} /> Löschen
        </button>
      </div>
      <div className="relative">
        <SignatureCanvas ref={canvasRef} height={150} onInkChange={setHasInk} />
        {!hasInk && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center text-[12px] text-ink-muted">
            Mit Finger oder Maus unterschreiben
          </div>
        )}
      </div>
    </div>
  );
};

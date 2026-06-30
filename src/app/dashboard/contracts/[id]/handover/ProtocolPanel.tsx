"use client";

import { useRef, useState } from "react";
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

  const lessorRef = useRef<SignatureCanvasHandle>(null);
  const renterRef = useRef<SignatureCanvasHandle>(null);

  const post = async (sendEmail: boolean) => {
    setError(null);
    const sigLessor = lessorRef.current?.toPNG() ?? null;
    const sigRenter = renterRef.current?.toPNG() ?? null;
    if (!sigLessor || !sigRenter) {
      setError("Bitte beide Felder unterschreiben (Vermieter und Mieter).");
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
        signature_renter: sigRenter,
        send_email: sendEmail,
      }),
    });
    const j = (await res.json().catch(() => ({}))) as {
      ok?: boolean;
      url?: string | null;
      emailed?: boolean;
      error?: string;
    };
    if (!res.ok || !j.ok) {
      setError(j.error ?? "Erzeugen fehlgeschlagen.");
      return false;
    }
    if (j.url) setDownloadUrl(j.url);
    setEmailed(Boolean(j.emailed));
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
        Übergabeprotokoll · {eventLabel}
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-[12px] font-medium text-ink-soft mb-1.5">
            km-Stand
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

      <div className="mt-5 grid sm:grid-cols-2 gap-4">
        <SignatureField label="Unterschrift Vermieter" canvasRef={lessorRef} />
        <SignatureField label="Unterschrift Mieter" canvasRef={renterRef} />
      </div>

      {error && (
        <div className="mt-4 flex items-center gap-2 text-[13px] rounded-panel px-3 py-2 bg-red-50 border border-red-200 text-red-700">
          <AlertTriangle size={14} /> {error}
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
          disabled={submitting || emailing}
          className="inline-flex items-center justify-center gap-1.5 h-9 px-4 rounded-btn bg-signal text-white text-[13px] font-medium shadow-signal hover:bg-signal-strong disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          {submitting ? (
            <Loader2 size={14} className="animate-spin" />
          ) : (
            <FileSignature size={14} />
          )}
          Übergabeprotokoll erzeugen
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

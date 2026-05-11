"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import SignaturePad from "signature_pad";
import {
  AlertTriangle,
  ArrowLeft,
  Check,
  Eraser,
  FileSignature,
  Loader2,
} from "lucide-react";

export const SignClient = ({
  contractId,
  contractNr,
  renterName,
  plate,
}: {
  contractId: string;
  contractNr: string;
  renterName: string;
  plate: string;
}) => {
  const router = useRouter();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const padRef = useRef<SignaturePad | null>(null);
  const [hasInk, setHasInk] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [accepted, setAccepted] = useState(false);

  // signature_pad Setup mit HiDPI-Resize
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const resize = () => {
      const ratio = Math.max(window.devicePixelRatio || 1, 1);
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * ratio;
      canvas.height = rect.height * ratio;
      const ctx = canvas.getContext("2d");
      if (ctx) ctx.scale(ratio, ratio);
      padRef.current?.clear();
      setHasInk(false);
    };

    const pad = new SignaturePad(canvas, {
      backgroundColor: "rgba(255,255,255,0)",
      penColor: "#0f172a",
      minWidth: 0.6,
      maxWidth: 2.4,
    });
    pad.addEventListener("endStroke", () => {
      setHasInk(!pad.isEmpty());
    });
    padRef.current = pad;

    resize();
    window.addEventListener("resize", resize);
    return () => {
      window.removeEventListener("resize", resize);
      pad.off();
      padRef.current = null;
    };
  }, []);

  const clear = () => {
    padRef.current?.clear();
    setHasInk(false);
  };

  const submit = async () => {
    if (!padRef.current || padRef.current.isEmpty()) {
      setError("Bitte zuerst unterschreiben.");
      return;
    }
    if (!accepted) {
      setError("Bitte die Bestätigung abhaken.");
      return;
    }
    setError(null);
    setSubmitting(true);

    // Trim, dann als PNG exportieren
    const pngBase64 = padRef.current.toDataURL("image/png");

    try {
      const res = await fetch(`/api/contracts/${contractId}/sign`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ signature_data: pngBase64 }),
      });
      const j = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        error?: string;
      };
      if (!res.ok || !j.ok) {
        setError(j.error ?? "Speichern fehlgeschlagen.");
        setSubmitting(false);
        return;
      }
      router.push(`/dashboard/contracts/${contractId}?signed=just`);
      router.refresh();
    } catch {
      setError("Netzwerkfehler. Bitte erneut versuchen.");
      setSubmitting(false);
    }
  };

  return (
    <div className="flex-1 overflow-auto scroll-thin bg-stone-50">
      <div className="max-w-4xl mx-auto px-4 md:px-8 py-6 md:py-10">
        <Link
          href={`/dashboard/contracts/${contractId}`}
          className="inline-flex items-center gap-1.5 text-sm text-stone-500 hover:text-stone-900 mb-3"
        >
          <ArrowLeft size={14} /> Zurück zum Vertrag
        </Link>

        <div className="flex items-start justify-between gap-4 flex-wrap mb-5">
          <div>
            <div className="text-[12px] uppercase tracking-[0.08em] font-semibold text-teal-700 mb-1">
              Mietvertrag unterschreiben
            </div>
            <h1 className="font-display text-stone-900 text-[28px] sm:text-[36px] leading-[1.1] tracking-[-0.02em] font-medium">
              {contractNr}
            </h1>
            <div className="mt-1 text-sm text-stone-500">
              <span className="font-medium text-stone-700">{renterName}</span>
              <span className="mx-2 text-stone-300">·</span>
              <span className="font-mono">{plate}</span>
            </div>
          </div>
        </div>

        {/* PDF-Vorschau */}
        <div className="rounded-xl bg-white ring-1 ring-stone-200 overflow-hidden mb-5">
          <div className="flex items-center justify-between px-4 py-3 border-b border-stone-100">
            <div className="text-[12px] uppercase tracking-wider text-stone-500 font-semibold">
              Vertragsvorschau
            </div>
            <a
              href={`/api/contracts/${contractId}/contract-pdf`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-teal-700 hover:underline"
            >
              In neuem Tab öffnen ↗
            </a>
          </div>
          <iframe
            title="Vertragsvorschau"
            src={`/api/contracts/${contractId}/contract-pdf#toolbar=0&navpanes=0`}
            className="w-full bg-stone-100"
            style={{ height: "70vh", border: 0 }}
          />
        </div>

        {/* Unterschriften-Canvas */}
        <div className="rounded-xl bg-white ring-1 ring-stone-200 p-4 sm:p-5 mb-5">
          <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
            <div className="flex items-center gap-2 text-[12px] uppercase tracking-wider text-stone-500 font-semibold">
              <FileSignature size={13} />
              Unterschrift Mieter
            </div>
            <button
              type="button"
              onClick={clear}
              disabled={!hasInk}
              className="inline-flex items-center gap-1 text-xs text-stone-500 hover:text-stone-900 disabled:opacity-40"
            >
              <Eraser size={12} /> Löschen
            </button>
          </div>

          <div
            className="relative rounded-lg ring-1 ring-stone-200 bg-stone-50 overflow-hidden"
            style={{ touchAction: "none" }}
          >
            <canvas
              ref={canvasRef}
              className="block w-full"
              style={{ height: "220px", display: "block" }}
            />
            {!hasInk && (
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center text-[13px] text-stone-400">
                Mit Finger oder Maus unterschreiben
              </div>
            )}
          </div>

          <p className="mt-2 text-[11px] text-stone-500">
            Tipp: Auf einem Tablet direkt mit dem Finger oder Stift unterschreiben.
          </p>
        </div>

        {/* Bestätigung */}
        <label className="rounded-xl bg-white ring-1 ring-stone-200 p-4 mb-5 flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={accepted}
            onChange={(e) => setAccepted(e.target.checked)}
            className="mt-0.5 w-4 h-4 accent-teal-600 shrink-0"
          />
          <span className="text-sm text-stone-700 leading-snug">
            Ich bestätige die Richtigkeit meiner Angaben und akzeptiere die in der
            Vorschau abgedruckten Mietbedingungen. Mir ist bekannt, dass diese
            digitale Unterschrift dieselbe Rechtswirkung hat wie eine
            handschriftliche.
          </span>
        </label>

        {error && (
          <div className="mb-4 flex items-center gap-2 text-sm rounded-lg px-3 py-2 bg-rose-50 ring-1 ring-rose-200 text-rose-700">
            <AlertTriangle size={14} /> {error}
          </div>
        )}

        <div className="sticky bottom-0 -mx-4 md:mx-0 px-4 md:px-0 py-4 md:py-0 bg-stone-50/90 backdrop-blur md:backdrop-blur-0 md:bg-transparent flex justify-end">
          <button
            type="button"
            onClick={submit}
            disabled={submitting || !hasInk || !accepted}
            className="inline-flex items-center justify-center gap-1.5 h-12 px-6 rounded-full bg-stone-900 text-white text-[14.5px] font-medium hover:bg-stone-800 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {submitting ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Check size={16} />
            )}
            Vertrag unterschreiben
          </button>
        </div>
      </div>
    </div>
  );
};

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

export const PortalSignClient = ({
  contractId,
  contractNr,
  plate,
  vehicleType,
}: {
  contractId: string;
  contractNr: string;
  plate: string;
  vehicleType: string | null;
}) => {
  const router = useRouter();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const padRef = useRef<SignaturePad | null>(null);
  const [hasInk, setHasInk] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [accepted, setAccepted] = useState(false);

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
    pad.addEventListener("endStroke", () => setHasInk(!pad.isEmpty()));
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
    const png = padRef.current.toDataURL("image/png");
    try {
      const res = await fetch(`/api/portal/contracts/${contractId}/sign`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ signature_data: png }),
      });
      const j = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string };
      if (!res.ok || !j.ok) {
        setError(j.error ?? "Speichern fehlgeschlagen");
        setSubmitting(false);
        return;
      }
      router.replace(`/portal/contracts/${contractId}`);
      router.refresh();
    } catch {
      setError("Netzwerkfehler");
      setSubmitting(false);
    }
  };

  return (
    <div className="px-5 py-3 space-y-4">
      <Link
        href={`/portal/contracts/${contractId}`}
        className="inline-flex items-center gap-1.5 text-[13px] text-stone-500 hover:text-stone-900"
      >
        <ArrowLeft size={13} /> Zurück zum Vertrag
      </Link>

      <div>
        <div className="text-[12px] uppercase tracking-[0.08em] font-semibold text-teal-700 mb-1">
          Unterschreiben
        </div>
        <h1 className="font-display text-[22px] tracking-tight font-medium text-stone-900">
          {contractNr}
        </h1>
        <div className="text-sm text-stone-500 mt-0.5">
          <span className="font-mono">{plate}</span>
          {vehicleType && <span className="ml-2">· {vehicleType}</span>}
        </div>
      </div>

      <div className="rounded-2xl bg-white ring-1 ring-stone-200 overflow-hidden">
        <div className="px-4 py-3 border-b border-stone-100 flex items-center justify-between">
          <div className="text-[11px] uppercase tracking-wider text-stone-500 font-semibold">
            Vertragsvorschau
          </div>
          <a
            href={`/api/portal/contracts/${contractId}/contract-pdf`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[12px] text-teal-700 hover:underline"
          >
            In neuem Tab öffnen ↗
          </a>
        </div>
        <iframe
          title="Vertrag"
          src={`/api/portal/contracts/${contractId}/contract-pdf#toolbar=0&navpanes=0`}
          style={{ height: "60vh", width: "100%", border: 0, background: "#f5f5f4" }}
        />
      </div>

      <div className="rounded-2xl bg-white ring-1 ring-stone-200 p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2 text-[11px] uppercase tracking-wider text-stone-500 font-semibold">
            <FileSignature size={12} />
            Deine Unterschrift
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
          className="relative rounded-xl ring-1 ring-stone-200 bg-stone-50 overflow-hidden"
          style={{ touchAction: "none" }}
        >
          <canvas
            ref={canvasRef}
            className="block w-full"
            style={{ height: 200, display: "block" }}
          />
          {!hasInk && (
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center text-[13px] text-stone-400">
              Mit Finger oder Stift unterschreiben
            </div>
          )}
        </div>
      </div>

      <label className="rounded-2xl bg-white ring-1 ring-stone-200 p-4 flex items-start gap-3 cursor-pointer">
        <input
          type="checkbox"
          checked={accepted}
          onChange={(e) => setAccepted(e.target.checked)}
          className="mt-0.5 w-4 h-4 accent-teal-600 shrink-0"
        />
        <span className="text-[13.5px] text-stone-700 leading-snug">
          Ich bestätige die Richtigkeit meiner Angaben und akzeptiere die im
          Vertrag abgedruckten Mietbedingungen. Mir ist bekannt, dass diese
          digitale Unterschrift dieselbe Rechtswirkung hat wie eine
          handschriftliche.
        </span>
      </label>

      {error && (
        <div className="flex items-center gap-2 text-sm rounded-lg px-3 py-2 bg-rose-50 ring-1 ring-rose-200 text-rose-700">
          <AlertTriangle size={14} /> {error}
        </div>
      )}

      <div className="sticky bottom-20 sm:bottom-4 z-30">
        <button
          type="button"
          onClick={submit}
          disabled={submitting || !hasInk || !accepted}
          className="w-full inline-flex items-center justify-center gap-1.5 h-12 rounded-full bg-stone-900 text-white text-[14.5px] font-medium hover:bg-stone-800 disabled:opacity-40"
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
  );
};

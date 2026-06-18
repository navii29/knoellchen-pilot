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
import { Button } from "@/components/ui/Button";
import { Plate } from "@/components/ui/Plate";

export const PortalSignClient = ({
  contractId,
  contractNr,
  plate,
  vehicleType,
  rentalTerms,
  specialTerms,
}: {
  contractId: string;
  contractNr: string;
  plate: string;
  vehicleType: string | null;
  rentalTerms: string;
  specialTerms: { id: string; title: string; text: string }[];
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
        className="inline-flex items-center gap-1.5 text-[13px] text-ink-muted hover:text-ink transition-colors"
      >
        <ArrowLeft size={13} /> Zurück zum Vertrag
      </Link>

      <div>
        <div className="kicker text-signal mb-1">Unterschreiben</div>
        <h1 className="font-display text-[22px] tracking-tightest font-bold text-ink">
          {contractNr}
        </h1>
        <div className="flex items-center gap-2 mt-0.5">
          <Plate value={plate} size="sm" />
          {vehicleType && <span className="text-[13px] text-ink-muted">· {vehicleType}</span>}
        </div>
      </div>

      <div className="bg-paper border border-hairline rounded-card overflow-hidden">
        <div className="px-4 py-3 border-b border-hairline flex items-center justify-between">
          <div className="kicker text-ink-muted">Vertragsvorschau</div>
          <a
            href={`/api/portal/contracts/${contractId}/contract-pdf`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[12px] text-signal hover:underline"
          >
            In neuem Tab öffnen ↗
          </a>
        </div>
        <iframe
          title="Vertrag"
          src={`/api/portal/contracts/${contractId}/contract-pdf#toolbar=0&navpanes=0`}
          style={{ height: "60vh", width: "100%", border: 0, background: "var(--canvas)" }}
        />
      </div>

      <div className="bg-paper border border-hairline rounded-card p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-1.5 kicker text-ink-muted">
            <FileSignature size={11} />
            Deine Unterschrift
          </div>
          <button
            type="button"
            onClick={clear}
            disabled={!hasInk}
            className="inline-flex items-center gap-1 text-[12px] text-ink-muted hover:text-ink transition-colors disabled:opacity-40"
          >
            <Eraser size={12} /> Löschen
          </button>
        </div>
        <div
          className="relative rounded-input border border-hairline bg-canvas overflow-hidden"
          style={{ touchAction: "none" }}
        >
          <canvas
            ref={canvasRef}
            className="block w-full"
            style={{ height: 200, display: "block" }}
          />
          {!hasInk && (
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center text-[13px] text-ink-muted">
              Mit Finger oder Stift unterschreiben
            </div>
          )}
        </div>
      </div>

      <div className="bg-paper border border-hairline rounded-card overflow-hidden">
        <details className="group">
          <summary className="px-4 py-3 cursor-pointer list-none flex items-center justify-between text-[14px] font-medium text-ink">
            <span>Allgemeine Mietbedingungen (AGB)</span>
            <span className="text-ink-muted group-open:rotate-90 transition-transform">›</span>
          </summary>
          <div className="px-4 pb-4 max-h-72 overflow-y-auto text-[12px] text-ink-soft whitespace-pre-line leading-relaxed border-t border-hairline pt-3">
            {rentalTerms}
          </div>
        </details>
        {specialTerms.map((t) => (
          <details key={t.id} className="group border-t border-hairline">
            <summary className="px-4 py-3 cursor-pointer list-none flex items-center justify-between text-[14px] font-medium text-ink">
              <span>{t.title}</span>
              <span className="text-ink-muted group-open:rotate-90 transition-transform">›</span>
            </summary>
            <div className="px-4 pb-4 text-[12px] text-ink-soft whitespace-pre-line leading-relaxed border-t border-hairline pt-3">
              {t.text}
            </div>
          </details>
        ))}
      </div>

      <label className="bg-paper border border-hairline rounded-card p-4 flex items-start gap-3 cursor-pointer">
        <input
          type="checkbox"
          checked={accepted}
          onChange={(e) => setAccepted(e.target.checked)}
          className="mt-0.5 w-4 h-4 accent-signal shrink-0"
        />
        <span className="text-[13px] text-ink-soft leading-snug">
          Ich bestätige die Richtigkeit meiner Angaben und akzeptiere die oben
          stehenden Allgemeinen Mietbedingungen
          {specialTerms.length > 0 ? " und Sondervereinbarungen" : ""}. Mir ist
          bekannt, dass diese digitale Unterschrift dieselbe Rechtswirkung hat
          wie eine handschriftliche.
        </span>
      </label>

      {error && (
        <div className="flex items-center gap-2 text-[13px] rounded-input px-3 py-2 bg-rose-50 border border-rose-200 text-rose-700">
          <AlertTriangle size={14} /> {error}
        </div>
      )}

      <div className="sticky bottom-20 sm:bottom-4 z-30">
        <Button
          type="button"
          variant="signal"
          size="lg"
          onClick={submit}
          disabled={submitting || !hasInk || !accepted}
          className="w-full"
        >
          {submitting ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <Check size={16} />
          )}
          Vertrag unterschreiben
        </Button>
      </div>
    </div>
  );
};

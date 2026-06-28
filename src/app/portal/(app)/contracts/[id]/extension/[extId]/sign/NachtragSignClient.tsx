"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import SignaturePad from "signature_pad";
import { AlertTriangle, ArrowLeft, Check, Eraser, FileSignature, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Plate } from "@/components/ui/Plate";
import { fmtDate } from "@/lib/utils";

// Mieter signiert seinen genehmigten Nachtrag. Vorlage: PortalSignClient, aber
// ohne AGB-/Sondervereinbarungs-Akkordeons (der Klauseltext steht im Nachtrag-
// PDF, das oben als Vorschau angezeigt wird).
export const NachtragSignClient = ({
  contractId,
  extId,
  contractNr,
  plate,
  vehicleType,
  newReturnDate,
}: {
  contractId: string;
  extId: string;
  contractNr: string;
  plate: string;
  vehicleType: string | null;
  newReturnDate: string;
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

    const pad = new SignaturePad(canvas, {
      backgroundColor: "rgba(255,255,255,0)",
      penColor: "#0f172a",
      minWidth: 0.6,
      maxWidth: 2.4,
    });
    pad.addEventListener("endStroke", () => setHasInk(!pad.isEmpty()));
    padRef.current = pad;

    // Mobile-Bug: Adressleiste blendet beim Zeichnen aus → resize mit geänderter
    // HÖHE. Nur bei geänderter BREITE neu skalieren + Unterschrift sichern.
    let lastWidth = -1;
    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const width = Math.round(rect.width);
      if (width === 0 || width === lastWidth) return;
      lastWidth = width;
      const ratio = Math.max(window.devicePixelRatio || 1, 1);
      const data = pad.toData();
      canvas.width = rect.width * ratio;
      canvas.height = rect.height * ratio;
      const ctx = canvas.getContext("2d");
      if (ctx) ctx.scale(ratio, ratio);
      pad.clear();
      if (data.length > 0) pad.fromData(data);
      setHasInk(!pad.isEmpty());
    };

    resize();
    window.addEventListener("resize", resize);
    window.addEventListener("orientationchange", resize);
    return () => {
      window.removeEventListener("resize", resize);
      window.removeEventListener("orientationchange", resize);
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
      const res = await fetch(`/api/portal/contracts/${contractId}/extension/${extId}/sign`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ signature_data: png }),
      });
      const j = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string };
      if (!res.ok || !j.ok) {
        setError(
          res.status === 409
            ? `${j.error ?? "Bereits unterschrieben."} Bitte die Seite neu laden.`
            : (j.error ?? "Speichern fehlgeschlagen")
        );
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
        <div className="kicker text-signal mb-1">Nachtrag unterschreiben</div>
        <h1 className="font-display text-[22px] tracking-tightest font-bold text-ink">{contractNr}</h1>
        <div className="flex items-center gap-2 mt-0.5">
          <Plate value={plate} size="sm" />
          {vehicleType && <span className="text-[13px] text-ink-muted">· {vehicleType}</span>}
        </div>
        {newReturnDate && (
          <div className="mt-1 text-[13px] text-ink-muted">
            Neues Rückgabedatum: {fmtDate(newReturnDate)}
          </div>
        )}
      </div>

      <div className="bg-paper border border-hairline rounded-card overflow-hidden">
        <div className="px-4 py-3 border-b border-hairline flex items-center justify-between">
          <div className="kicker text-ink-muted">Nachtrag-Vorschau</div>
          <a
            href={`/api/portal/contracts/${contractId}/extension/${extId}/addendum`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[12px] text-signal hover:underline"
          >
            In neuem Tab öffnen ↗
          </a>
        </div>
        <iframe
          title="Nachtrag"
          src={`/api/portal/contracts/${contractId}/extension/${extId}/addendum#toolbar=0&navpanes=0`}
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
          <canvas ref={canvasRef} className="block w-full" style={{ height: 200, display: "block" }} />
          {!hasInk && (
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center text-[13px] text-ink-muted">
              Mit Finger oder Stift unterschreiben
            </div>
          )}
        </div>
      </div>

      <label className="bg-paper border border-hairline rounded-card p-4 flex items-start gap-3 cursor-pointer">
        <input
          type="checkbox"
          checked={accepted}
          onChange={(e) => setAccepted(e.target.checked)}
          className="mt-0.5 w-4 h-4 accent-signal shrink-0"
        />
        <span className="text-[13px] text-ink-soft leading-snug">
          Ich bestätige die Verlängerung der Mietzeit gemäß dem oben angezeigten Nachtrag. Mir ist
          bekannt, dass diese digitale Unterschrift dieselbe Rechtswirkung hat wie eine
          handschriftliche.
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
          {submitting ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
          Nachtrag unterschreiben
        </Button>
      </div>
    </div>
  );
};

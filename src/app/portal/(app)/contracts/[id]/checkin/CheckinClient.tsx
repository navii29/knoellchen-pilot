"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import SignaturePad from "signature_pad";
import {
  AlertTriangle,
  ArrowLeft,
  Check,
  Eraser,
  FileSignature,
  Loader2,
  PartyPopper,
} from "lucide-react";
import { fmtDate, fmtEur } from "@/lib/utils";
import type { HandoverPosition } from "@/lib/types";
import { WizardProgress } from "@/components/portal/WizardProgress";
import { PhotoGrid } from "@/components/portal/PhotoGrid";
import { DocScanStep } from "@/components/portal/DocScanStep";

const STEP_LABELS = [
  "Führerschein",
  "Ausweis",
  "Fahrzeug-Fotos",
  "Unterschrift",
  "Fertig",
];
const TOTAL = STEP_LABELS.length;

export const CheckinClient = ({
  contractId,
  contractNr,
  vehicleType,
  plate,
  pickupDate,
  returnDate,
  dailyRate,
  totalAmount,
  deposit,
  initialStep,
  alreadySigned,
  uploadedPositions,
}: {
  contractId: string;
  contractNr: string;
  vehicleType: string | null;
  plate: string;
  pickupDate: string;
  returnDate: string;
  dailyRate: number | null;
  totalAmount: number | null;
  deposit: number | null;
  initialStep: number;
  alreadySigned: boolean;
  uploadedPositions: HandoverPosition[];
}) => {
  const router = useRouter();
  const start = Math.min(Math.max(initialStep, 1), TOTAL);
  const [step, setStep] = useState<number>(alreadySigned ? TOTAL : start);
  const [photoCount, setPhotoCount] = useState<number>(uploadedPositions.length);

  const persistStep = useCallback(
    async (next: number) => {
      try {
        await fetch(`/api/portal/contracts/${contractId}/checkin/step`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ step: next }),
        });
      } catch {
        // soft-fail
      }
    },
    [contractId]
  );

  const goNext = useCallback(async () => {
    const next = Math.min(step + 1, TOTAL);
    setStep(next);
    if (next !== step) await persistStep(next);
  }, [step, persistStep]);

  const goBack = useCallback(() => {
    setStep((s) => Math.max(1, s - 1));
  }, []);

  return (
    <div>
      <div className="px-5 pt-3">
        <Link
          href={`/portal/contracts/${contractId}`}
          className="inline-flex items-center gap-1.5 text-[13px] text-stone-500 hover:text-stone-900"
        >
          <ArrowLeft size={13} /> Zum Vertrag
        </Link>
      </div>

      <WizardProgress current={Math.min(step, TOTAL)} total={TOTAL} labels={STEP_LABELS} />

      <div className="px-5 py-4 space-y-4">
        {step === 1 && <Step1License onDone={goNext} contractId={contractId} />}
        {step === 2 && (
          <Step2IdCard onDone={goNext} onBack={goBack} contractId={contractId} />
        )}
        {step === 3 && (
          <Step3Photos
            onDone={goNext}
            onBack={goBack}
            contractId={contractId}
            uploadedPositions={uploadedPositions}
            initialCount={photoCount}
            onCountChange={setPhotoCount}
          />
        )}
        {step === 4 && (
          <Step4Sign
            onDone={goNext}
            onBack={goBack}
            contractId={contractId}
            contractNr={contractNr}
            vehicleType={vehicleType}
            plate={plate}
            pickupDate={pickupDate}
            returnDate={returnDate}
            dailyRate={dailyRate}
            totalAmount={totalAmount}
            deposit={deposit}
            alreadySigned={alreadySigned}
          />
        )}
        {step === 5 && (
          <StepDone onFinish={() => router.push(`/portal/contracts/${contractId}`)} />
        )}
      </div>
    </div>
  );
};

// =====================================================
// Step 1 — Führerschein
// =====================================================
const Step1License = ({
  contractId,
  onDone,
}: {
  contractId: string;
  onDone: () => void;
}) => (
  <StepCard
    title="Führerschein fotografieren"
    subtitle="Bitte den Führerschein flach hinlegen, gut ausgeleuchtet, in einem Bild."
  >
    <DocScanStep
      uploadUrl={`/api/portal/contracts/${contractId}/checkin/license`}
      ctaLabel="Foto aufnehmen"
      exampleHint="Tipp: Beide langen Seiten vollständig im Bild, kein Reflex auf dem Hologramm."
      parseFields={[
        {
          label: "Name",
          keys: ["first_name", "last_name"],
          join: " ",
        },
        { label: "Geburtsdatum", keys: ["birthday"] },
        { label: "Führerschein-Nr.", keys: ["license_nr"] },
        { label: "Klassen", keys: ["license_class"] },
        { label: "Gültig bis", keys: ["license_expiry"] },
      ]}
      onSuccess={() => onDone()}
    />
  </StepCard>
);

// =====================================================
// Step 2 — Personalausweis
// =====================================================
const Step2IdCard = ({
  contractId,
  onDone,
  onBack,
}: {
  contractId: string;
  onDone: () => void;
  onBack: () => void;
}) => (
  <StepCard
    title="Personalausweis fotografieren"
    subtitle="Vorderseite mit Foto und Adresse. Reisepass funktioniert auch."
    onBack={onBack}
  >
    <DocScanStep
      uploadUrl={`/api/portal/contracts/${contractId}/checkin/id-card`}
      ctaLabel="Foto aufnehmen"
      exampleHint="Tipp: Personalausweis Vorderseite genügt — die Adresse steht dort."
      parseFields={[
        { label: "Ausweis-Nr.", keys: ["id_card_nr"] },
        { label: "Straße", keys: ["street", "house_nr"], join: " " },
        { label: "PLZ + Ort", keys: ["zip", "city"], join: " " },
      ]}
      onSuccess={() => onDone()}
    />
  </StepCard>
);

// =====================================================
// Step 3 — Übergabe-Fotos
// =====================================================
const Step3Photos = ({
  contractId,
  uploadedPositions,
  onDone,
  onBack,
  initialCount,
  onCountChange,
}: {
  contractId: string;
  uploadedPositions: HandoverPosition[];
  initialCount: number;
  onDone: () => void;
  onBack: () => void;
  onCountChange: (n: number) => void;
}) => {
  const [count, setCount] = useState(initialCount);
  const [skipping, setSkipping] = useState(false);

  const sufficient = count >= 4;

  return (
    <StepCard
      title="Fahrzeug fotografieren"
      subtitle="Mindestens 4 Fotos sind nötig — alle 10 Positionen werden empfohlen."
      onBack={onBack}
    >
      <div className="rounded-2xl bg-amber-50 ring-1 ring-amber-200 px-4 py-2.5 text-[12.5px] text-amber-900 mb-3">
        Diese Fotos schützen dich bei Streit über Schäden — bitte gründlich.
      </div>
      <PhotoGrid
        contractId={contractId}
        uploadUrl={`/api/portal/contracts/${contractId}/checkin/photos`}
        initialUploaded={uploadedPositions}
        onChange={(n) => {
          setCount(n);
          onCountChange(n);
        }}
      />

      <div className="mt-5 flex items-center justify-between gap-3">
        <div className="text-[12.5px] text-stone-600">
          {count}/10 Fotos hochgeladen
        </div>
        <div className="flex items-center gap-2">
          {!sufficient && (
            <button
              type="button"
              onClick={() => {
                if (
                  confirm(
                    "Ohne ausreichend Fotos kannst du Schäden später schwerer dokumentieren. Trotzdem fortfahren?"
                  )
                ) {
                  setSkipping(true);
                  onDone();
                }
              }}
              className="text-[13px] text-stone-500 hover:text-stone-900"
            >
              Später
            </button>
          )}
          <button
            type="button"
            onClick={onDone}
            disabled={!sufficient || skipping}
            className="inline-flex items-center justify-center gap-1.5 h-11 px-5 rounded-full bg-stone-900 text-white text-[14px] font-medium hover:bg-stone-800 disabled:opacity-40"
          >
            <Check size={14} /> Weiter
          </button>
        </div>
      </div>
    </StepCard>
  );
};

// =====================================================
// Step 4 — Unterschrift
// =====================================================
const Step4Sign = ({
  contractId,
  contractNr,
  vehicleType,
  plate,
  pickupDate,
  returnDate,
  dailyRate,
  totalAmount,
  deposit,
  alreadySigned,
  onDone,
  onBack,
}: {
  contractId: string;
  contractNr: string;
  vehicleType: string | null;
  plate: string;
  pickupDate: string;
  returnDate: string;
  dailyRate: number | null;
  totalAmount: number | null;
  deposit: number | null;
  alreadySigned: boolean;
  onDone: () => void;
  onBack: () => void;
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const padRef = useRef<SignaturePad | null>(null);
  const [hasInk, setHasInk] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (alreadySigned) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const resize = () => {
      const ratio = Math.max(window.devicePixelRatio || 1, 1);
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * ratio;
      canvas.height = rect.height * ratio;
      const cctx = canvas.getContext("2d");
      if (cctx) cctx.scale(ratio, ratio);
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
  }, [alreadySigned]);

  const submit = async () => {
    if (alreadySigned) {
      onDone();
      return;
    }
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
      onDone();
    } catch {
      setError("Netzwerkfehler");
      setSubmitting(false);
    }
  };

  return (
    <StepCard
      title="Vertrag unterschreiben"
      subtitle="Bitte prüfe die Daten und unterschreibe digital."
      onBack={onBack}
    >
      <div className="rounded-2xl bg-white ring-1 ring-stone-200 p-4 mb-4 space-y-1.5">
        <SummaryRow label="Vertrag" value={contractNr} mono />
        <SummaryRow label="Fahrzeug" value={`${plate} · ${vehicleType ?? "—"}`} />
        <SummaryRow
          label="Mietzeitraum"
          value={`${fmtDate(pickupDate)} → ${fmtDate(returnDate)}`}
        />
        {dailyRate != null && (
          <SummaryRow label="Tagespreis" value={fmtEur(dailyRate)} mono />
        )}
        {totalAmount != null && (
          <SummaryRow label="Gesamt" value={fmtEur(totalAmount)} mono />
        )}
        {deposit != null && deposit > 0 && (
          <SummaryRow label="Kaution" value={fmtEur(deposit)} mono />
        )}
      </div>

      {alreadySigned ? (
        <div className="rounded-2xl bg-emerald-50 ring-1 ring-emerald-200 px-4 py-3 text-[13.5px] text-emerald-800 flex items-center gap-2 mb-4">
          <Check size={14} /> Bereits unterschrieben — du kannst direkt zum Abschluss.
        </div>
      ) : (
        <>
          <div className="rounded-2xl bg-white ring-1 ring-stone-200 p-4 mb-3">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2 text-[11px] uppercase tracking-wider text-stone-500 font-semibold">
                <FileSignature size={12} /> Deine Unterschrift
              </div>
              <button
                type="button"
                onClick={() => {
                  padRef.current?.clear();
                  setHasInk(false);
                }}
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
                style={{ height: 180, display: "block" }}
              />
              {!hasInk && (
                <div className="pointer-events-none absolute inset-0 flex items-center justify-center text-[13px] text-stone-400">
                  Mit Finger oder Stift unterschreiben
                </div>
              )}
            </div>
          </div>

          <label className="rounded-2xl bg-white ring-1 ring-stone-200 p-4 mb-3 flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={accepted}
              onChange={(e) => setAccepted(e.target.checked)}
              className="mt-0.5 w-4 h-4 accent-teal-600 shrink-0"
            />
            <span className="text-[13.5px] text-stone-700 leading-snug">
              Ich bestätige die Richtigkeit meiner Angaben und akzeptiere die
              Mietbedingungen. Mir ist bekannt, dass diese digitale
              Unterschrift dieselbe Rechtswirkung hat wie eine
              handschriftliche.
            </span>
          </label>
        </>
      )}

      {error && (
        <div className="flex items-center gap-2 text-sm rounded-lg px-3 py-2 bg-rose-50 ring-1 ring-rose-200 text-rose-700 mb-3">
          <AlertTriangle size={14} /> {error}
        </div>
      )}

      <button
        type="button"
        onClick={submit}
        disabled={
          submitting || (!alreadySigned && (!hasInk || !accepted))
        }
        className="w-full inline-flex items-center justify-center gap-1.5 h-12 rounded-full bg-stone-900 text-white text-[14.5px] font-medium hover:bg-stone-800 disabled:opacity-40"
      >
        {submitting ? (
          <Loader2 size={16} className="animate-spin" />
        ) : (
          <Check size={16} />
        )}
        {alreadySigned ? "Weiter" : "Unterschreiben & weiter"}
      </button>
    </StepCard>
  );
};

// =====================================================
// Step 5 — Fertig
// =====================================================
const StepDone = ({ onFinish }: { onFinish: () => void }) => (
  <div className="rounded-2xl bg-white ring-1 ring-stone-200 p-7 text-center">
    <div className="inline-flex w-14 h-14 rounded-full bg-emerald-50 ring-1 ring-emerald-200 items-center justify-center text-emerald-700 mb-3">
      <PartyPopper size={26} />
    </div>
    <h2 className="font-display text-stone-900 text-[24px] tracking-tight font-medium">
      Check-in abgeschlossen
    </h2>
    <p className="text-[14px] text-stone-600 mt-2 leading-relaxed">
      Alle Daten sind erfasst. Bitte hole deinen Schlüssel am Schalter ab — die
      Kollegen wissen Bescheid und brauchen keine weiteren Unterlagen mehr.
    </p>
    <button
      type="button"
      onClick={onFinish}
      className="mt-5 inline-flex items-center justify-center h-12 px-6 rounded-full bg-stone-900 text-white text-[14.5px] font-medium hover:bg-stone-800"
    >
      Zurück zum Vertrag
    </button>
  </div>
);

// =====================================================
// Helpers
// =====================================================
const StepCard = ({
  title,
  subtitle,
  children,
  onBack,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  onBack?: () => void;
}) => (
  <div className="rounded-2xl bg-white ring-1 ring-stone-200 p-5 sm:p-6">
    <div className="mb-4">
      <h2 className="font-display text-stone-900 text-[22px] sm:text-[24px] tracking-tight font-medium leading-tight">
        {title}
      </h2>
      {subtitle && (
        <p className="text-[13.5px] text-stone-500 mt-1.5 leading-snug">{subtitle}</p>
      )}
    </div>
    {children}
    {onBack && (
      <div className="mt-4">
        <button
          type="button"
          onClick={onBack}
          className="text-[13px] text-stone-500 hover:text-stone-900"
        >
          ← Vorheriger Schritt
        </button>
      </div>
    )}
  </div>
);

const SummaryRow = ({
  label,
  value,
  mono,
}: {
  label: string;
  value: React.ReactNode;
  mono?: boolean;
}) => (
  <div className="grid grid-cols-[110px_1fr] gap-2 text-[13.5px]">
    <div className="text-stone-500">{label}</div>
    <div className={mono ? "tabular-nums text-stone-900" : "text-stone-900"}>{value}</div>
  </div>
);

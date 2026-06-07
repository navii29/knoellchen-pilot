"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  Check,
  Fuel,
  Gauge,
  Loader2,
  PartyPopper,
} from "lucide-react";
import type { HandoverPosition } from "@/lib/types";
import { WizardProgress } from "@/components/portal/WizardProgress";
import { PhotoGrid } from "@/components/portal/PhotoGrid";
import { Button } from "@/components/ui/Button";

const STEP_LABELS = ["Fotos", "Kilometer", "Tankstand", "Fertig"];
const TOTAL = STEP_LABELS.length;

const FUEL_OPTIONS = [
  { value: "full", label: "Voll" },
  { value: "three_quarter", label: "3/4" },
  { value: "half", label: "1/2" },
  { value: "quarter", label: "1/4" },
  { value: "empty", label: "Leer" },
] as const;

const FUEL_LABEL: Record<string, string> = {
  full: "Voll",
  three_quarter: "3/4",
  half: "1/2",
  quarter: "1/4",
  empty: "Leer",
};

export const CheckoutClient = ({
  contractId,
  contractNr,
  plate,
  vehicleType,
  kmPickup,
  kmLimit,
  fuelLevelPickup,
  initialStep,
  uploadedPositions,
}: {
  contractId: string;
  contractNr: string;
  plate: string;
  vehicleType: string | null;
  kmPickup: number | null;
  kmLimit: number | null;
  fuelLevelPickup: string | null;
  initialStep: number;
  uploadedPositions: HandoverPosition[];
}) => {
  const router = useRouter();
  const [step, setStep] = useState<number>(Math.min(Math.max(initialStep, 1), TOTAL));
  const [photoCount, setPhotoCount] = useState<number>(uploadedPositions.length);
  const [kmReturn, setKmReturn] = useState<string>("");
  const [fuel, setFuel] = useState<string>("full");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const persistStep = useCallback(
    async (next: number) => {
      try {
        await fetch(`/api/portal/contracts/${contractId}/checkout/step`, {
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

  const goBack = useCallback(() => setStep((s) => Math.max(1, s - 1)), []);

  const submitCheckout = async () => {
    setError(null);
    setSubmitting(true);
    try {
      const km = Number(kmReturn.replace(",", "."));
      if (!Number.isFinite(km) || km < 0) {
        setError("Kilometerstand ungültig");
        setSubmitting(false);
        return;
      }
      const res = await fetch(
        `/api/portal/contracts/${contractId}/checkout/complete`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ km_return: Math.round(km), fuel_level_return: fuel }),
        }
      );
      const j = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string };
      if (!res.ok || !j.ok) {
        setError(j.error ?? "Speichern fehlgeschlagen");
        setSubmitting(false);
        return;
      }
      setStep(TOTAL);
    } catch {
      setError("Netzwerkfehler");
      setSubmitting(false);
    }
  };

  const km = Number(kmReturn.replace(",", "."));
  const km_pickup = Number(kmPickup ?? 0);
  const driven = Number.isFinite(km) ? Math.max(0, km - km_pickup) : 0;
  const allowed = kmLimit ?? null;
  const excess = allowed != null ? Math.max(0, driven - allowed) : 0;

  return (
    <div>
      <div className="px-5 pt-3">
        <Link
          href={`/portal/contracts/${contractId}`}
          className="inline-flex items-center gap-1.5 text-[13px] text-ink-muted hover:text-ink transition-colors"
        >
          <ArrowLeft size={13} /> Zum Vertrag
        </Link>
      </div>

      <WizardProgress current={step} total={TOTAL} labels={STEP_LABELS} />

      <div className="px-5 py-4 space-y-4">
        <div className="text-[12px] text-ink-muted font-mono">
          <span>{plate}</span>
          {vehicleType && <span className="ml-2">· {vehicleType}</span>}
          <span className="ml-2 opacity-70">· {contractNr}</span>
        </div>

        {step === 1 && (
          <StepCard
            title="Rückgabe-Fotos"
            subtitle="Mindestens 4 Fotos — alle 10 empfohlen für vollständige Dokumentation."
          >
            <div className="bg-amber-50 border border-amber-200 rounded-panel px-4 py-2.5 text-[12.5px] text-amber-900 mb-3">
              Bitte gleiche Positionen wie beim Check-in fotografieren.
            </div>
            <PhotoGrid
              contractId={contractId}
              uploadUrl={`/api/portal/contracts/${contractId}/checkout/photos`}
              initialUploaded={uploadedPositions}
              onChange={setPhotoCount}
            />
            <div className="mt-5 flex items-center justify-between gap-3">
              <div className="text-[12px] text-ink-muted font-mono tnum">
                {photoCount}/10 Fotos hochgeladen
              </div>
              <Button type="button" variant="signal" size="md" onClick={goNext} disabled={photoCount < 4}>
                <Check size={14} /> Weiter
              </Button>
            </div>
          </StepCard>
        )}

        {step === 2 && (
          <StepCard
            title="Kilometerstand eingeben"
            subtitle="Schau auf den Tacho und gib den aktuellen Stand ein."
            onBack={goBack}
          >
            <div className="bg-canvas border border-hairline rounded-panel px-4 py-3 mb-4 flex items-center gap-3">
              <Gauge size={16} className="text-ink-muted" />
              <div className="text-[13px] text-ink-soft">
                Stand bei Übergabe:{" "}
                <span className="font-mono font-semibold tnum text-ink">
                  {kmPickup != null
                    ? kmPickup.toLocaleString("de-DE")
                    : "—"}{" "}
                  km
                </span>
              </div>
            </div>

            <label className="block">
              <div className="data-label mb-1.5">Aktueller Kilometerstand</div>
              <div className="relative">
                <input
                  type="number"
                  inputMode="numeric"
                  className="w-full h-14 px-4 rounded-input border border-hairline bg-paper text-[22px] text-ink text-center font-mono font-semibold tnum focus:outline-none focus:ring-2 focus:ring-signal/30 transition-shadow"
                  value={kmReturn}
                  onChange={(e) => setKmReturn(e.target.value)}
                  placeholder={kmPickup ? String(kmPickup) : "0"}
                  autoFocus
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[13px] text-ink-muted font-medium">
                  km
                </span>
              </div>
            </label>

            {Number.isFinite(km) && km > 0 && (
              <div className="mt-4 bg-paper border border-hairline rounded-card p-4 space-y-1.5">
                <SummaryRow
                  label="Gefahren"
                  value={`${driven.toLocaleString("de-DE")} km`}
                  mono
                />
                {allowed != null && (
                  <>
                    <SummaryRow
                      label="Erlaubt"
                      value={`${allowed.toLocaleString("de-DE")} km`}
                      mono
                    />
                    <SummaryRow
                      label="Mehrkilometer"
                      value={
                        <span
                          className={
                            excess > 0
                              ? "text-rose-700 font-semibold"
                              : "text-ink-soft font-semibold"
                          }
                        >
                          {excess > 0
                            ? `+${excess.toLocaleString("de-DE")} km`
                            : "Im Limit"}
                        </span>
                      }
                      mono
                    />
                  </>
                )}
              </div>
            )}

            <div className="mt-5 flex items-center justify-end gap-3">
              <Button
                type="button"
                variant="signal"
                size="md"
                onClick={goNext}
                disabled={!Number.isFinite(km) || km <= 0}
              >
                <Check size={14} /> Weiter
              </Button>
            </div>
          </StepCard>
        )}

        {step === 3 && (
          <StepCard
            title="Tankstand"
            subtitle={
              fuelLevelPickup
                ? `Bei Übergabe: ${FUEL_LABEL[fuelLevelPickup] ?? fuelLevelPickup}. Bitte mit dem gleichen Stand zurückgeben.`
                : "Bitte aktuellen Tankstand auswählen."
            }
            onBack={goBack}
          >
            <div className="bg-canvas border border-hairline rounded-panel px-4 py-3 mb-4 flex items-center gap-3">
              <Fuel size={16} className="text-ink-muted" />
              <div className="text-[13px] text-ink-soft">
                Aktuellen Tankstand wählen:
              </div>
            </div>
            <div className="grid grid-cols-5 gap-2">
              {FUEL_OPTIONS.map((opt) => {
                const active = fuel === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setFuel(opt.value)}
                    className={`h-12 rounded-input text-[14px] font-medium transition-colors ${
                      active
                        ? "bg-signal text-white shadow-signal"
                        : "bg-paper text-ink-soft border border-hairline hover:border-ink/20"
                    }`}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
            <div className="mt-5 flex items-center justify-end gap-3">
              <Button type="button" variant="signal" size="md" onClick={goNext}>
                <Check size={14} /> Weiter
              </Button>
            </div>
          </StepCard>
        )}

        {step === 4 && (
          <StepCard
            title="Rückgabe abschließen"
            subtitle="Letzte Prüfung vor dem Absenden."
            onBack={goBack}
          >
            <div className="bg-paper border border-hairline rounded-card p-4 space-y-1.5">
              <SummaryRow
                label="Fotos"
                value={`${photoCount}/10 hochgeladen`}
                mono
              />
              <SummaryRow
                label="Kilometerstand"
                value={`${(Number.isFinite(km) ? km : 0).toLocaleString("de-DE")} km`}
                mono
              />
              <SummaryRow label="Tankstand" value={FUEL_LABEL[fuel] ?? fuel} />
              {allowed != null && excess > 0 && (
                <SummaryRow
                  label="Mehrkilometer"
                  value={
                    <span className="text-rose-700 font-semibold">
                      +{excess.toLocaleString("de-DE")} km
                    </span>
                  }
                />
              )}
            </div>

            {error && (
              <div className="mt-3 flex items-center gap-2 text-[13px] rounded-input px-3 py-2 bg-rose-50 border border-rose-200 text-rose-700">
                <AlertTriangle size={14} /> {error}
              </div>
            )}

            <Button
              type="button"
              variant="signal"
              size="lg"
              onClick={submitCheckout}
              disabled={submitting}
              className="mt-5 w-full"
            >
              {submitting ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <Check size={16} />
              )}
              Rückgabe abschließen
            </Button>
          </StepCard>
        )}

        {step === TOTAL && !submitting && error == null && (
          <div className="bg-paper border border-hairline rounded-card shadow-panel p-7 text-center">
            <div className="inline-flex w-14 h-14 rounded-full bg-canvas border border-hairline items-center justify-center text-ink-soft mb-3">
              <PartyPopper size={26} />
            </div>
            <h2 className="font-display text-ink text-[24px] tracking-tightest font-bold">
              Vielen Dank!
            </h2>
            <p className="text-[13px] text-ink-muted mt-2 leading-relaxed">
              Deine Rückgabe wurde erfasst. Die KI prüft im Hintergrund, ob es
              neue Schäden gibt — bei Auffälligkeiten meldet sich die Vermietung.
            </p>
            <Button
              type="button"
              variant="signal"
              size="lg"
              onClick={() => router.push(`/portal/contracts/${contractId}`)}
              className="mt-5"
            >
              Zurück zum Vertrag
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

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
  <div className="bg-paper border border-hairline rounded-card shadow-panel p-5 sm:p-6">
    <div className="mb-4">
      <h2 className="font-display text-ink text-[22px] sm:text-[24px] tracking-tightest font-bold leading-tight">
        {title}
      </h2>
      {subtitle && (
        <p className="text-[13px] text-ink-muted mt-1.5 leading-snug">{subtitle}</p>
      )}
    </div>
    {children}
    {onBack && (
      <div className="mt-4">
        <button
          type="button"
          onClick={onBack}
          className="text-[13px] text-ink-muted hover:text-ink transition-colors"
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
  <div className="grid grid-cols-[140px_1fr] gap-2 text-[13px]">
    <div className="text-ink-muted">{label}</div>
    <div className={mono ? "font-mono tnum text-ink" : "text-ink"}>{value}</div>
  </div>
);

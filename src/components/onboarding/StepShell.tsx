"use client";

import { ReactNode } from "react";
import { Button } from "@/components/ui/Button";
import { Loader2 } from "lucide-react";

export const StepShell = ({
  eyebrow,
  title,
  subtitle,
  children,
  primaryLabel = "Weiter",
  primaryDisabled = false,
  primaryLoading = false,
  onPrimary,
  onSkip,
  onBack,
  error,
}: {
  eyebrow: string;
  title: string;
  subtitle?: string;
  children: ReactNode;
  primaryLabel?: string;
  primaryDisabled?: boolean;
  primaryLoading?: boolean;
  onPrimary: () => void;
  onSkip?: () => void;
  onBack?: () => void;
  error?: string | null;
}) => {
  return (
    <div className="bg-paper border border-hairline rounded-card shadow-panel overflow-hidden">
      <div className="px-7 sm:px-10 pt-9 sm:pt-11 pb-2">
        <div className="kicker text-ink-muted mb-3">{eyebrow}</div>
        <h1 className="font-display font-extrabold text-ink text-[26px] sm:text-[34px] leading-[1.06] tracking-tightest">
          {title}
        </h1>
        {subtitle && (
          <p className="mt-3 text-[14.5px] leading-[1.55] text-ink-soft max-w-xl">
            {subtitle}
          </p>
        )}
      </div>

      <div className="px-7 sm:px-10 py-7">{children}</div>

      {error && (
        <div className="mx-7 sm:mx-10 mb-4 px-4 py-3 rounded-input bg-red-50 border border-red-200 text-[13.5px] text-red-700">
          {error}
        </div>
      )}

      <div className="px-7 sm:px-10 pb-8 pt-3 flex items-center justify-between gap-3 border-t border-hairline">
        <div className="flex items-center gap-3">
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              className="text-[13.5px] text-ink-muted hover:text-ink transition-colors"
            >
              Zurück
            </button>
          )}
        </div>
        <div className="flex items-center gap-3">
          {onSkip && (
            <button
              type="button"
              onClick={onSkip}
              className="text-[13.5px] text-ink-muted hover:text-ink transition-colors"
            >
              Später einrichten
            </button>
          )}
          <Button
            type="button"
            variant="signal"
            size="md"
            onClick={onPrimary}
            disabled={primaryDisabled || primaryLoading}
          >
            {primaryLoading ? <Loader2 size={14} className="animate-spin" /> : primaryLabel}
          </Button>
        </div>
      </div>
    </div>
  );
};

export const Field = ({
  label,
  hint,
  children,
  required,
}: {
  label: string;
  hint?: string;
  required?: boolean;
  children: ReactNode;
}) => (
  <label className="block">
    <div className="flex items-baseline justify-between mb-1.5">
      <span className="data-label">
        {label}
        {required && <span className="text-signal ml-0.5">*</span>}
      </span>
      {hint && <span className="font-mono text-[11px] text-ink-muted">{hint}</span>}
    </div>
    {children}
  </label>
);

export const inputClass =
  "field";

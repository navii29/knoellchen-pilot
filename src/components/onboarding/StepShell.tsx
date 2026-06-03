"use client";

import { ReactNode } from "react";

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
    <div className="bg-white rounded-3xl ring-1 ring-zinc-200/70 shadow-sm overflow-hidden">
      <div className="px-7 sm:px-10 pt-9 sm:pt-12 pb-2">
        <div className="text-[12px] uppercase tracking-[0.1em] font-semibold text-indigo-700 mb-3">
          {eyebrow}
        </div>
        <h1 className="font-display text-zinc-900 text-[30px] sm:text-[40px] leading-[1.1] tracking-[-0.02em] font-medium">
          {title}
        </h1>
        {subtitle && (
          <p className="mt-3 text-[15.5px] leading-[1.55] text-zinc-600 max-w-xl">
            {subtitle}
          </p>
        )}
      </div>

      <div className="px-7 sm:px-10 py-8">{children}</div>

      {error && (
        <div className="mx-7 sm:mx-10 mb-4 px-4 py-3 rounded-xl bg-rose-50 ring-1 ring-rose-200 text-[14px] text-rose-700">
          {error}
        </div>
      )}

      <div className="px-7 sm:px-10 pb-8 pt-2 flex items-center justify-between gap-3 border-t border-zinc-100">
        <div className="flex items-center gap-3">
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              className="text-[14px] text-zinc-500 hover:text-zinc-800 transition-colors"
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
              className="text-[14px] text-zinc-500 hover:text-zinc-800 transition-colors"
            >
              Später einrichten
            </button>
          )}
          <button
            type="button"
            onClick={onPrimary}
            disabled={primaryDisabled || primaryLoading}
            className="inline-flex items-center justify-center h-11 px-6 rounded-full bg-zinc-900 text-white text-[14px] font-medium hover:bg-zinc-800 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {primaryLoading ? "…" : primaryLabel}
          </button>
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
      <span className="text-[13px] font-medium text-zinc-700">
        {label}
        {required && <span className="text-rose-500 ml-0.5">*</span>}
      </span>
      {hint && <span className="text-[12px] text-zinc-400">{hint}</span>}
    </div>
    {children}
  </label>
);

export const inputClass =
  "w-full h-11 px-3.5 rounded-xl bg-white ring-1 ring-zinc-200 text-[14.5px] text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500 transition-shadow";

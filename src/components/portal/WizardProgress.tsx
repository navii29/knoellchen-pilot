"use client";

export const WizardProgress = ({
  current,
  total,
  labels,
}: {
  current: number;
  total: number;
  labels: string[];
}) => {
  const pct = Math.max(0, Math.min(100, ((current - 1) / Math.max(1, total - 1)) * 100));
  return (
    <div className="px-5 pt-4 pb-2">
      <div className="flex items-center justify-between mb-2">
        <div className="kicker text-ink-muted">
          Schritt {current} von {total}
        </div>
        <div className="text-[12px] text-ink font-semibold font-mono">
          {labels[Math.min(current - 1, labels.length - 1)] ?? ""}
        </div>
      </div>
      {/* progress track — hairline bg, signal fill */}
      <div className="h-1 rounded-full bg-hairline overflow-hidden">
        <div
          className="h-full rounded-full bg-signal transition-[width] duration-500 ease-out"
          style={{ width: `${pct}%` }}
        />
      </div>
      {/* desktop step labels */}
      <div className="hidden sm:flex justify-between mt-2 text-[10px] text-ink-muted">
        {labels.map((l, i) => (
          <span
            key={l}
            className={`flex-1 text-center ${
              i + 1 <= current ? "text-ink font-semibold" : ""
            } ${i + 1 === current ? "text-signal" : ""}`}
          >
            {l}
          </span>
        ))}
      </div>
    </div>
  );
};

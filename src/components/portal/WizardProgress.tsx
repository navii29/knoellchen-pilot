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
        <div className="text-[11px] uppercase tracking-[0.08em] text-stone-500 font-semibold">
          Schritt {current} von {total}
        </div>
        <div className="text-[12px] text-stone-700 font-medium">
          {labels[Math.min(current - 1, labels.length - 1)] ?? ""}
        </div>
      </div>
      <div className="h-1.5 rounded-full bg-stone-200 overflow-hidden">
        <div
          className="h-full rounded-full bg-gradient-to-r from-teal-500 to-emerald-500 transition-[width] duration-500 ease-out"
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="hidden sm:flex justify-between mt-2 text-[10px] text-stone-400">
        {labels.map((l, i) => (
          <span
            key={l}
            className={`flex-1 text-center ${
              i + 1 <= current ? "text-stone-700 font-medium" : ""
            }`}
          >
            {l}
          </span>
        ))}
      </div>
    </div>
  );
};

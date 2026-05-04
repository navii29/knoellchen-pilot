import Link from "next/link";

export const ProgressBar = ({
  current,
  total,
  labels,
}: {
  current: number;
  total: number;
  labels: string[];
}) => {
  const pct = Math.round((current / total) * 100);
  return (
    <header className="sticky top-0 z-40 bg-white/85 backdrop-blur-md border-b border-stone-200/70">
      <div className="max-w-5xl mx-auto px-6 lg:px-10 py-4 flex items-center gap-4">
        <Link href="/dashboard" className="flex items-center gap-2 shrink-0">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-teal-400 to-emerald-500 flex items-center justify-center shadow shadow-teal-500/20">
            <span className="text-black font-bold text-[13px]">K</span>
          </div>
          <span className="hidden sm:inline text-stone-900 font-medium tracking-tight text-[15px]">
            Knöllchen-Pilot
          </span>
        </Link>

        <div className="flex-1 flex items-center gap-3">
          <div className="hidden sm:block text-[12px] uppercase tracking-[0.08em] text-stone-500 font-medium shrink-0">
            Schritt {current} von {total}
          </div>
          <div className="flex-1 h-1.5 rounded-full bg-stone-200/80 overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-teal-500 to-emerald-500 transition-[width] duration-500 ease-out"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>

        <div className="hidden md:flex items-center gap-1 text-[12.5px] text-stone-500">
          {labels.map((label, i) => {
            const idx = i + 1;
            const active = idx === current;
            const done = idx < current;
            return (
              <div key={label} className="flex items-center">
                <span
                  className={`px-2.5 py-1 rounded-full transition-colors ${
                    active
                      ? "bg-stone-900 text-white"
                      : done
                      ? "text-teal-700"
                      : "text-stone-400"
                  }`}
                >
                  {label}
                </span>
                {idx < labels.length && (
                  <span className="mx-0.5 text-stone-300">·</span>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </header>
  );
};

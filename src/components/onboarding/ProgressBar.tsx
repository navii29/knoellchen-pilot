import Link from "next/link";
import { Logo } from "@/components/ui/Logo";

export const ProgressBar = ({
  current,
  total,
  labels,
}: {
  current: number;
  total: number;
  labels: string[];
}) => {
  return (
    <header className="sticky top-0 z-40 bg-paper/90 backdrop-blur-md border-b border-hairline">
      <div className="max-w-5xl mx-auto px-6 lg:px-10 py-3.5 flex items-center gap-4">
        <Link href="/dashboard" className="shrink-0">
          <Logo size={28} />
        </Link>

        <div className="flex-1 flex items-center gap-3">
          <div className="hidden sm:block font-mono text-[11px] uppercase tracking-widest text-ink-muted shrink-0 tnum">
            {current}&nbsp;/&nbsp;{total}
          </div>
          {/* stepped track */}
          <div className="flex-1 flex items-center gap-0.5">
            {labels.map((_, i) => {
              const idx = i + 1;
              const done = idx < current;
              const active = idx === current;
              return (
                <div
                  key={i}
                  className="flex-1 h-1 rounded-full transition-colors duration-300"
                  style={{
                    background: done
                      ? "var(--signal)"
                      : active
                      ? "var(--signal)"
                      : "var(--hairline)",
                    opacity: active ? 0.7 : done ? 1 : 1,
                  }}
                />
              );
            })}
          </div>
        </div>

        <div className="hidden md:flex items-center gap-0.5 font-mono text-[11.5px]">
          {labels.map((label, i) => {
            const idx = i + 1;
            const active = idx === current;
            const done = idx < current;
            return (
              <div key={label} className="flex items-center">
                <span
                  className={`px-2 py-1 rounded-btn transition-colors ${
                    active
                      ? "bg-signal text-white"
                      : done
                      ? "text-signal"
                      : "text-ink-muted"
                  }`}
                >
                  {label}
                </span>
                {idx < labels.length && (
                  <span className="mx-0.5 text-ink-muted/40">·</span>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </header>
  );
};

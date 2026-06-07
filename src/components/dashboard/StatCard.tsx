import { type LucideIcon } from "lucide-react";

export const StatCard = ({
  label,
  value,
  Icon,
  accent = false,
  sub,
}: {
  label: string;
  value: string | number;
  Icon: LucideIcon;
  accent?: boolean;
  sub?: string;
}) => (
  <div className="bg-paper border border-hairline rounded-card shadow-panel p-5 flex flex-col gap-4">
    <div className="flex items-start justify-between">
      {/* Mono kicker label */}
      <span className="font-mono text-[10px] uppercase tracking-wider text-ink-muted">
        {label}
      </span>
      {/* Icon in hairline-bordered square */}
      <div
        className={`w-8 h-8 rounded-frame border flex items-center justify-center shrink-0 ${
          accent
            ? "border-signal/20 bg-signal-soft text-signal-ink"
            : "border-hairline bg-canvas text-ink-muted"
        }`}
      >
        <Icon size={14} strokeWidth={1.75} />
      </div>
    </div>
    {/* Value — display font, tabular nums */}
    <div className="font-display font-extrabold text-[34px] leading-none tracking-tightest tabular-nums text-ink">
      {value}
    </div>
    {sub && (
      <div className="font-mono text-[11px] text-ink-muted">{sub}</div>
    )}
  </div>
);

export const HeroStat = ({
  label,
  value,
  Icon,
  sub,
  pulse = false,
}: {
  label: string;
  value: string | number;
  Icon: LucideIcon;
  sub?: string;
  pulse?: boolean;
}) => (
  <div className="relative bg-paper border border-hairline rounded-card shadow-panel overflow-hidden p-6 md:p-8 flex flex-col gap-5">
    {/* Left signal accent bar */}
    <div
      aria-hidden
      className="absolute left-0 top-0 bottom-0 w-[3px] bg-signal rounded-l-card"
    />

    {/* Header row */}
    <div className="flex items-start justify-between">
      <div className="flex items-center gap-2">
        <span className="font-mono text-[10px] uppercase tracking-wider text-ink-muted">
          {label}
        </span>
        {pulse && (
          <span className="relative inline-flex w-2 h-2 shrink-0">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-signal opacity-50" />
            <span className="relative inline-flex rounded-full w-2 h-2 bg-signal" />
          </span>
        )}
      </div>
      {/* Icon in hairline square */}
      <div className="w-9 h-9 rounded-frame border border-hairline bg-canvas text-ink-muted flex items-center justify-center shrink-0">
        <Icon size={16} strokeWidth={1.75} />
      </div>
    </div>

    {/* Dominant number */}
    <div className="font-display font-extrabold text-[68px] md:text-[88px] leading-none tracking-tightest tabular-nums text-ink">
      {value}
    </div>

    {sub && (
      <div className="font-mono text-[12px] text-ink-muted">{sub}</div>
    )}
  </div>
);

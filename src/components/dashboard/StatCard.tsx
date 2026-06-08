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
      <span className="text-[12px] font-medium text-ink-muted">{label}</span>
      <div
        className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${
          accent ? "bg-signal-soft text-signal" : "bg-canvas text-ink-muted"
        }`}
      >
        <Icon size={15} strokeWidth={1.9} />
      </div>
    </div>
    <div className="font-display font-semibold text-[34px] leading-none tracking-tight tabular-nums text-ink">
      {value}
    </div>
    {sub && <div className="text-[12px] text-ink-muted">{sub}</div>}
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
  <div className="relative bg-graphite text-white rounded-card shadow-product overflow-hidden p-6 md:p-8 flex flex-col gap-5">
    {/* ambient blue glow */}
    <div
      aria-hidden
      className="absolute -right-10 -top-10 w-44 h-44 rounded-full pointer-events-none"
      style={{ background: "radial-gradient(closest-side, rgba(0,113,227,0.45), transparent)" }}
    />
    <div className="relative flex items-start justify-between">
      <div className="flex items-center gap-2">
        <span className="text-[12px] font-medium text-white/55">{label}</span>
        {pulse && (
          <span className="relative inline-flex w-2 h-2 shrink-0">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-azure-sky opacity-60" />
            <span className="relative inline-flex rounded-full w-2 h-2 bg-azure-sky" />
          </span>
        )}
      </div>
      <div className="w-9 h-9 rounded-full bg-white/10 text-white flex items-center justify-center shrink-0">
        <Icon size={16} strokeWidth={1.9} />
      </div>
    </div>

    <div className="relative font-display font-semibold text-[68px] md:text-[88px] leading-none tracking-tight tabular-nums text-white">
      {value}
    </div>

    {sub && <div className="relative text-[12px] text-white/55">{sub}</div>}
  </div>
);

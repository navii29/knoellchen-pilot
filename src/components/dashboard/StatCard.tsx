import { type LucideIcon } from "lucide-react";

const CARD_BASE =
  "rounded-xl bg-white shadow-[0_1px_3px_rgba(0,0,0,0.04)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.06)] transition-shadow duration-200";

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
  <div className={`${CARD_BASE} p-5`}>
    <div className="flex items-start justify-between">
      <div className="text-[13px] text-stone-500">{label}</div>
      <div
        className={`w-8 h-8 rounded-full flex items-center justify-center ${
          accent ? "bg-amber-50 text-amber-700" : "bg-stone-100 text-stone-500"
        }`}
      >
        <Icon size={14} strokeWidth={1.75} />
      </div>
    </div>
    <div className="mt-4 font-display font-semibold text-[26px] leading-none tracking-tight tabular-nums text-stone-900">
      {value}
    </div>
    {sub && <div className="mt-1.5 text-[11px] text-stone-400">{sub}</div>}
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
  <div
    className={`${CARD_BASE} relative overflow-hidden p-6 md:p-7`}
  >
    {/* dezenter Hintergrund-Gradient */}
    <div
      aria-hidden
      className="absolute -top-16 -right-16 w-48 h-48 rounded-full opacity-[0.06]"
      style={{ background: "radial-gradient(closest-side, #f59e0b, transparent)" }}
    />

    <div className="relative flex items-start justify-between">
      <div className="flex items-center gap-2">
        <div className="text-[13px] text-stone-500">{label}</div>
        {pulse && (
          <span className="relative inline-flex w-1.5 h-1.5 rounded-full text-amber-500 pulse-dot">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 inline-block" />
          </span>
        )}
      </div>
      <div className="w-9 h-9 rounded-full flex items-center justify-center bg-amber-50 text-amber-700">
        <Icon size={16} strokeWidth={1.75} />
      </div>
    </div>

    <div className="relative mt-5 font-display font-semibold text-[56px] md:text-[64px] leading-none tracking-tight tabular-nums text-stone-900">
      {value}
    </div>

    {sub && <div className="relative mt-3 text-xs text-stone-500">{sub}</div>}
  </div>
);

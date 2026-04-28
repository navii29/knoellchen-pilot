import { type LucideIcon } from "lucide-react";

const CARD_BASE =
  "rounded-2xl bg-white ring-1 ring-black/[0.05] hover:ring-black/[0.08] transition-all duration-200";

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
  <div className={`${CARD_BASE} p-6`}>
    <div className="flex items-start justify-between">
      <div className="text-[12px] uppercase tracking-wider text-stone-500 font-medium">
        {label}
      </div>
      <div
        className={`w-9 h-9 rounded-full flex items-center justify-center ${
          accent ? "bg-amber-50 text-amber-700" : "bg-stone-100 text-stone-600"
        }`}
      >
        <Icon size={15} strokeWidth={1.75} />
      </div>
    </div>
    <div className="mt-5 font-display font-medium text-[34px] leading-none tracking-[-0.025em] tabular-nums text-stone-900">
      {value}
    </div>
    {sub && <div className="mt-2 text-[12px] text-stone-500">{sub}</div>}
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
  <div className={`${CARD_BASE} relative overflow-hidden p-7 md:p-8`}>
    {/* Teal-Gradient-Glow Hintergrund */}
    <div
      aria-hidden
      className="absolute -top-24 -right-16 w-64 h-64 rounded-full opacity-[0.10]"
      style={{ background: "radial-gradient(closest-side, #0d9488, transparent 70%)" }}
    />
    {/* dezenter Akzent-Strich */}
    <div
      aria-hidden
      className="absolute left-0 top-0 bottom-0 w-[3px] bg-gradient-to-b from-teal-400 to-emerald-500 rounded-l-2xl"
    />

    <div className="relative flex items-start justify-between">
      <div className="flex items-center gap-2.5">
        <div className="text-[12px] uppercase tracking-wider text-stone-500 font-medium">
          {label}
        </div>
        {pulse && (
          <span className="relative inline-flex w-2 h-2 rounded-full text-amber-500 pulse-dot">
            <span className="w-2 h-2 rounded-full bg-amber-500 inline-block" />
          </span>
        )}
      </div>
      <div className="w-10 h-10 rounded-full flex items-center justify-center bg-gradient-to-br from-teal-50 to-emerald-50 text-teal-700 ring-1 ring-teal-100">
        <Icon size={17} strokeWidth={1.75} />
      </div>
    </div>

    <div className="relative mt-7 font-display font-medium text-[68px] md:text-[88px] leading-none tracking-[-0.045em] tabular-nums text-stone-900">
      {value}
    </div>

    {sub && (
      <div className="relative mt-4 text-[13px] text-stone-500 flex items-center gap-2">
        {sub}
      </div>
    )}
  </div>
);

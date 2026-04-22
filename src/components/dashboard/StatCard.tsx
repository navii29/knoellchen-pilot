import { type LucideIcon, TrendingDown, TrendingUp } from "lucide-react";

export const StatCard = ({
  label,
  value,
  delta,
  Icon,
  color,
  sub,
}: {
  label: string;
  value: string | number;
  delta?: string;
  Icon: LucideIcon;
  color: string;
  sub?: string;
}) => (
  <div className="rounded-xl ring-1 ring-stone-200 bg-white p-5">
    <div className="flex items-start justify-between">
      <div className="text-sm text-stone-500">{label}</div>
      <div
        className="w-8 h-8 rounded-lg flex items-center justify-center"
        style={{ background: color + "1a", color }}
      >
        <Icon size={16} />
      </div>
    </div>
    <div className="mt-3 font-display font-bold text-3xl tracking-tight tabular-nums">{value}</div>
    {sub && <div className="mt-1 text-xs text-stone-500">{sub}</div>}
    {delta && (
      <div
        className={`mt-2 inline-flex items-center gap-1 text-xs font-medium ${
          delta.startsWith("+") ? "text-emerald-700" : "text-stone-500"
        }`}
      >
        {delta.startsWith("+") ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
        {delta} ggü. letzter Woche
      </div>
    )}
  </div>
);

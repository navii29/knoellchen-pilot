import Link from "next/link";
import { ChevronRight, type LucideIcon } from "lucide-react";

type Accent = "blue" | "amber" | "emerald";

const ACCENT: Record<Accent, { bar: string; tile: string }> = {
  blue: { bar: "bg-signal", tile: "bg-signal-soft text-signal-ink" },
  amber: { bar: "bg-amber-400", tile: "bg-amber-50 text-amber-700" },
  emerald: { bar: "bg-emerald-400", tile: "bg-emerald-50 text-emerald-700" },
};

// "Zu erledigen"-Karte: Icon-Kachel + Titel/Untertitel + CTA/Chevron, mit
// farbigem Akzentbalken links (separat, damit der Glasrand intakt bleibt).
export const ActionCard = ({
  Icon,
  title,
  subtitle,
  href,
  accent = "blue",
  cta,
}: {
  Icon: LucideIcon;
  title: string;
  subtitle?: string;
  href: string;
  accent?: Accent;
  cta?: string;
}) => {
  const a = ACCENT[accent];
  return (
    <Link
      href={href}
      className="glass-card glass-sheen rounded-card relative flex items-center gap-3 pl-5 pr-4 py-3 transition active:scale-[.99]"
    >
      <span className={`absolute left-1.5 top-3 bottom-3 w-1 rounded-full ${a.bar}`} />
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${a.tile}`}>
        <Icon size={16} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-[14px] font-semibold text-ink truncate">{title}</div>
        {subtitle && <div className="text-[12px] text-ink-muted truncate">{subtitle}</div>}
      </div>
      {cta ? (
        <span className="text-[11px] font-bold uppercase tracking-wide bg-signal text-white px-2.5 py-1 rounded-full shrink-0">
          {cta}
        </span>
      ) : (
        <ChevronRight size={16} className="text-ink-muted shrink-0" />
      )}
    </Link>
  );
};

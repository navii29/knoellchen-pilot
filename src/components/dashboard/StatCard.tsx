import { type LucideIcon } from "lucide-react";

/**
 * Kompakte Kennzahl-Karte (helle Workspace-Fläche).
 * Label + definierte Icon-Kachel oben, große Zahl unten (per mt-auto an den
 * Kartenboden gepinnt — füllt auch gestreckte Grid-Höhen sauber aus).
 */
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
  <div className="glass-card glass-sheen rounded-card p-5 flex flex-col gap-4 min-h-[150px]">
    {/* Icon + Label als ruhige Kopfzeile, beide links bündig — kein Icon mehr
        in der Ecke, das an der Kartenrundung abgeschnitten wirkt. */}
    <div className="flex items-center gap-2.5">
      <span
        className={`shrink-0 inline-flex items-center justify-center w-9 h-9 rounded-xl ${
          accent ? "bg-signal text-white" : "bg-signal-soft text-signal"
        }`}
      >
        <Icon size={17} strokeWidth={2} />
      </span>
      <span className="text-[13px] font-medium text-ink-soft leading-tight [overflow-wrap:anywhere]">
        {label}
      </span>
    </div>
    <div className="mt-auto">
      <div className="font-display font-semibold text-[30px] leading-none tracking-tight tabular-nums text-ink">
        {value}
      </div>
      {sub && <div className="mt-1.5 text-[12.5px] text-ink-muted">{sub}</div>}
    </div>
  </div>
);

/**
 * Hervorgehobene Kennzahl — dunkle Karte mit blauem Ambient-Glow.
 * Gleiche Anatomie wie StatCard (Label+Icon oben, große Zahl unten).
 */
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
  <div className="relative bg-graphite text-white rounded-card shadow-product overflow-hidden p-6 md:p-8 flex flex-col min-h-[180px]">
    {/* ambient blue glow */}
    <div
      aria-hidden
      className="absolute -right-12 -top-12 w-48 h-48 rounded-full pointer-events-none"
      style={{ background: "radial-gradient(closest-side, rgba(0,113,227,0.45), transparent)" }}
    />
    <div className="relative flex items-start justify-between gap-3">
      <div className="flex items-center gap-2 min-w-0">
        <span className="text-[13px] font-medium text-white/60 truncate">{label}</span>
        {pulse && (
          <span className="relative inline-flex w-2 h-2 shrink-0">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-azure-sky opacity-60" />
            <span className="relative inline-flex rounded-full w-2 h-2 bg-azure-sky" />
          </span>
        )}
      </div>
      <span className="shrink-0 inline-flex items-center justify-center w-10 h-10 rounded-xl bg-white/10 border border-white/10 text-white">
        <Icon size={18} strokeWidth={1.9} />
      </span>
    </div>

    <div className="relative mt-auto pt-6">
      <div className="font-display font-semibold text-[64px] md:text-[84px] leading-none tracking-tight tabular-nums text-white">
        {value}
      </div>
      {sub && <div className="mt-3 text-[13px] text-white/60">{sub}</div>}
    </div>
  </div>
);

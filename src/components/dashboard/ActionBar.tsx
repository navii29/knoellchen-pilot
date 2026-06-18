import Link from "next/link";
import { ChevronRight, type LucideIcon } from "lucide-react";

export type ActionItem = {
  label: string;
  count: number;
  href: string;
  Icon: LucideIcon;
};

/**
 * "Handlungsbedarf" — die laute Zeile oben: alles, was auf den Betrieb wartet.
 * Jede Kachel ist klickbar und führt direkt in die jeweilige Liste. Counts > 0
 * werden hervorgehoben (Signal-Punkt + kräftige Zahl), 0 bleibt ruhig.
 */
export const ActionBar = ({ items }: { items: ActionItem[] }) => {
  return (
    <div>
      <div className="kicker text-ink-muted mb-3">Handlungsbedarf</div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {items.map((it) => {
          const active = it.count > 0;
          return (
            <Link
              key={it.label}
              href={it.href}
              className="group glass-card glass-sheen rounded-card p-4 flex items-center gap-3.5 hover:-translate-y-px transition-transform"
            >
              <span
                className={`shrink-0 inline-flex items-center justify-center w-10 h-10 rounded-xl ${
                  active ? "bg-signal text-white" : "bg-signal-soft text-signal"
                }`}
              >
                <it.Icon size={18} strokeWidth={2} />
              </span>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span
                    className={`font-display font-semibold text-[26px] leading-none tabular-nums ${
                      active ? "text-ink" : "text-ink-muted"
                    }`}
                  >
                    {it.count}
                  </span>
                  {active && <span className="w-1.5 h-1.5 rounded-full bg-signal" />}
                </div>
                <div className="text-[12.5px] text-ink-muted mt-1 leading-tight">{it.label}</div>
              </div>
              <ChevronRight
                size={16}
                className="ml-auto shrink-0 text-ink-muted opacity-0 group-hover:opacity-100 transition-opacity"
              />
            </Link>
          );
        })}
      </div>
    </div>
  );
};

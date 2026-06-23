import {
  ShieldCheck,
  Clock,
  MapPin,
  Handshake,
  Wrench,
  PhoneCall,
  Zap,
  BadgeEuro,
  Star,
  Check,
  type LucideIcon,
} from "lucide-react";
import type { FeaturesContent } from "@/lib/site/types";

// Nur eine kuratierte, sichere Allowlist an Icons — kein dynamischer Import
// beliebiger Namen.
const ICONS: Record<string, LucideIcon> = {
  ShieldCheck,
  Clock,
  MapPin,
  Handshake,
  Wrench,
  PhoneCall,
  Zap,
  BadgeEuro,
  Star,
};

export function Features({ content }: { content: FeaturesContent }) {
  return (
    <section className="bg-[var(--site-surface)]">
      <div className="mx-auto max-w-6xl px-6 py-16">
        {content.title ? (
          <h2 className="mb-10 text-center font-[var(--site-font)] text-3xl font-bold text-[var(--site-ink)]">
            {content.title}
          </h2>
        ) : null}
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {content.items.map((item, i) => {
            const Icon = (item.icon && ICONS[item.icon]) || Check;
            return (
              <div key={i} className="text-center">
                <div
                  className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl"
                  style={{
                    backgroundColor: "color-mix(in srgb, var(--site-primary) 12%, transparent)",
                  }}
                >
                  <Icon
                    className="h-7 w-7 text-[var(--site-primary)]"
                    strokeWidth={1.5}
                  />
                </div>
                <h3 className="mt-4 text-lg font-semibold text-[var(--site-ink)]">
                  {item.title}
                </h3>
                {item.text ? (
                  <p className="mt-2 text-sm text-[var(--site-ink-soft)]">
                    {item.text}
                  </p>
                ) : null}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

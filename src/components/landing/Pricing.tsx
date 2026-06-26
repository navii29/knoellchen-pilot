/**
 * Pricing — Three tiers on bg-canvas/bg-paper.
 * Pro is the ONLY card with a signal accent border + badge.
 * Mono tnum for price numbers. Stripe note below grid.
 */

import { Check } from "lucide-react";
import { ButtonLink } from "@/components/ui/Button";

const TIERS = [
  {
    id: "starter",
    name: "Starter",
    price: "49",
    period: "/ Monat",
    tagline: "Für den Einstieg — ein Standort, alle Kernfunktionen.",
    features: [
      "Bis zu 3 Fahrzeuge",
      "Verträge & E-Signatur",
      "Übergabeprotokoll mit Fotos",
      "Software-Strafzettel-Auslesen (20 / Monat)",
      "Kunden-CRM",
      "E-Mail-Support",
    ],
    cta: "Kostenlos testen",
    href: "/register",
    variant: "ink" as const,
    highlighted: false,
    badge: null,
  },
  {
    id: "pro",
    name: "Pro",
    price: "149",
    period: "/ Monat",
    tagline: "Für wachsende Vermietungen mit hohem Volumen.",
    features: [
      "Unbegrenzte Fahrzeuge",
      "Alles aus Starter",
      "Software-Strafzettel unbegrenzt",
      "Dynamic Pricing",
      "Auswertung & Margin-Reports",
      "Mieterportal (White-Label)",
      "Prioritäts-Support",
    ],
    badge: "Empfohlen",
    cta: "14 Tage gratis testen",
    href: "/register",
    variant: "signal" as const,
    highlighted: true,
  },
  {
    id: "enterprise",
    name: "Enterprise",
    price: "individuell",
    period: "",
    tagline: "Für Fuhrparks, Filialketten und individuelle Anforderungen.",
    features: [
      "Mehrere Standorte / Mandanten",
      "Alles aus Pro",
      "Dedizierter Account-Manager",
      "SLA-Vertrag",
      "API-Zugang",
      "On-Premise / Private Cloud möglich",
    ],
    cta: "Kontakt aufnehmen",
    href: "mailto:hallo@knoellchen-pilot.de",
    variant: "ghost" as const,
    highlighted: false,
    badge: null,
  },
];

const FeatureRow = ({ text }: { text: string }) => (
  <li className="flex items-start gap-2.5">
    <span className="mt-0.5 shrink-0">
      <Check size={13} strokeWidth={2.5} className="text-ink-soft" />
    </span>
    <span className="text-[13.5px] text-ink-soft leading-snug">{text}</span>
  </li>
);

export const Pricing = () => {
  return (
    <section id="pricing" className="bg-paper border-t border-hairline">
      <div className="max-w-wide mx-auto px-5 lg:px-8 py-20 lg:py-28">
        {/* header */}
        <div className="max-w-2xl mb-12">
          <span className="kicker text-ink-muted">Preise</span>
          <h2 className="mt-4 font-display font-extrabold text-[28px] lg:text-[38px] text-ink leading-tight tracking-tightest">
            Klar kalkulierbar.
            <br />
            <span className="text-ink-muted">Ohne versteckte Kosten.</span>
          </h2>
          <p className="mt-4 text-[15px] leading-relaxed text-ink-soft">
            Alle Tarife beinhalten kostenlose Updates. Keine Setup-Gebühr.
            14 Tage kostenlos testen — ohne Kreditkarte.
          </p>
        </div>

        {/* tier grid */}
        <div className="grid gap-4 md:grid-cols-3 items-stretch">
          {TIERS.map((tier) => (
            <div
              key={tier.id}
              className={[
                "relative rounded-card flex flex-col overflow-hidden",
                tier.highlighted
                  ? "border border-signal shadow-signal bg-paper"
                  : "border border-hairline bg-paper shadow-panel",
              ].join(" ")}
            >
              {/* signal badge strip — Pro only */}
              {tier.badge && (
                <div className="bg-signal px-4 py-1.5 flex items-center justify-center">
                  <span className="font-mono text-[11px] font-medium tracking-widest uppercase text-white">
                    {tier.badge}
                  </span>
                </div>
              )}

              <div className="p-6 flex flex-col flex-1">
                {/* tier name */}
                <div className="font-display font-bold text-[15px] text-ink tracking-tight">
                  {tier.name}
                </div>

                {/* price */}
                <div className="mt-4 flex items-baseline gap-1">
                  {tier.price === "individuell" ? (
                    <span className="font-mono font-bold text-[24px] text-ink tnum tracking-tight">
                      Individuell
                    </span>
                  ) : (
                    <>
                      <span className="font-mono font-bold text-[36px] text-ink tnum leading-none tracking-tightest">
                        €{tier.price}
                      </span>
                      <span className="font-mono text-[12px] text-ink-muted">{tier.period}</span>
                    </>
                  )}
                </div>

                <p className="mt-3 text-[13px] text-ink-muted leading-snug">{tier.tagline}</p>

                {/* divider */}
                <div className="my-5 border-t border-hairline" />

                {/* features */}
                <ul className="space-y-2.5 flex-1">
                  {tier.features.map((f) => (
                    <FeatureRow key={f} text={f} />
                  ))}
                </ul>

                {/* CTA */}
                <div className="mt-7">
                  <ButtonLink
                    href={tier.href}
                    variant={tier.variant}
                    size="md"
                    className="w-full justify-center"
                  >
                    {tier.cta}
                  </ButtonLink>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* footnote */}
        <p className="mt-6 text-center font-mono text-[11.5px] text-ink-muted">
          Stripe-Zahlung bald verfügbar · Aktuell per SEPA-Überweisung · Alle Preise zzgl. MwSt.
        </p>
      </div>
    </section>
  );
};

import { Check } from "lucide-react";
import { AppleLink } from "./AppleButton";
import { Reveal } from "./Reveal";

type Plan = {
  name: string;
  price: string;
  period?: string;
  tagline: string;
  features: string[];
  cta: string;
  recommended?: boolean;
};

const PLANS: Plan[] = [
  {
    name: "Starter",
    price: "49",
    period: "/ Monat",
    tagline: "Für kleine Flotten, die einfach starten wollen.",
    features: [
      "Bis zu 20 Fahrzeuge",
      "KI-Strafzettel-Erkennung",
      "Automatische Fahrerzuordnung",
      "Digitale Mietverträge",
      "Kunden-Portal",
      "E-Mail-Support",
    ],
    cta: "Kostenlos testen",
  },
  {
    name: "Pro",
    price: "149",
    period: "/ Monat",
    tagline: "Alles automatisch. Für wachsende Vermieter.",
    features: [
      "Unbegrenzte Fahrzeuge",
      "Alles aus Starter",
      "Dynamic Pricing",
      "Automatische PDF-Erstellung",
      "Zeugenfragebogen & Anschreiben",
      "Zahlungs-Tracking",
      "CSV-Import für Buchungen",
      "Prioritäts-Support",
    ],
    cta: "Kostenlos testen",
    recommended: true,
  },
  {
    name: "Enterprise",
    price: "Individuell",
    tagline: "Für Flotten mit besonderen Anforderungen.",
    features: [
      "Alles aus Pro",
      "Mehrere Standorte / Filialen",
      "Benutzerdefinierte Integrationen",
      "SLA-Garantie",
      "Dedizierteter Account-Manager",
      "On-Premise-Option auf Anfrage",
    ],
    cta: "Kontakt aufnehmen",
  },
];

export const ApplePricing = () => {
  return (
    <section id="preise" className="bg-mist">
      <div className="max-w-[1080px] mx-auto px-5 py-24 sm:py-32">
        {/* heading */}
        <Reveal as="div" className="text-center mb-14">
          <div className="inline-flex items-center gap-2 text-[13px] text-graphite-muted mb-5">
            <span className="w-1.5 h-1.5 rounded-full bg-azure" />
            Transparente Preise
          </div>
          <h2 className="apple-display text-[34px] sm:text-[52px] text-graphite mx-auto max-w-[16ch]">
            Bezahlen Sie nur, was Sie brauchen.
          </h2>
          <p className="mt-4 text-[18px] leading-[1.45] text-graphite-soft max-w-[42ch] mx-auto">
            Kein verstecktes Kleingedrucktes. Monatlich kundbar.
          </p>
        </Reveal>

        {/* cards */}
        <div className="grid md:grid-cols-3 gap-5 items-start">
          {PLANS.map((plan, i) => {
            if (plan.recommended) {
              // Pro card — pitch-black, premium contrast
              return (
                <Reveal key={plan.name} as="div" delay={i * 80}>
                  <div className="relative rounded-apple bg-graphite p-8 ring-1 ring-black/[0.06] shadow-product flex flex-col h-full">
                    {/* recommended pill */}
                    <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                      <span className="inline-flex items-center rounded-pill bg-azure px-3.5 py-1 text-[12px] font-semibold text-white shadow-azure">
                        Empfohlen
                      </span>
                    </div>

                    <div className="pt-2">
                      <div className="text-[13px] font-medium text-white/50 mb-1">{plan.name}</div>
                      <div className="flex items-end gap-1.5 mt-2 mb-1">
                        <span className="text-[44px] font-semibold tracking-tight tabular-nums text-white leading-none">
                          {plan.price.startsWith("I") ? plan.price : `${plan.price} €`}
                        </span>
                        {plan.period && (
                          <span className="text-[14px] text-white/40 mb-1">{plan.period}</span>
                        )}
                      </div>
                      <p className="text-[14px] text-white/55 mt-2 leading-[1.5]">{plan.tagline}</p>
                    </div>

                    <ul className="mt-7 space-y-3 flex-1">
                      {plan.features.map((f) => (
                        <li key={f} className="flex items-start gap-2.5 text-[14px] text-white/80">
                          <Check size={15} className="text-azure-sky mt-0.5 shrink-0" strokeWidth={2.5} />
                          {f}
                        </li>
                      ))}
                    </ul>

                    <div className="mt-8">
                      <AppleLink href="/register" variant="azure" size="md" className="w-full justify-center">
                        {plan.cta}
                      </AppleLink>
                    </div>
                  </div>
                </Reveal>
              );
            }

            // Starter + Enterprise — light cards
            return (
              <Reveal key={plan.name} as="div" delay={i * 80}>
                <div className="rounded-apple bg-white p-8 ring-1 ring-black/[0.05] flex flex-col h-full">
                  <div className="text-[13px] font-medium text-graphite-muted mb-1">{plan.name}</div>
                  <div className="flex items-end gap-1.5 mt-2 mb-1">
                    {plan.price === "Individuell" ? (
                      <span className="text-[32px] font-semibold tracking-tight text-graphite leading-none">
                        Individuell
                      </span>
                    ) : (
                      <>
                        <span className="text-[44px] font-semibold tracking-tight tabular-nums text-graphite leading-none">
                          {plan.price} &euro;
                        </span>
                        {plan.period && (
                          <span className="text-[14px] text-graphite-muted mb-1">{plan.period}</span>
                        )}
                      </>
                    )}
                  </div>
                  <p className="text-[14px] text-graphite-soft mt-2 leading-[1.5]">{plan.tagline}</p>

                  <ul className="mt-7 space-y-3 flex-1">
                    {plan.features.map((f) => (
                      <li key={f} className="flex items-start gap-2.5 text-[14px] text-graphite-soft">
                        <Check size={15} className="text-azure mt-0.5 shrink-0" strokeWidth={2.5} />
                        {f}
                      </li>
                    ))}
                  </ul>

                  <div className="mt-8">
                    <AppleLink
                      href={plan.name === "Enterprise" ? "/register" : "/register"}
                      variant="soft"
                      size="md"
                      className="w-full justify-center"
                    >
                      {plan.cta}
                    </AppleLink>
                  </div>
                </div>
              </Reveal>
            );
          })}
        </div>

        {/* footnote */}
        <Reveal as="p" className="mt-8 text-center text-[13px] text-graphite-muted">
          Stripe-Zahlung bald verfügbar. &middot; Alle Pläne inkl. 14 Tage kostenlos testen.
        </Reveal>
      </div>
    </section>
  );
};

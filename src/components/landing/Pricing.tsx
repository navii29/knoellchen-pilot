import Link from "next/link";
import { FadeUp } from "./FadeUp";

const plans = [
  {
    name: "Starter",
    price: "249",
    tagline: "Für Vermietungen, die Strafzettel, Verträge und Schadendokumentation automatisieren wollen.",
    limit: "Bis zu 15 Fahrzeuge",
    features: [
      "Strafzettel-Automatisierung (KI-Auslesen, Anschreiben, Rechnung)",
      "Übergabe & Schadenerkennung (Computer Vision)",
      "Vertragsverwaltung & Kalender",
      "Kunden- und Führerschein-Scan",
      "5.000 KI-Auslesungen / Monat",
      "E-Mail Support",
      "— Tablet-Unterschrift und Kundenportal erst ab Professional",
    ],
    cta: "Starter wählen",
    featured: false,
  },
  {
    name: "Professional",
    price: "449",
    tagline: "Für wachsende Vermietungen, die alles in einer App wollen.",
    limit: "Bis zu 50 Fahrzeuge",
    features: [
      "Alles aus Starter, plus:",
      "Self-Service Kundenportal",
      "Digitale Vertragsunterschrift",
      "Dynamische Preisoptimierung",
      "KI-Sprachassistent",
      "Flottenkalender mit Aussteuerungs-Alerts",
      "LexOffice & Echoes Integrationen",
      "20.000 KI-Auslesungen / Monat",
      "Priorisierter Support",
    ],
    cta: "Professional wählen",
    featured: true,
  },
  {
    name: "Enterprise",
    price: "699",
    tagline: "Für große Flotten mit individuellen Anforderungen.",
    limit: "Unbegrenzt Fahrzeuge",
    features: [
      "Alles aus Professional, plus:",
      "Unbegrenzte KI-Auslesungen",
      "Mehrere Standorte / Mandanten",
      "REST-API & Webhooks",
      "Custom Onboarding & Schulung",
      "SLA nach Vereinbarung",
      "Dedizierter Account Manager",
    ],
    cta: "Vertrieb kontaktieren",
    featured: false,
  },
];

export const Pricing = () => {
  return (
    <section id="pricing" className="bg-white py-20 sm:py-28 lg:py-36">
      <div className="max-w-7xl mx-auto px-4 sm:px-8 lg:px-12">
        <FadeUp>
          <div className="text-center max-w-3xl mx-auto mb-10 sm:mb-16">
            <div className="inline-flex items-center gap-2 px-3 h-7 rounded-full bg-stone-100 ring-1 ring-black/[0.04] text-[12px] text-stone-600 mb-5">
              Preise
            </div>
            <h2 className="font-display text-stone-900 text-[32px] sm:text-[48px] lg:text-[68px] leading-[1.05] tracking-[-0.03em] font-medium text-balance">
              Transparente Preise. Keine Überraschungen.
            </h2>
            <p className="mt-4 text-[15px] sm:text-[17px] text-stone-600 leading-relaxed">
              Keine versteckten Kosten. Keine Setup-Gebühren. Jederzeit
              kündbar.
            </p>
          </div>
        </FadeUp>

        <div className="grid lg:grid-cols-3 gap-4 lg:gap-0 lg:rounded-3xl lg:overflow-hidden lg:ring-1 lg:ring-black/[0.06]">
          {plans.map((plan, i) => {
            const featured = plan.featured;
            return (
              <FadeUp key={plan.name} delay={i * 80}>
                <div
                  className={`h-full rounded-3xl lg:rounded-none p-6 sm:p-8 lg:p-10 flex flex-col ${
                    featured
                      ? "bg-black text-white order-first lg:order-none lg:scale-[1.02] lg:my-[-8px] lg:rounded-3xl lg:ring-1 lg:ring-white/10 relative z-10 shadow-2xl"
                      : "bg-stone-50 lg:bg-white text-stone-900"
                  }`}
                >
                  {featured && (
                    <div className="inline-flex self-start items-center gap-1.5 px-2.5 h-6 rounded-full bg-gradient-to-r from-teal-400 to-emerald-400 text-black text-[11px] font-semibold mb-5">
                      ★ Beliebt
                    </div>
                  )}
                  <div
                    className={`text-[14px] font-medium mb-2 ${
                      featured ? "text-white/60" : "text-stone-500"
                    }`}
                  >
                    {plan.name}
                  </div>
                  <div className="flex items-baseline gap-1.5">
                    <span
                      className={`text-[14px] ${
                        featured ? "text-white/50" : "text-stone-400"
                      }`}
                    >
                      €
                    </span>
                    <span className="font-display text-[52px] sm:text-[60px] lg:text-[64px] tracking-[-0.04em] font-medium leading-none">
                      {plan.price}
                    </span>
                    <span
                      className={`text-[14px] ${
                        featured ? "text-white/50" : "text-stone-400"
                      }`}
                    >
                      / Monat
                    </span>
                  </div>
                  <div
                    className={`text-[13.5px] mt-2 ${
                      featured ? "text-white/60" : "text-stone-500"
                    }`}
                  >
                    {plan.tagline}
                  </div>
                  <div
                    className={`mt-5 inline-flex self-start items-center px-2.5 h-6 rounded-full text-[12px] font-medium ${
                      featured
                        ? "bg-white/10 text-white ring-1 ring-white/15"
                        : "bg-stone-200/70 text-stone-700"
                    }`}
                  >
                    {plan.limit}
                  </div>

                  <ul className="mt-7 space-y-3 flex-1">
                    {plan.features.map((f) => (
                      <li
                        key={f}
                        className={`flex items-start gap-2.5 text-[14px] ${
                          featured ? "text-white/85" : "text-stone-700"
                        }`}
                      >
                        <span
                          className={`mt-0.5 w-4 h-4 rounded-full flex items-center justify-center shrink-0 ${
                            featured
                              ? "bg-emerald-400/20 text-emerald-300"
                              : "bg-teal-100 text-teal-700"
                          }`}
                        >
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                        </span>
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>

                  <Link
                    href="/register"
                    className={`mt-8 inline-flex w-full sm:w-auto items-center justify-center h-12 sm:h-11 px-5 rounded-full text-[14.5px] sm:text-[14px] font-medium transition-colors ${
                      featured
                        ? "bg-white text-black hover:bg-white/90"
                        : "bg-stone-900 text-white hover:bg-stone-800"
                    }`}
                  >
                    {plan.cta}
                  </Link>
                </div>
              </FadeUp>
            );
          })}
        </div>

        <FadeUp delay={300}>
          <div className="text-center mt-10 text-[13.5px] text-stone-500">
            Alle Preise zzgl. MwSt. · 30 Tage kostenlos testen · Keine Kreditkarte
          </div>
        </FadeUp>
      </div>
    </section>
  );
};

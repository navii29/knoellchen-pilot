import Link from "next/link";
import { Check, Minus } from "lucide-react";
import { FadeUp } from "./FadeUp";
import { BOOKING_URL } from "@/lib/links";

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
      "E-Mail-Support",
      "— Tablet-Unterschrift und Kundenportal erst ab Professional",
    ],
    cta: "Starter wählen",
    href: "/register",
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
      "Digitale Vertragsunterschrift am Tablet",
      "Dynamische Preisoptimierung",
      "KI-Sprachassistent",
      "Flottenkalender mit Aussteuerungs-Alerts",
      "LexOffice-Integration für die Buchhaltung",
      "20.000 KI-Auslesungen / Monat",
      "Priorisierter Support",
    ],
    cta: "Professional wählen",
    href: "/register",
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
    href: BOOKING_URL,
    featured: false,
  },
];

const FeatureRow = ({ text, featured }: { text: string; featured: boolean }) => {
  if (text.startsWith("Alles aus")) {
    return (
      <li className={`text-[13px] font-medium ${featured ? "text-zinc-400" : "text-zinc-500"}`}>
        {text}
      </li>
    );
  }
  if (text.startsWith("—")) {
    return (
      <li className={`flex items-start gap-2.5 text-[13.5px] ${featured ? "text-zinc-500" : "text-zinc-400"}`}>
        <Minus size={16} className="mt-0.5 shrink-0 text-zinc-400" strokeWidth={2.25} />
        <span>{text.replace(/^—\s*/, "")}</span>
      </li>
    );
  }
  return (
    <li className={`flex items-start gap-2.5 text-[14px] ${featured ? "text-zinc-700" : "text-zinc-700"}`}>
      <Check size={16} className="mt-0.5 shrink-0 text-indigo-600" strokeWidth={2.5} />
      <span>{text}</span>
    </li>
  );
};

export const Pricing = () => {
  return (
    <section id="pricing" className="bg-zinc-50 border-t border-zinc-200 py-20 sm:py-28">
      <div className="max-w-6xl mx-auto px-5 sm:px-8">
        <FadeUp>
          <div className="max-w-2xl mb-12">
            <div className="text-[12px] font-semibold uppercase tracking-[0.09em] text-indigo-600 mb-4">
              Preise
            </div>
            <h2 className="text-[30px] sm:text-[42px] leading-[1.08] tracking-[-0.03em] font-semibold text-zinc-950 text-balance">
              Transparente Preise. Keine Überraschungen.
            </h2>
            <p className="mt-4 text-[16px] text-zinc-600 leading-relaxed">
              Keine Setup-Gebühren, monatlich kündbar, 30 Tage kostenlos testen.
            </p>
          </div>
        </FadeUp>

        <div className="grid lg:grid-cols-3 gap-5 items-start">
          {plans.map((plan, i) => {
            const featured = plan.featured;
            return (
              <FadeUp key={plan.name} delay={i * 70}>
                <div
                  className={`h-full rounded-2xl bg-white p-7 sm:p-8 flex flex-col ${
                    featured
                      ? "ring-2 ring-indigo-600 shadow-[0_24px_60px_-30px_rgba(79,70,229,0.45)]"
                      : "ring-1 ring-zinc-200"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="text-[15px] font-semibold text-zinc-900">{plan.name}</div>
                    {featured && (
                      <span className="text-[11px] font-semibold text-indigo-700 bg-indigo-50 ring-1 ring-indigo-100 rounded-full px-2.5 h-6 inline-flex items-center">
                        Beliebt
                      </span>
                    )}
                  </div>

                  <div className="mt-4 flex items-baseline gap-1">
                    <span className="text-[15px] text-zinc-400">€</span>
                    <span className="text-[48px] sm:text-[52px] font-semibold tracking-[-0.04em] text-zinc-950 leading-none tabular-nums">
                      {plan.price}
                    </span>
                    <span className="text-[14px] text-zinc-400">/ Monat</span>
                  </div>

                  <div className="mt-2 text-[13.5px] text-zinc-500 leading-snug">{plan.tagline}</div>

                  <div className="mt-5 inline-flex self-start items-center px-2.5 h-6 rounded-full bg-zinc-100 text-zinc-600 text-[12px] font-medium">
                    {plan.limit}
                  </div>

                  <ul className="mt-7 space-y-3 flex-1">
                    {plan.features.map((f) => (
                      <FeatureRow key={f} text={f} featured={featured} />
                    ))}
                  </ul>

                  <Link
                    href={plan.href}
                    {...(plan.href.startsWith("http") ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                    className={`mt-8 inline-flex w-full items-center justify-center h-11 px-5 rounded-lg text-[14.5px] font-medium transition-colors ${
                      featured
                        ? "bg-indigo-600 text-white hover:bg-indigo-500"
                        : "bg-white ring-1 ring-zinc-300 text-zinc-900 hover:bg-zinc-50"
                    }`}
                  >
                    {plan.cta}
                  </Link>
                </div>
              </FadeUp>
            );
          })}
        </div>

        <FadeUp delay={250}>
          <div className="mt-8 text-[13px] text-zinc-500">
            Alle Preise zzgl. MwSt. · 30 Tage kostenlos testen · Keine Kreditkarte erforderlich
          </div>
        </FadeUp>
      </div>
    </section>
  );
};

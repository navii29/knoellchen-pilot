import Link from "next/link";
import { Check } from "lucide-react";
import { THEME } from "@/lib/theme";
import { FadeUp } from "./FadeUp";

const tiers = [
  {
    name: "Starter",
    price: 99,
    desc: "Für kleine Vermietungen",
    limit: "Bis 10 Strafzettel / Monat",
    features: ["Automatische OCR", "Fahrer-Zuordnung", "3 Dokumentvorlagen", "E-Mail-Support"],
  },
  {
    name: "Pro",
    price: 249,
    desc: "Am beliebtesten",
    limit: "Bis 50 Strafzettel / Monat",
    features: [
      "Alles aus Starter",
      "Automatische Mahnungen",
      "Eigene Briefkopf-Vorlagen",
      "Priorisierter Support",
      "API-Zugang",
    ],
    recommended: true,
  },
  {
    name: "Business",
    price: 499,
    desc: "Für große Flotten",
    limit: "Unbegrenzte Strafzettel",
    features: [
      "Alles aus Pro",
      "Multi-Standort",
      "SSO & Audit-Log",
      "Dedizierter Account-Manager",
      "SLA 99,9 %",
    ],
  },
];

export const Pricing = () => (
  <section id="preise" className="relative border-t border-stone-200 bg-stone-50">
    <div className="max-w-6xl mx-auto px-6 py-24 md:py-32">
      <FadeUp>
        <div className="text-xs uppercase tracking-widest text-stone-500 mb-3">Preise</div>
        <h2 className="font-display text-4xl md:text-5xl font-bold tracking-tight max-w-3xl text-balance">
          Faire Preise.
          <br />
          Jeder Fall refinanziert sich selbst.
        </h2>
        <p className="mt-5 text-lg text-stone-600 max-w-2xl">
          Mit 25 € Bearbeitungsgebühr pro Fall rechnet sich Knöllchen-Pilot ab dem 4. Strafzettel im Monat.
        </p>
      </FadeUp>
      <div className="mt-14 grid md:grid-cols-3 gap-5">
        {tiers.map((t, i) => (
          <FadeUp key={t.name} delay={i * 80}>
            <div
              className={`relative rounded-2xl p-7 h-full flex flex-col ${
                t.recommended ? "bg-stone-950 text-stone-100 ring-1 ring-stone-950" : "bg-white ring-1 ring-stone-200"
              }`}
            >
              {t.recommended && (
                <span
                  className="absolute -top-3 left-7 text-[10px] uppercase tracking-wider font-semibold px-2.5 py-1 rounded-full text-white"
                  style={{ background: THEME.primary }}
                >
                  Empfohlen
                </span>
              )}
              <div className="flex items-baseline justify-between">
                <div className="font-display font-bold text-2xl">{t.name}</div>
                <div className={`text-xs ${t.recommended ? "text-stone-400" : "text-stone-500"}`}>{t.desc}</div>
              </div>
              <div className="mt-6 flex items-baseline gap-1">
                <span className="font-display font-extrabold text-5xl tracking-tight">{t.price} €</span>
                <span className={`text-sm ${t.recommended ? "text-stone-400" : "text-stone-500"}`}>/ Monat</span>
              </div>
              <div className={`mt-2 text-sm ${t.recommended ? "text-stone-300" : "text-stone-600"}`}>{t.limit}</div>
              <ul
                className={`mt-6 space-y-2.5 text-sm flex-1 ${t.recommended ? "text-stone-200" : "text-stone-700"}`}
              >
                {t.features.map((f) => (
                  <li key={f} className="flex items-start gap-2.5">
                    <Check
                      size={15}
                      style={{ color: t.recommended ? THEME.primaryLight : THEME.primary }}
                      className="mt-0.5"
                    />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
              <Link
                href="/register"
                className={`mt-7 w-full py-3 rounded-lg font-semibold text-sm text-center ${
                  t.recommended ? "text-stone-900 bg-white hover:bg-stone-100" : "text-white"
                }`}
                style={!t.recommended ? { background: THEME.primary } : {}}
              >
                {t.recommended ? "Pro starten" : `${t.name} starten`}
              </Link>
            </div>
          </FadeUp>
        ))}
      </div>
      <FadeUp delay={300}>
        <div className="mt-10 flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-sm text-stone-500">
          {[
            "30 Tage gratis testen",
            "Monatlich kündbar",
            "Rechnung auf Firma",
            "DSGVO-konform",
          ].map((x) => (
            <span key={x} className="inline-flex items-center gap-1.5">
              <Check size={14} className="text-emerald-600" /> {x}
            </span>
          ))}
        </div>
      </FadeUp>
    </div>
  </section>
);

import Link from "next/link";
import { ArrowRight, Check } from "lucide-react";
import { THEME } from "@/lib/theme";
import { FadeUp } from "./FadeUp";

export const Hero = () => (
  <section className="relative overflow-hidden">
    <div className="absolute inset-0 grid-bg opacity-60 pointer-events-none" />
    <div
      className="absolute -top-40 -right-40 w-[560px] h-[560px] rounded-full blur-3xl opacity-20 pointer-events-none"
      style={{ background: THEME.primary }}
    />
    <div className="relative max-w-6xl mx-auto px-6 pt-20 pb-24 md:pt-28 md:pb-32">
      <div className="max-w-3xl">
        <FadeUp>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white ring-1 ring-stone-200 text-xs font-medium text-stone-700 shadow-sm">
            <span className="relative inline-flex w-1.5 h-1.5 rounded-full text-emerald-500 pulse-dot">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
            </span>
            Für Autovermietungen in Deutschland
          </div>
        </FadeUp>
        <FadeUp delay={80}>
          <h1 className="mt-6 font-display font-extrabold text-[64px] md:text-[88px] leading-[0.92] tracking-tight">
            Strafzettel?
            <br />
            <span style={{ color: THEME.primary }}>Erledigt.</span>
          </h1>
        </FadeUp>
        <FadeUp delay={160}>
          <p className="mt-7 text-xl md:text-2xl text-stone-600 leading-snug max-w-2xl text-balance">
            Die KI-Software, die Strafzettel für Autovermietungen vollautomatisch
            bearbeitet — von der E-Mail der Behörde bis zum Zeugenfragebogen
            zurück.
          </p>
        </FadeUp>
        <FadeUp delay={240}>
          <div className="mt-10 flex flex-col sm:flex-row gap-3">
            <Link
              href="/register"
              className="inline-flex items-center gap-1.5 text-white px-5 py-3 rounded-xl text-sm font-semibold shadow-sm"
              style={{ background: THEME.primary }}
            >
              Kostenlos testen <ArrowRight size={14} />
            </Link>
            <div className="flex items-center gap-5 text-sm text-stone-500 px-2">
              <span className="inline-flex items-center gap-1.5">
                <Check size={14} className="text-emerald-600" /> 30 Tage gratis
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Check size={14} className="text-emerald-600" /> Keine Kreditkarte
              </span>
            </div>
          </div>
        </FadeUp>

        <FadeUp delay={320}>
          <div className="mt-14 grid grid-cols-3 gap-8 max-w-xl">
            <div>
              <div className="font-display text-3xl font-bold">30 s</div>
              <div className="text-sm text-stone-500 mt-1">
                pro Strafzettel
                <br />
                statt 45 Minuten
              </div>
            </div>
            <div>
              <div className="font-display text-3xl font-bold">98,6%</div>
              <div className="text-sm text-stone-500 mt-1">
                OCR-Genauigkeit
                <br />
                beim Auslesen
              </div>
            </div>
            <div>
              <div className="font-display text-3xl font-bold">+25 €</div>
              <div className="text-sm text-stone-500 mt-1">
                Gebühr pro Fall
                <br />
                weiterbelastet
              </div>
            </div>
          </div>
        </FadeUp>
      </div>

      <FadeUp delay={400}>
        <div className="mt-20 pt-8 border-t border-stone-200">
          <div className="text-xs uppercase tracking-widest text-stone-400 mb-5">
            Vertrauen von über 120 Autovermietungen
          </div>
          <div className="flex flex-wrap items-center gap-x-10 gap-y-4 text-stone-400">
            {["Stadtflotte München", "Alpenrent", "RhineCars", "NordMobil", "Bayern-Auto", "CityDrive GmbH"].map(
              (n) => (
                <span key={n} className="font-display font-semibold text-lg">
                  {n}
                </span>
              )
            )}
          </div>
        </div>
      </FadeUp>
    </div>
  </section>
);

import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";
import { THEME } from "@/lib/theme";

export const FooterCTA = () => (
  <section className="relative border-t border-stone-200">
    <div className="max-w-6xl mx-auto px-6 py-24 md:py-32">
      <div
        className="relative rounded-3xl overflow-hidden p-10 md:p-16 text-white"
        style={{ background: THEME.primary }}
      >
        <div
          className="absolute -top-32 -right-32 w-[500px] h-[500px] rounded-full"
          style={{ background: "rgba(255,255,255,0.08)" }}
        />
        <div
          className="absolute -bottom-24 -left-24 w-[320px] h-[320px] rounded-full"
          style={{ background: "rgba(255,255,255,0.06)" }}
        />
        <div className="relative max-w-2xl">
          <div className="font-display text-4xl md:text-6xl font-extrabold tracking-tight leading-[1]">
            Starten Sie jetzt.
            <br />
            <span className="opacity-80">30 Tage kostenlos.</span>
          </div>
          <p className="mt-6 text-lg opacity-90 max-w-xl">
            Keine Kreditkarte. Einrichtung in 15 Minuten. Der erste Strafzettel läuft noch heute durch.
          </p>
          <Link
            href="/register"
            className="mt-10 inline-flex items-center gap-1.5 bg-white text-stone-900 px-5 py-3 rounded-xl text-sm font-semibold"
          >
            Kostenlos testen <ArrowRight size={14} />
          </Link>
        </div>
      </div>
    </div>
    <div className="max-w-6xl mx-auto px-6 pb-10 pt-4 flex flex-wrap items-center justify-between gap-4 text-sm text-stone-500">
      <div className="flex items-center gap-2">
        <div
          className="w-6 h-6 rounded-md flex items-center justify-center"
          style={{ background: THEME.primary }}
        >
          <Sparkles size={12} className="text-white" />
        </div>
        <span className="font-display font-semibold text-stone-700">Knöllchen-Pilot</span>
        <span className="text-stone-400">· © 2026</span>
      </div>
      <div className="flex items-center gap-6">
        <a href="#" className="hover:text-stone-900">Impressum</a>
        <a href="#" className="hover:text-stone-900">Datenschutz</a>
        <a href="#" className="hover:text-stone-900">AGB</a>
        <a href="#" className="hover:text-stone-900">Kontakt</a>
      </div>
    </div>
  </section>
);

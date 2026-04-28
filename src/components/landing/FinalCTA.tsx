import Link from "next/link";
import { FadeUp } from "./FadeUp";

export const FinalCTA = () => {
  return (
    <section className="relative bg-black overflow-hidden py-32 sm:py-44">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[1100px] h-[700px] rounded-full bg-[radial-gradient(circle_at_center,rgba(20,184,166,0.25),transparent_60%)] blur-3xl" />
        <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-white/15 to-transparent" />
      </div>

      <div className="relative max-w-4xl mx-auto px-6 lg:px-10 text-center">
        <FadeUp>
          <h2 className="font-display text-white text-[40px] sm:text-[64px] lg:text-[84px] leading-[1.02] tracking-[-0.035em] font-medium text-balance">
            Bereit für die Zukunft
            <br />
            <span className="bg-gradient-to-br from-teal-200 via-emerald-300 to-teal-500 bg-clip-text text-transparent">
              Ihrer Vermietung?
            </span>
          </h2>
        </FadeUp>

        <FadeUp delay={120}>
          <p className="mt-7 text-[18px] sm:text-[20px] text-white/60 max-w-xl mx-auto leading-[1.5]">
            30 Tage kostenlos. Keine Kreditkarte. Volle Funktionalität.
          </p>
        </FadeUp>

        <FadeUp delay={200}>
          <div className="mt-10 flex flex-col sm:flex-row gap-3 items-center justify-center">
            <Link
              href="/register"
              className="inline-flex items-center justify-center h-13 px-7 rounded-full bg-white text-black text-[15px] font-medium hover:bg-white/90 transition-colors shadow-[0_8px_30px_-8px_rgba(255,255,255,0.4)] min-h-[52px]"
            >
              Jetzt starten
            </Link>
            <Link
              href="/login"
              className="inline-flex items-center justify-center h-13 px-7 rounded-full bg-white/5 ring-1 ring-white/10 text-white text-[15px] font-medium hover:bg-white/10 transition-colors min-h-[52px]"
            >
              Demo anfragen
            </Link>
          </div>
        </FadeUp>

        <FadeUp delay={280}>
          <div className="mt-12 flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-[12.5px] text-white/40">
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              DSGVO-konform
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              EU-Hosting
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              Monatlich kündbar
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              Deutscher Support
            </span>
          </div>
        </FadeUp>
      </div>
    </section>
  );
};

import Link from "next/link";
import { FadeUp } from "./FadeUp";
import { BOOKING_URL } from "@/lib/links";

export const FinalCTA = () => {
  return (
    <section className="relative bg-black overflow-hidden py-24 sm:py-44">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[1100px] h-[700px] rounded-full bg-[radial-gradient(circle_at_center,rgba(20,184,166,0.25),transparent_60%)] blur-3xl" />
        <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-white/15 to-transparent" />
      </div>

      <div className="relative max-w-4xl mx-auto px-4 sm:px-8 lg:px-12 text-center">
        <FadeUp>
          <h2
            className="font-display text-white leading-[1.02] tracking-[-0.035em] font-medium text-balance"
            style={{ fontSize: "clamp(34px, 9vw, 84px)" }}
          >
            Sehen Sie es,
            <br />
            <span className="bg-gradient-to-br from-teal-200 via-emerald-300 to-teal-500 bg-clip-text text-transparent">
              statt es zu lesen.
            </span>
          </h2>
        </FadeUp>

        <FadeUp delay={120}>
          <p className="mt-5 sm:mt-7 text-[15px] sm:text-[20px] text-white/60 max-w-xl mx-auto leading-[1.5]">
            In 30 Sekunden kostenlos starten — oder sich Knöllchen-Pilot in
            einem 30-Minuten-Call vom Gründer an Ihrem Fall zeigen lassen.
          </p>
        </FadeUp>

        <FadeUp delay={200}>
          <div className="mt-8 sm:mt-10 flex flex-col sm:flex-row gap-3 items-center justify-center">
            <Link
              href="/register"
              className="w-full sm:w-auto inline-flex items-center justify-center h-[52px] px-7 rounded-full bg-white text-black text-[15px] font-medium hover:bg-white/90 transition-colors shadow-[0_8px_30px_-8px_rgba(255,255,255,0.4)]"
            >
              30 Tage gratis testen
            </Link>
            <a
              href={BOOKING_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full sm:w-auto inline-flex items-center justify-center h-[52px] px-7 rounded-full bg-white/5 ring-1 ring-white/10 text-white text-[15px] font-medium hover:bg-white/10 transition-colors"
            >
              Oder: Demo mit dem Gründer
            </a>
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
              EU-Datenspeicherung
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

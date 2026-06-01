import { FadeUp } from "./FadeUp";
import { BOOKING_URL } from "@/lib/links";

export const Testimonial = () => {
  return (
    <section className="relative bg-black overflow-hidden py-28 sm:py-40">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[900px] h-[900px] rounded-full bg-[radial-gradient(circle_at_center,rgba(20,184,166,0.18),transparent_60%)] blur-3xl" />
      </div>

      <div className="relative max-w-4xl mx-auto px-6 lg:px-10 text-center">
        <FadeUp>
          <div className="inline-flex items-center gap-2 px-3 h-7 rounded-full bg-emerald-500/10 ring-1 ring-emerald-500/30 text-[12px] text-emerald-300 mb-8">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Pilotphase
          </div>
        </FadeUp>

        <FadeUp delay={80}>
          <h2 className="font-display text-white text-[28px] sm:text-[40px] lg:text-[52px] leading-[1.15] tracking-[-0.025em] font-medium text-balance">
            Wir bauen Knöllchen-Pilot{" "}
            <span className="bg-gradient-to-br from-teal-200 to-emerald-400 bg-clip-text text-transparent">
              gemeinsam mit Vermietungen
            </span>{" "}
            aus DACH.
          </h2>
        </FadeUp>

        <FadeUp delay={160}>
          <p className="mt-6 max-w-2xl mx-auto text-white/60 text-[15px] sm:text-[17px] leading-relaxed">
            Aktuell arbeiten wir eng mit ausgewählten Pilot-Kunden, die uns
            sagen, was sie wirklich brauchen — und uns vor Konzept-Tools
            schützen, die in der Werkstatt nicht funktionieren. Wenn Ihre
            Vermietung dabei sein möchte: Wir nehmen weiter Piloten auf.
          </p>
        </FadeUp>

        <FadeUp delay={240}>
          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-3">
            <a
              href={BOOKING_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center h-11 px-6 rounded-full bg-white text-black text-[14.5px] font-medium hover:bg-white/90 transition-colors"
            >
              Pilot werden
            </a>
            <a
              href="#features"
              className="inline-flex items-center justify-center h-11 px-6 rounded-full bg-white/5 ring-1 ring-white/10 text-white text-[14.5px] font-medium hover:bg-white/10 transition-colors"
            >
              Erst Funktionen ansehen
            </a>
          </div>
        </FadeUp>
      </div>
    </section>
  );
};

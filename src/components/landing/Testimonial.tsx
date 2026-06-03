import Link from "next/link";
import { FadeUp } from "./FadeUp";
import { BOOKING_URL } from "@/lib/links";

export const Testimonial = () => {
  return (
    <section className="bg-white border-t border-zinc-100 py-20 sm:py-28">
      <div className="max-w-3xl mx-auto px-5 sm:px-8 text-center">
        <FadeUp>
          <div className="inline-flex items-center gap-2 text-[12px] font-semibold uppercase tracking-[0.09em] text-indigo-600 mb-5">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-600" />
            Pilotphase
          </div>
        </FadeUp>

        <FadeUp delay={70}>
          <h2 className="text-[28px] sm:text-[38px] leading-[1.12] tracking-[-0.025em] font-semibold text-zinc-950 text-balance">
            Wir bauen Knöllchen-Pilot gemeinsam mit Vermietungen aus DACH.
          </h2>
        </FadeUp>

        <FadeUp delay={140}>
          <p className="mt-5 text-[16px] sm:text-[17px] leading-relaxed text-zinc-600 max-w-2xl mx-auto">
            Aktuell arbeiten wir eng mit ausgewählten Pilot-Kunden, die uns
            sagen, was sie wirklich brauchen — und uns vor Konzept-Tools
            schützen, die in der Werkstatt nicht funktionieren. Wenn Ihre
            Vermietung dabei sein möchte: Wir nehmen weiter Piloten auf.
          </p>
        </FadeUp>

        <FadeUp delay={210}>
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href="/register"
              className="inline-flex items-center justify-center h-11 px-5 rounded-lg bg-indigo-600 text-white text-[15px] font-medium hover:bg-indigo-500 transition-colors"
            >
              30 Tage kostenlos testen
            </Link>
            <a
              href={BOOKING_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center h-11 px-5 rounded-lg bg-white ring-1 ring-zinc-300 text-zinc-800 text-[15px] font-medium hover:bg-zinc-50 transition-colors"
            >
              Pilot werden
            </a>
          </div>
        </FadeUp>
      </div>
    </section>
  );
};

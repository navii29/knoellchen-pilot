import Link from "next/link";
import { FadeUp } from "./FadeUp";
import { BOOKING_URL } from "@/lib/links";

const trust = [
  "DSGVO-konform aufgebaut",
  "EU-Datenspeicherung",
  "Monatlich kündbar",
  "Deutscher Support",
];

export const FinalCTA = () => {
  return (
    <section className="bg-zinc-950 text-white py-24 sm:py-32">
      <div className="max-w-3xl mx-auto px-5 sm:px-8 text-center">
        <FadeUp>
          <h2 className="text-[34px] sm:text-[52px] leading-[1.05] tracking-[-0.03em] font-semibold text-white text-balance">
            In 30 Sekunden startklar.
          </h2>
        </FadeUp>

        <FadeUp delay={80}>
          <p className="mt-5 text-[17px] sm:text-[19px] text-zinc-400 max-w-xl mx-auto leading-relaxed">
            Kostenlos testen — oder sich Knöllchen-Pilot in einem
            30-Minuten-Call vom Gründer an Ihrem konkreten Fall zeigen lassen.
          </p>
        </FadeUp>

        <FadeUp delay={160}>
          <div className="mt-9 flex flex-col sm:flex-row gap-3 items-center justify-center">
            <Link
              href="/register"
              className="w-full sm:w-auto inline-flex items-center justify-center h-12 px-6 rounded-lg bg-white text-zinc-950 text-[15px] font-medium hover:bg-zinc-100 transition-colors"
            >
              30 Tage kostenlos testen
            </Link>
            <a
              href={BOOKING_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full sm:w-auto inline-flex items-center justify-center h-12 px-6 rounded-lg bg-white/10 ring-1 ring-white/15 text-white text-[15px] font-medium hover:bg-white/15 transition-colors"
            >
              Demo mit dem Gründer
            </a>
          </div>
        </FadeUp>

        <FadeUp delay={240}>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-x-2 gap-y-2 text-[13px] text-zinc-500">
            {trust.map((t, i) => (
              <span key={t} className="inline-flex items-center gap-2">
                {i > 0 && <span aria-hidden className="text-zinc-700">·</span>}
                {t}
              </span>
            ))}
          </div>
        </FadeUp>
      </div>
    </section>
  );
};

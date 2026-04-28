import { FadeUp } from "./FadeUp";

export const Testimonial = () => {
  return (
    <section className="relative bg-black overflow-hidden py-32 sm:py-44">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[900px] h-[900px] rounded-full bg-[radial-gradient(circle_at_center,rgba(20,184,166,0.18),transparent_60%)] blur-3xl" />
      </div>

      <div className="relative max-w-5xl mx-auto px-6 lg:px-10 text-center">
        <FadeUp>
          <svg
            width="44"
            height="34"
            viewBox="0 0 24 18"
            fill="none"
            className="mx-auto mb-10 text-white/30"
          >
            <path
              d="M0 18V8.4C0 4.6 1 2.55 3.6 1.05L7.65 0L8.55 2.4C5.85 3.45 4.5 5.55 4.65 8.4H7.65V18H0ZM13.05 18V8.4C13.05 4.6 14.05 2.55 16.65 1.05L20.7 0L21.6 2.4C18.9 3.45 17.55 5.55 17.7 8.4H20.7V18H13.05Z"
              fill="currentColor"
            />
          </svg>
        </FadeUp>

        <FadeUp delay={80}>
          <blockquote className="font-display text-white text-[30px] sm:text-[44px] lg:text-[56px] leading-[1.15] tracking-[-0.025em] font-medium text-balance">
            „Wir haben vorher{" "}
            <span className="text-white/50">30 Minuten</span> pro Strafzettel
            gebraucht. Jetzt sind es{" "}
            <span className="bg-gradient-to-br from-teal-200 to-emerald-400 bg-clip-text text-transparent">
              30 Sekunden
            </span>
            .“
          </blockquote>
        </FadeUp>

        <FadeUp delay={200}>
          <div className="mt-12 flex items-center justify-center gap-4">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-amber-300 via-pink-400 to-violet-500 ring-2 ring-white/10" />
            <div className="text-left">
              <div className="text-white text-[15px] font-medium">Oliver S.</div>
              <div className="text-white/50 text-[13px]">
                Geschäftsführer · Eazycar GmbH
              </div>
            </div>
          </div>
        </FadeUp>
      </div>
    </section>
  );
};

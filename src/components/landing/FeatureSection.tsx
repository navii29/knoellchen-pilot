import type { ReactNode } from "react";
import { FadeUp } from "./FadeUp";

export const FeatureSection = ({
  variant = "light",
  eyebrow,
  title,
  description,
  bullets,
  mockup,
  side = "right",
  id,
}: {
  variant?: "light" | "dark";
  eyebrow: string;
  title: ReactNode;
  description: ReactNode;
  bullets?: string[];
  mockup: ReactNode;
  side?: "left" | "right";
  id?: string;
}) => {
  const dark = variant === "dark";
  return (
    <section
      id={id}
      className={`${
        dark ? "bg-black text-white" : "bg-white text-stone-900"
      } py-28 sm:py-36 overflow-hidden`}
    >
      <div className="max-w-7xl mx-auto px-6 lg:px-10">
        <div
          className={`grid lg:grid-cols-2 gap-14 lg:gap-20 items-center ${
            side === "left" ? "lg:[&>*:first-child]:order-2" : ""
          }`}
        >
          <FadeUp>
            <div className="max-w-xl">
              <div
                className={`inline-flex items-center gap-2 px-3 h-7 rounded-full text-[12px] mb-6 ${
                  dark
                    ? "bg-white/5 ring-1 ring-white/10 text-white/70"
                    : "bg-stone-100 ring-1 ring-black/[0.04] text-stone-600"
                }`}
              >
                {eyebrow}
              </div>
              <h2
                className={`font-display text-[36px] sm:text-[48px] lg:text-[58px] leading-[1.05] tracking-[-0.03em] font-medium text-balance ${
                  dark ? "text-white" : "text-stone-900"
                }`}
              >
                {title}
              </h2>
              <div
                className={`mt-6 text-[17px] leading-[1.55] ${
                  dark ? "text-white/60" : "text-stone-600"
                }`}
              >
                {description}
              </div>
              {bullets && bullets.length > 0 && (
                <ul className="mt-8 space-y-3">
                  {bullets.map((b) => (
                    <li
                      key={b}
                      className={`flex items-start gap-3 text-[15px] ${
                        dark ? "text-white/80" : "text-stone-700"
                      }`}
                    >
                      <span
                        className={`mt-1.5 w-1.5 h-1.5 rounded-full shrink-0 ${
                          dark ? "bg-emerald-400" : "bg-teal-600"
                        }`}
                      />
                      <span>{b}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </FadeUp>

          <FadeUp delay={120}>
            <div className="relative">
              {/* radial accent behind mockup */}
              <div
                className={`pointer-events-none absolute -inset-12 rounded-full blur-3xl ${
                  dark
                    ? "bg-[radial-gradient(circle,rgba(45,212,191,0.18),transparent_60%)]"
                    : "bg-[radial-gradient(circle,rgba(45,212,191,0.12),transparent_60%)]"
                }`}
              />
              <div className="relative">{mockup}</div>
            </div>
          </FadeUp>
        </div>
      </div>
    </section>
  );
};

import type { ReactNode } from "react";
import { Check } from "lucide-react";
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
        dark ? "bg-zinc-950 text-white" : "bg-white text-zinc-950"
      } py-20 sm:py-28 border-t ${dark ? "border-white/10" : "border-zinc-100"}`}
    >
      <div className="max-w-6xl mx-auto px-5 sm:px-8">
        <div
          className={`grid lg:grid-cols-2 gap-12 lg:gap-16 items-center ${
            side === "left" ? "lg:[&>*:first-child]:order-2" : ""
          }`}
        >
          <FadeUp className="order-2 lg:order-none">
            <div className="max-w-lg">
              <div
                className={`inline-flex items-center gap-2 text-[12px] font-semibold uppercase tracking-[0.09em] mb-5 ${
                  dark ? "text-indigo-300" : "text-indigo-600"
                }`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-current" />
                {eyebrow}
              </div>
              <h2
                className={`text-[28px] sm:text-[34px] lg:text-[40px] leading-[1.1] tracking-[-0.025em] font-semibold ${
                  dark ? "text-white" : "text-zinc-950"
                }`}
              >
                {title}
              </h2>
              <div
                className={`mt-4 text-[16px] sm:text-[17px] leading-[1.6] ${
                  dark ? "text-zinc-400" : "text-zinc-600"
                }`}
              >
                {description}
              </div>
              {bullets && bullets.length > 0 && (
                <ul className="mt-7 space-y-3">
                  {bullets.map((b) => (
                    <li
                      key={b}
                      className={`flex items-start gap-3 text-[15px] ${
                        dark ? "text-zinc-300" : "text-zinc-700"
                      }`}
                    >
                      <Check
                        size={18}
                        strokeWidth={2.5}
                        className={`mt-0.5 shrink-0 ${dark ? "text-indigo-400" : "text-indigo-600"}`}
                      />
                      <span>{b}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </FadeUp>

          <FadeUp delay={100} className="order-1 lg:order-none">
            <div className="relative">{mockup}</div>
          </FadeUp>
        </div>
      </div>
    </section>
  );
};

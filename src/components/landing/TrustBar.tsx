import { FadeUp } from "./FadeUp";

const stats: Array<[string, string]> = [
  ["30 Sek.", "pro Strafzettel — vom Foto zum versandfertigen PDF."],
  ["95 %", "KI-Genauigkeit beim Auslesen deutscher Bußgeldbescheide."],
  ["2 Cent", "pro Auslesung. Mehr kostet die KI-Verarbeitung nicht."],
];

export const TrustBar = () => {
  return (
    <section className="bg-stone-50 border-y border-black/[0.05]">
      <div className="max-w-7xl mx-auto px-4 sm:px-8 lg:px-12 py-14 sm:py-28">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-10 sm:gap-8 divide-y divide-stone-200/70 sm:divide-y-0">
          {stats.map(([number, label], i) => (
            <FadeUp key={number} delay={i * 80}>
              <div className="text-center sm:text-left pt-10 first:pt-0 sm:pt-0">
                <div
                  className="font-display text-stone-900 leading-none tracking-[-0.04em] font-medium"
                  style={{ fontSize: "clamp(48px, 12vw, 88px)" }}
                >
                  {number}
                </div>
                <div className="mt-3 sm:mt-4 text-[14px] sm:text-[15px] leading-relaxed text-stone-600 max-w-[28ch] mx-auto sm:mx-0 text-balance">
                  {label}
                </div>
              </div>
            </FadeUp>
          ))}
        </div>
      </div>
    </section>
  );
};

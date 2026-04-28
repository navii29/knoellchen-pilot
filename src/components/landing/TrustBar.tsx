import { FadeUp } from "./FadeUp";

const stats: Array<[string, string]> = [
  ["30 Sek.", "pro Strafzettel — vom Foto zum versandfertigen PDF."],
  ["95 %", "KI-Genauigkeit beim Auslesen deutscher Bußgeldbescheide."],
  ["2 Cent", "pro Auslesung. Mehr kostet die KI-Verarbeitung nicht."],
];

export const TrustBar = () => {
  return (
    <section className="bg-stone-50 border-y border-black/[0.05]">
      <div className="max-w-7xl mx-auto px-6 lg:px-10 py-20 sm:py-28">
        <div className="grid sm:grid-cols-3 gap-12 sm:gap-8">
          {stats.map(([number, label], i) => (
            <FadeUp key={number} delay={i * 80}>
              <div className="text-center sm:text-left">
                <div className="font-display text-stone-900 text-[56px] sm:text-[72px] lg:text-[88px] leading-none tracking-[-0.04em] font-medium">
                  {number}
                </div>
                <div className="mt-4 text-[15px] leading-relaxed text-stone-600 max-w-[20ch] mx-auto sm:mx-0 text-balance">
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

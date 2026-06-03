import { FadeUp } from "./FadeUp";

const stats: Array<[string, string]> = [
  ["30 Sek.", "pro Strafzettel — vom Foto zum versandfertigen PDF."],
  ["20 Fotos", `Vorher/Nachher per Computer Vision. Streit um „war das schon vorher?" entfällt.`],
  ["1 App", "für Verträge, Übergaben, Flotte und Strafzettel — statt fünf Excel-Tabellen."],
];

export const TrustBar = () => {
  return (
    <section className="bg-zinc-50 border-y border-zinc-200">
      <div className="max-w-6xl mx-auto px-5 sm:px-8 py-14 sm:py-16">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-10 sm:gap-12">
          {stats.map(([number, label], i) => (
            <FadeUp key={number} delay={i * 70}>
              <div>
                <div className="text-[40px] sm:text-[48px] font-semibold tracking-[-0.035em] text-zinc-950 leading-none tabular-nums">
                  {number}
                </div>
                <div className="mt-3 text-[14.5px] leading-relaxed text-zinc-600 max-w-[32ch]">
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

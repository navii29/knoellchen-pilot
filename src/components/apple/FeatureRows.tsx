import { ArrowRight } from "lucide-react";
import { Reveal } from "./Reveal";

const Stat = ({ k, v }: { k: string; v: string }) => (
  <div>
    <div className="text-[28px] font-semibold tracking-tight text-graphite tabular-nums">{v}</div>
    <div className="text-[12.5px] text-graphite-muted mt-0.5">{k}</div>
  </div>
);

export const FeatureRows = () => {
  return (
    <section className="bg-white">
      <div className="max-w-[1080px] mx-auto px-5 py-24 sm:py-28 space-y-24 sm:space-y-32">
        {/* Row 1 — weiterbelastung */}
        <Reveal as="div" className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          <div>
            <div className="text-[13px] font-medium text-azure-link mb-3">Automatisch</div>
            <h2 className="apple-display text-[32px] sm:text-[44px] text-graphite max-w-[15ch]">
              Jeder Strafzettel, an den richtigen Mieter belastet.
            </h2>
            <p className="mt-5 text-[17px] leading-[1.5] text-graphite-soft max-w-[46ch]">
              Die Tatzeit trifft auf den Mietvertrag — und Knöllchen-Pilot weiß sofort, wer
              gefahren ist. Anschreiben, Rechnung und Gebühr entstehen von selbst.
            </p>
            <a href="#preise" className="mt-6 inline-flex items-center gap-1.5 text-[16px] text-azure-link hover:opacity-70">
              Preise ansehen <ArrowRight size={16} />
            </a>
            <div className="mt-9 flex gap-10">
              <Stat v="7 Min" k="gespart pro Fall" />
              <Stat v="98%" k="automatisch zugeordnet" />
            </div>
          </div>

          {/* visual: the re-bill flow */}
          <div className="rounded-apple bg-mist p-6 sm:p-8 ring-1 ring-black/[0.05]">
            <div className="space-y-3">
              <div className="flex items-center justify-between rounded-2xl bg-white p-4 ring-1 ring-black/[0.05]">
                <span className="inline-flex items-center rounded-md bg-white ring-1 ring-black/10 px-2 h-6 font-semibold text-[13px] text-graphite">
                  B·MK 2041
                </span>
                <span className="text-[13px] text-graphite-muted">12.05. · 14:32</span>
              </div>
              <div className="flex justify-center text-graphite-muted">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M19 12l-7 7-7-7" /></svg>
              </div>
              <div className="flex items-center justify-between rounded-2xl bg-white p-4 ring-1 ring-black/[0.05]">
                <span className="text-[14px] text-graphite">Mieter · M. Krause</span>
                <span className="text-[12px] text-azure font-medium">zugeordnet</span>
              </div>
              <div className="flex items-center justify-between rounded-2xl bg-graphite p-4 text-white">
                <span className="text-[14px]">Weiterbelastung</span>
                <span className="text-[15px] font-semibold tabular-nums">80,00 €</span>
              </div>
            </div>
          </div>
        </Reveal>

        {/* Row 2 — dynamic pricing */}
        <Reveal as="div" className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          <div className="lg:order-2">
            <div className="text-[13px] font-medium text-azure-link mb-3">Mehr Marge</div>
            <h2 className="apple-display text-[32px] sm:text-[44px] text-graphite max-w-[15ch]">
              Preise, die sich an Ihre Auslastung anpassen.
            </h2>
            <p className="mt-5 text-[17px] leading-[1.5] text-graphite-soft max-w-[46ch]">
              Saison, Wochentag, Nachfrage — Knöllchen-Pilot schlägt bei jedem Vertrag den
              optimalen Tagespreis vor. Sie sagen nur Ja.
            </p>
            <a href="#preise" className="mt-6 inline-flex items-center gap-1.5 text-[16px] text-azure-link hover:opacity-70">
              Mehr erfahren <ArrowRight size={16} />
            </a>
          </div>

          {/* visual: occupancy bars */}
          <div className="lg:order-1 rounded-apple bg-mist p-6 sm:p-8 ring-1 ring-black/[0.05]">
            <div className="flex items-end justify-between gap-2 h-44">
              {[40, 55, 48, 70, 88, 96, 82].map((h, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-2">
                  <div className="w-full rounded-t-lg" style={{ height: `${h}%`, background: i >= 4 ? "linear-gradient(180deg,#0894ff,#0071e3)" : "#d6d6d6" }} />
                  <span className="text-[10px] text-graphite-muted">{["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"][i]}</span>
                </div>
              ))}
            </div>
            <div className="mt-5 flex items-center justify-between rounded-2xl bg-white p-4 ring-1 ring-black/[0.05]">
              <span className="text-[13.5px] text-graphite">Empfohlener Preis · Freitag</span>
              <span className="text-[15px] font-semibold text-azure tabular-nums">89 €</span>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
};

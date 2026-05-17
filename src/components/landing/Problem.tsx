import { FadeUp } from "./FadeUp";

const pains: Array<{ title: string; cost: string; body: string }> = [
  {
    title: "Schaden-Streit nach Rückgabe",
    cost: "Bis zu 2.000 €",
    body: `pro Vorfall, den Sie nicht beweisen können. Mieter sagen „war schon vorher" — und ohne dokumentierte Fotos verlieren Sie.`,
  },
  {
    title: "Strafzettel-Bearbeitung von Hand",
    cost: "30 Min × jeder Bescheid",
    body: "Daten abtippen, Mieter zuordnen, drei PDFs erstellen, eintüten, frankieren. Bei 20 Bescheiden im Monat: 10 Stunden, die nichts produzieren.",
  },
  {
    title: "Verträge auf Papier + Excel",
    cost: "5 Tabellen + 1 Aktenschrank",
    body: "Kalender, Mieter-Liste, Fahrzeug-Status, Rechnungen, Schäden — überall andere Wahrheit. Doppelbuchung passiert, sobald Sie nicht aufpassen.",
  },
];

export const Problem = () => {
  return (
    <section className="bg-stone-900 text-white py-20 sm:py-28 lg:py-36">
      <div className="max-w-7xl mx-auto px-4 sm:px-8 lg:px-12">
        <FadeUp>
          <div className="text-center max-w-3xl mx-auto mb-12 sm:mb-20">
            <div className="inline-flex items-center gap-2 px-3 h-7 rounded-full bg-white/5 ring-1 ring-white/10 text-[12px] text-white/60 mb-5">
              Das kostet Sie heute
            </div>
            <h2 className="font-display text-white text-[32px] sm:text-[48px] lg:text-[64px] leading-[1.05] tracking-[-0.03em] font-medium text-balance">
              Vermietung ist Detailarbeit.
              <br />
              <span className="text-white/50">Die Tools dafür sind 1995.</span>
            </h2>
          </div>
        </FadeUp>

        <div className="grid sm:grid-cols-3 gap-4 sm:gap-6">
          {pains.map((p, i) => (
            <FadeUp key={p.title} delay={i * 80}>
              <div className="h-full rounded-2xl bg-white/[0.03] ring-1 ring-white/10 p-6 sm:p-7">
                <div className="font-display text-[26px] sm:text-[32px] tracking-tight font-medium text-rose-300 leading-tight">
                  {p.cost}
                </div>
                <div className="mt-3 text-[15px] font-medium text-white">
                  {p.title}
                </div>
                <p className="mt-2 text-[13.5px] leading-relaxed text-white/55">
                  {p.body}
                </p>
              </div>
            </FadeUp>
          ))}
        </div>

        <FadeUp delay={300}>
          <div className="mt-12 sm:mt-16 text-center text-[14px] sm:text-[15px] text-white/50 max-w-2xl mx-auto leading-relaxed">
            Knöllchen-Pilot löst jeden dieser drei Punkte — in einer Software,
            mit Computer-Vision für Schäden, KI-Auslesen für Strafzettel und
            digitalen Verträgen samt Tablet-Unterschrift.
          </div>
        </FadeUp>
      </div>
    </section>
  );
};

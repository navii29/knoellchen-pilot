import { FadeUp } from "./FadeUp";

const pains: Array<{ title: string; cost: string; body: string }> = [
  {
    title: "Schaden-Streit nach Rückgabe",
    cost: "Bis zu 2.000 €",
    body: `pro Vorfall, den Sie nicht beweisen können. Mieter sagen „war schon vorher" — und ohne dokumentierte Fotos verlieren Sie.`,
  },
  {
    title: "Strafzettel von Hand bearbeiten",
    cost: "30 Min je Bescheid",
    body: "Daten abtippen, Mieter zuordnen, drei PDFs erstellen, eintüten, frankieren. Bei 20 Bescheiden im Monat: 10 Stunden, die nichts produzieren.",
  },
  {
    title: "Verträge auf Papier & Excel",
    cost: "5 Tabellen, 1 Wahrheit fehlt",
    body: "Kalender, Mieter-Liste, Fahrzeug-Status, Rechnungen, Schäden — überall andere Stände. Doppelbuchungen passieren, sobald Sie kurz wegschauen.",
  },
];

export const Problem = () => {
  return (
    <section className="bg-white border-t border-zinc-100 py-20 sm:py-28">
      <div className="max-w-6xl mx-auto px-5 sm:px-8">
        <FadeUp>
          <div className="max-w-2xl">
            <div className="text-[12px] font-semibold uppercase tracking-[0.09em] text-indigo-600 mb-4">
              Das kostet Sie heute
            </div>
            <h2 className="text-[30px] sm:text-[42px] leading-[1.08] tracking-[-0.03em] font-semibold text-zinc-950 text-balance">
              Vermietung ist Detailarbeit. Die Werkzeuge dafür sind von 1995.
            </h2>
          </div>
        </FadeUp>

        <div className="mt-12 grid sm:grid-cols-3 gap-5">
          {pains.map((p, i) => (
            <FadeUp key={p.title} delay={i * 70}>
              <div className="h-full rounded-xl border border-zinc-200 p-6">
                <div className="text-[23px] sm:text-[27px] tracking-[-0.02em] font-semibold text-zinc-950 leading-tight">
                  {p.cost}
                </div>
                <div className="mt-3 text-[15px] font-medium text-zinc-900">{p.title}</div>
                <p className="mt-2 text-[14px] leading-relaxed text-zinc-500">{p.body}</p>
              </div>
            </FadeUp>
          ))}
        </div>

        <FadeUp delay={250}>
          <p className="mt-10 text-[15px] text-zinc-500 max-w-2xl leading-relaxed">
            Knöllchen-Pilot löst alle drei — in einer Software: Computer Vision
            für Schäden, KI-Auslesen für Strafzettel, digitale Verträge mit
            Tablet-Unterschrift.
          </p>
        </FadeUp>
      </div>
    </section>
  );
};

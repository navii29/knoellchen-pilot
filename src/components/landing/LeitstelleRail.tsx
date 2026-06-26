import { Inbox, GitBranch, FileUp, BadgeEuro } from "lucide-react";

const STATIONS = [
  {
    no: "01",
    key: "Neu",
    Icon: Inbox,
    dot: "#B45309",
    title: "Eingang & Auslesen",
    body: "Bescheid landet per Upload oder E-Mail in der Leitstelle. Die Software liest Kennzeichen, Tatzeit, Verstoß und Betrag aus — kein Abtippen.",
  },
  {
    no: "02",
    key: "Zugeordnet",
    Icon: GitBranch,
    dot: "#1D4ED8",
    title: "Fahrer zuordnen",
    body: "Tatzeit trifft auf Mietvertrag: Die Strecke erkennt automatisch, wer das Fahrzeug zum Tatzeitpunkt hatte.",
  },
  {
    no: "03",
    key: "Weiterbelastet",
    Icon: FileUp,
    dot: "#6D28D9",
    title: "Dokumente & Versand",
    body: "Anschreiben, Rechnung und Zeugenfragebogen werden erzeugt und an Mieter sowie Behörde verschickt — mit Ihrer Bearbeitungsgebühr.",
  },
  {
    no: "04",
    key: "Bezahlt",
    Icon: BadgeEuro,
    dot: "#15803D",
    title: "Zahlung & Abschluss",
    body: "Zahlungseingang und Mahnstufen werden getrackt, bis der Vorgang sauber geschlossen ist. Nichts fällt durch.",
  },
];

export const LeitstelleRail = () => {
  return (
    <section id="leitstelle" className="relative bg-void text-on-dark overflow-hidden">
      <div className="absolute inset-0 dot-dark opacity-60" />
      <div className="relative max-w-wide mx-auto px-5 lg:px-8 py-20 lg:py-28">
        <div className="max-w-2xl">
          <span className="kicker text-white/55">Die Strecke</span>
          <h2 className="mt-4 font-display font-extrabold text-white text-[30px] lg:text-[40px] leading-[1.02] tracking-tightest">
            Eine Strecke. Vier Zustände.
            <br />
            <span className="text-white/45">Vom Eingang bis bezahlt.</span>
          </h2>
          <p className="mt-5 text-[16px] leading-relaxed text-white/60">
            Jeder Strafzettel durchläuft dieselbe, nachvollziehbare Strecke. Sie sehen
            jederzeit, wo ein Vorgang steht — und greifen nur ein, wo ein Mensch nötig ist.
          </p>
        </div>

        {/* the rail */}
        <div className="mt-14 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
          {STATIONS.map((s, i) => (
            <div key={s.no} className="relative">
              {/* connector */}
              {i < STATIONS.length - 1 && (
                <div className="hidden lg:block absolute top-[22px] left-[calc(100%-6px)] w-5 h-px bg-gradient-to-r from-white/25 to-transparent" />
              )}
              <div className="h-full rounded-frame border border-hairline-dark bg-void-800/60 p-5 hover:bg-void-700/60 transition-colors">
                <div className="flex items-center justify-between">
                  <span
                    className="inline-flex items-center justify-center w-11 h-11 rounded-panel border border-hairline-dark"
                    style={{ background: "rgba(255,255,255,0.03)" }}
                  >
                    <s.Icon size={18} className="text-white/85" strokeWidth={1.75} />
                  </span>
                  <span className="font-mono text-[11px] tracking-widest text-white/30">{s.no}</span>
                </div>
                <div className="mt-4 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full" style={{ background: s.dot }} />
                  <span className="font-mono text-[10.5px] uppercase tracking-widest text-white/45">{s.key}</span>
                </div>
                <h3 className="mt-2 font-display font-bold text-[17px] text-white tracking-tight">{s.title}</h3>
                <p className="mt-2 text-[13.5px] leading-relaxed text-white/55">{s.body}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

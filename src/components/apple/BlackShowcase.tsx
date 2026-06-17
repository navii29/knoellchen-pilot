import { ScanLine, FileSignature, Camera } from "lucide-react";
import { Reveal } from "./Reveal";

const CARDS = [
  {
    Icon: ScanLine,
    title: "KI liest jeden Bescheid",
    body: "Kennzeichen, Tatzeit, Verstoß und Betrag — in Sekunden ausgelesen und dem richtigen Mieter zugeordnet.",
  },
  {
    Icon: FileSignature,
    title: "Verträge & E-Signatur",
    body: "Mietverträge digital erstellen, unterschreiben und rechtssicher archivieren. Ganz ohne Drucker.",
  },
  {
    Icon: Camera,
    title: "Übergabe & Schäden",
    body: "Zustand mit Fotos dokumentieren, Schäden festhalten — lückenlos vom Auszug bis zur Rückgabe.",
  },
];

export const BlackShowcase = () => {
  return (
    <section id="funktionen" className="relative mesh-dark text-white overflow-hidden">
      <div className="relative max-w-[1080px] mx-auto px-5 py-24 sm:py-32">
        {/* left-aligned header — sets up the section as a statement, not a centered card wall */}
        <Reveal as="div" className="max-w-[640px]">
          <div className="inline-flex items-center gap-2 text-[13px] text-white/55 mb-5">
            <span className="w-1.5 h-1.5 rounded-full bg-azure-sky" /> Und es hört beim Strafzettel nicht auf
          </div>
          <h2 className="apple-display text-[32px] sm:text-[48px] lg:text-[56px] text-white max-w-[18ch]">
            Wenn der Papierkram eh digital ist, machen Sie gleich weiter.
          </h2>
          <p className="mt-5 text-[18px] sm:text-[20px] leading-[1.45] text-white/60 max-w-[48ch]">
            Verträge mit E-Signatur, Fahrzeugübergabe mit Fotos, Schadensberichte —
            derselbe Mietvertrag, den Knöllchen-Pilot für die Weiterbelastung nutzt, trägt
            auch den Rest Ihres Betriebs.
          </p>
        </Reveal>

        {/* Capabilities as editorial columns under a hairline rule — no icon-in-gradient-circle
            tiles, no identical floating cards. Reads as a spec sheet, not a SaaS-starter grid. */}
        <div className="mt-16 grid gap-x-10 gap-y-12 sm:grid-cols-3">
          {CARDS.map((c, i) => (
            <Reveal key={c.title} as="div" delay={i * 90}>
              <div className="border-t border-white/15 pt-5">
                <div className="flex items-center gap-3">
                  <c.Icon size={20} className="text-azure-sky shrink-0" strokeWidth={1.75} />
                  <span className="text-[12px] font-medium tabular-nums text-white/35">
                    0{i + 1}
                  </span>
                </div>
                <h3 className="mt-4 text-[19px] font-semibold tracking-tight text-white">{c.title}</h3>
                <p className="mt-2.5 text-[14.5px] leading-[1.55] text-white/55">{c.body}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
};

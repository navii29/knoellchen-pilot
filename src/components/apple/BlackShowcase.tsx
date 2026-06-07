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
      <div className="relative max-w-[1080px] mx-auto px-5 py-24 sm:py-32 text-center">
        <Reveal as="div">
          <div className="inline-flex items-center gap-2 text-[13px] text-white/55 mb-5">
            <span className="w-1.5 h-1.5 rounded-full bg-azure-sky" /> Eine Plattform
          </div>
          <h2 className="apple-display text-[34px] sm:text-[52px] lg:text-[60px] text-white mx-auto max-w-[16ch]">
            Der ganze Betrieb,
            <br className="hidden sm:block" /> an einem Ort.
          </h2>
          <p className="mt-5 text-[18px] sm:text-[20px] leading-[1.45] text-white/60 max-w-[44ch] mx-auto">
            Schluss mit dem Flickenteppich aus Tools. Knöllchen-Pilot verbindet jeden
            Schritt zu einem ruhigen, durchgängigen Ablauf.
          </p>
        </Reveal>

        <div className="mt-14 grid gap-5 sm:grid-cols-3 text-left">
          {CARDS.map((c, i) => (
            <Reveal key={c.title} as="div" delay={i * 90}>
              <div className="h-full glass-dark rounded-apple p-7">
                <span
                  className="inline-flex items-center justify-center w-12 h-12 rounded-2xl mb-5"
                  style={{ background: "linear-gradient(135deg, rgba(8,148,255,0.25), rgba(134,104,255,0.25))" }}
                >
                  <c.Icon size={22} className="text-white" strokeWidth={1.75} />
                </span>
                <h3 className="text-[19px] font-semibold tracking-tight text-white">{c.title}</h3>
                <p className="mt-2.5 text-[14.5px] leading-[1.55] text-white/55">{c.body}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
};

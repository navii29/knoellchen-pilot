import { FeatureSection } from "./FeatureSection";
import { BrowserFrame } from "./BrowserFrame";

const Mock = () => (
  <BrowserFrame url="app.knoellchen-pilot.de/contracts">
    <div className="p-5 text-[11px]">
      <div className="flex items-center justify-between mb-4">
        <div>
          <div className="text-[14px] font-semibold text-stone-900 leading-tight">
            Mietverträge
          </div>
          <div className="text-[10.5px] text-stone-500">
            April 2026 · 28 aktive Verträge
          </div>
        </div>
        <div className="px-2.5 h-7 rounded-md bg-teal-600 text-white text-[10.5px] flex items-center font-medium">
          + Neuer Vertrag
        </div>
      </div>

      {/* Calendar grid */}
      <div className="rounded-lg ring-1 ring-black/[0.06] overflow-hidden">
        <div className="grid grid-cols-[110px_repeat(14,1fr)] bg-stone-50 border-b border-black/[0.06]">
          <div className="px-2.5 py-1.5 text-[9.5px] uppercase tracking-wide text-stone-500 font-medium">
            Fahrzeug
          </div>
          {Array.from({ length: 14 }).map((_, i) => (
            <div
              key={i}
              className={`text-center py-1.5 text-[9.5px] font-mono ${
                i === 6 || i === 7
                  ? "text-teal-700 bg-teal-50/60 font-semibold"
                  : "text-stone-500"
              }`}
            >
              {15 + i}
            </div>
          ))}
        </div>
        {[
          ["VW Golf", "M-AB 1234", 0, 5, "S. Müller", "blue"],
          ["BMW 3er", "B-CD 5678", 3, 7, "T. Schmidt", "violet"],
          ["Audi A4", "F-EF 9012", 6, 10, "L. Weber", "emerald"],
          ["Tesla M3", "K-GH 3456", 8, 13, "M. Wagner", "teal"],
          ["VW Polo", "M-IJ 7890", 1, 3, "P. Becker", "amber"],
        ].map((row, i) => (
          <div
            key={i}
            className="grid grid-cols-[110px_repeat(14,1fr)] border-b border-black/[0.04] last:border-0 h-9"
          >
            <div className="px-2.5 flex flex-col justify-center">
              <span className="text-[10.5px] text-stone-900 font-medium leading-none truncate">
                {row[0]}
              </span>
              <span className="text-[9.5px] text-stone-500 font-mono mt-0.5">{row[1]}</span>
            </div>
            <div className="col-span-14 relative">
              <div
                className={`absolute top-1.5 bottom-1.5 rounded-md flex items-center px-2 text-[9.5px] font-medium text-white ${
                  row[5] === "blue"
                    ? "bg-blue-500"
                    : row[5] === "violet"
                    ? "bg-violet-500"
                    : row[5] === "emerald"
                    ? "bg-emerald-500"
                    : row[5] === "teal"
                    ? "bg-teal-600"
                    : "bg-amber-500"
                }`}
                style={{
                  left: `${((row[2] as number) / 14) * 100}%`,
                  width: `${(((row[3] as number) - (row[2] as number)) / 14) * 100}%`,
                }}
              >
                {row[4]}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Smart suggestion */}
      <div className="mt-3 flex items-center gap-2.5 px-3 h-9 rounded-md bg-teal-50 ring-1 ring-teal-200/60 text-[10.5px] text-teal-900">
        <span className="w-4 h-4 rounded-full bg-teal-600 text-white flex items-center justify-center text-[9px] font-bold">
          KI
        </span>
        <span className="flex-1">
          Audi A4 ist morgen frei — perfekt für Anfrage von <b>Familie Lang</b>.
        </span>
        <span className="text-teal-700 font-medium">Vorschlagen →</span>
      </div>
    </div>
  </BrowserFrame>
);

export const FeatureContracts = () => (
  <FeatureSection
    variant="light"
    eyebrow="Vertragsverwaltung"
    title={
      <>
        Mietverträge.
        <br />
        <span className="text-stone-400">Digital. Intelligent.</span>
      </>
    }
    description="Verträge per PDF hochladen oder direkt anlegen — die KI extrahiert alle Daten, ordnet sie dem Kunden zu und zeigt jeden Vertrag in einer eleganten Kalenderansicht. Kein doppeltes Buchen mehr, keine vergessenen Rückgaben."
    bullets={[
      "Bestehende Verträge per Drag & Drop digitalisieren",
      "Gantt-Kalender mit Live-Belegung über die ganze Flotte",
      "Konflikt-Warnungen bei Doppelbelegung in Echtzeit",
      "Smart-Vorschläge: Welches Auto passt zur Anfrage?",
    ]}
    mockup={<Mock />}
    side="left"
  />
);

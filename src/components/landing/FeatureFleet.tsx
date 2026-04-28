import { FeatureSection } from "./FeatureSection";
import { BrowserFrame } from "./BrowserFrame";

const Mock = () => (
  <BrowserFrame url="app.knoellchen-pilot.de/fleet" variant="dark">
    <div className="p-5 text-[11px]">
      <div className="flex items-center justify-between mb-4">
        <div>
          <div className="text-[14px] font-semibold text-white leading-tight">
            Flottenübersicht
          </div>
          <div className="text-[10.5px] text-white/40">
            34 Fahrzeuge · 28 vermietet · 4 frei · 2 in Wartung
          </div>
        </div>
        <div className="flex gap-1.5">
          {["KW 17", "KW 18", "KW 19"].map((kw, i) => (
            <span
              key={kw}
              className={`px-2 h-6 rounded text-[10px] flex items-center ${
                i === 1
                  ? "bg-teal-500 text-black font-medium"
                  : "bg-white/[0.06] text-white/60 ring-1 ring-white/[0.08]"
              }`}
            >
              {kw}
            </span>
          ))}
        </div>
      </div>

      {/* Status row */}
      <div className="grid grid-cols-4 gap-2 mb-4">
        {[
          ["Vermietet", "28", "emerald"],
          ["Frei", "4", "blue"],
          ["Wartung", "2", "amber"],
          ["Aussteuern", "1", "red"],
        ].map(([l, v, c]) => (
          <div
            key={l as string}
            className="rounded-md bg-white/[0.03] ring-1 ring-white/[0.06] p-2.5"
          >
            <div className="flex items-center gap-1.5 mb-1">
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  c === "emerald"
                    ? "bg-emerald-400"
                    : c === "blue"
                    ? "bg-blue-400"
                    : c === "amber"
                    ? "bg-amber-400"
                    : "bg-red-400"
                }`}
              />
              <span className="text-[9.5px] uppercase tracking-wide text-white/50">
                {l}
              </span>
            </div>
            <div className="text-[18px] font-semibold tabular-nums text-white leading-none">
              {v}
            </div>
          </div>
        ))}
      </div>

      {/* Gantt chart */}
      <div className="rounded-md bg-white/[0.02] ring-1 ring-white/[0.06] overflow-hidden">
        <div className="grid grid-cols-[140px_repeat(7,1fr)] h-7 border-b border-white/[0.06] text-[9.5px] text-white/40 font-mono">
          <div className="px-2.5 flex items-center">FAHRZEUG</div>
          {["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"].map((d, i) => (
            <div
              key={d}
              className={`text-center flex items-center justify-center ${
                i === 2 ? "text-teal-400 bg-teal-500/[0.06]" : ""
              }`}
            >
              {d}
            </div>
          ))}
        </div>
        {[
          ["VW Golf VIII", "M-AB 1234", 0, 4, "S. Müller", "blue"],
          ["BMW 320d", "B-CD 5678", 2, 6, "T. Schmidt", "violet"],
          ["Audi A4", "F-EF 9012", 1, 3, "L. Weber", "emerald"],
          ["Tesla Model 3", "K-GH 3456", 4, 7, "M. Wagner", "teal"],
          ["VW Polo GTI", "M-IJ 7890", 0, 2, "P. Becker", "amber"],
          ["MB E-Klasse", "S-KL 1100", 0, 0, "WARTUNG", "red"],
        ].map((row, i) => (
          <div
            key={i}
            className="grid grid-cols-[140px_repeat(7,1fr)] border-b border-white/[0.04] last:border-0 h-9"
          >
            <div className="px-2.5 flex flex-col justify-center">
              <span className="text-[10.5px] text-white font-medium leading-none truncate">
                {row[0]}
              </span>
              <span className="text-[9.5px] text-white/40 font-mono mt-0.5">{row[1]}</span>
            </div>
            <div className="col-span-7 relative">
              {row[5] === "red" ? (
                <div className="absolute inset-1.5 rounded-md bg-red-500/15 ring-1 ring-red-500/40 flex items-center justify-center text-[9.5px] text-red-300 font-medium">
                  In Wartung — Reifenwechsel
                </div>
              ) : (
                <div
                  className={`absolute top-1.5 bottom-1.5 rounded-md flex items-center px-2 text-[9.5px] font-medium text-white ${
                    row[5] === "blue"
                      ? "bg-blue-500"
                      : row[5] === "violet"
                      ? "bg-violet-500"
                      : row[5] === "emerald"
                      ? "bg-emerald-500"
                      : row[5] === "teal"
                      ? "bg-teal-500 text-black"
                      : "bg-amber-500"
                  }`}
                  style={{
                    left: `${((row[2] as number) / 7) * 100}%`,
                    width: `${(((row[3] as number) - (row[2] as number)) / 7) * 100}%`,
                  }}
                >
                  {row[4]}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-3 flex items-center gap-2.5 px-3 h-9 rounded-md bg-amber-500/10 ring-1 ring-amber-500/20 text-[10.5px] text-amber-200">
        <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
        <span className="flex-1">
          MB E-Klasse: Aussteuerung empfohlen (235.000 km, Inspektion fällig)
        </span>
        <span className="text-amber-300 font-medium">Details →</span>
      </div>
    </div>
  </BrowserFrame>
);

export const FeatureFleet = () => (
  <FeatureSection
    variant="dark"
    eyebrow="Flottenübersicht & Kalender"
    title={
      <>
        Wer hat welches Auto?
        <br />
        <span className="text-white/40">Auf einen Blick.</span>
      </>
    }
    description="Eine einzige Ansicht für deine ganze Flotte: Wer fährt was, was ist frei, was steht in der Werkstatt. Knöllchen-Pilot warnt bei nahenden Inspektionen, schlägt Aussteuerungen vor und macht aus Excel-Chaos ein Cockpit."
    bullets={[
      "Live-Kalender für alle Fahrzeuge — Tag, Woche, Monat",
      "Statusübersicht: Vermietet, frei, Wartung, Reklamation",
      "Aussteuerungs-Alerts anhand Kilometerstand und Alter",
      "Direkter Sprung von Kalender zu Vertrag oder Strafzettel",
    ]}
    mockup={<Mock />}
    side="right"
  />
);

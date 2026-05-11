import { FeatureSection } from "./FeatureSection";
import { BrowserFrame } from "./BrowserFrame";

const PricingMock = () => (
  <BrowserFrame variant="dark" url="app.knoellchen-pilot.de/dashboard">
    <div className="p-5 text-[11px] text-white">
      <div className="flex items-center justify-between mb-4">
        <div>
          <div className="text-[14px] font-semibold leading-tight">
            Preisempfehlung heute
          </div>
          <div className="text-[10.5px] text-white/50">
            Freitag, 31.07.2026 · 4 von 12 Fahrzeuge frei
          </div>
        </div>
        <div className="px-2 h-6 rounded-md bg-white/[0.06] ring-1 ring-white/10 text-[10px] text-white/70 flex items-center gap-1">
          ★ KI · 3 Regeln aktiv
        </div>
      </div>

      {/* Cards grid */}
      <div className="grid grid-cols-2 gap-2">
        {[
          {
            plate: "M-AV 5678",
            label: "VW Polo",
            price: "82,50",
            pct: "+50%",
            level: "high",
          },
          {
            plate: "M-OL 1001",
            label: "BMW 3er",
            price: "118,80",
            pct: "+32%",
            level: "high",
          },
          {
            plate: "M-KP 2847",
            label: "Audi A4",
            price: "95,00",
            pct: "+25%",
            level: "warn",
          },
          {
            plate: "F-EF 9012",
            label: "VW Golf",
            price: "55,00",
            pct: "0%",
            level: "ok",
          },
        ].map((c) => {
          const tone =
            c.level === "high"
              ? { bg: "rgba(220,38,38,0.12)", ring: "rgba(254,202,202,0.3)", color: "#fca5a5" }
              : c.level === "warn"
              ? { bg: "rgba(202,138,4,0.12)", ring: "rgba(253,224,71,0.25)", color: "#fde68a" }
              : { bg: "rgba(22,163,74,0.12)", ring: "rgba(187,247,208,0.25)", color: "#bbf7d0" };
          return (
            <div
              key={c.plate}
              className="rounded-lg p-3"
              style={{
                background: tone.bg,
                boxShadow: `inset 0 0 0 1px ${tone.ring}`,
              }}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <div className="font-mono text-[9.5px] text-white/70">
                    {c.plate}
                  </div>
                  <div className="text-[10px] text-white/60 truncate">
                    {c.label}
                  </div>
                </div>
                <div className="text-right">
                  <div
                    className="font-display text-[18px] tracking-tight font-medium leading-none tabular-nums"
                    style={{ color: tone.color }}
                  >
                    {c.price}
                    <span className="text-[8px] ml-0.5 opacity-70">€</span>
                  </div>
                  {c.pct !== "0%" && (
                    <div
                      className="text-[9.5px] tabular-nums mt-0.5"
                      style={{ color: tone.color }}
                    >
                      {c.pct}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Active rules */}
      <div className="mt-4 rounded-lg ring-1 ring-white/10 bg-white/[0.03] p-3">
        <div className="text-[9.5px] uppercase tracking-wider text-white/40 font-semibold mb-2">
          Aktive Regeln
        </div>
        <div className="space-y-1.5">
          {[
            { name: "Hochsaison Sommer", val: "+15%", type: "Saison" },
            { name: "Wochenende", val: "+10%", type: "Fr–So" },
            { name: "Hohe Auslastung", val: "+25%", type: "<3 Autos frei" },
          ].map((r) => (
            <div
              key={r.name}
              className="flex items-center gap-2 text-[10px]"
            >
              <span className="px-1.5 h-4 rounded bg-white/[0.06] text-white/60 text-[9px] font-medium">
                {r.type}
              </span>
              <span className="text-white/85 flex-1 truncate">{r.name}</span>
              <span className="font-mono text-rose-300 font-semibold">
                {r.val}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  </BrowserFrame>
);

export const FeatureDynamicPricing = () => (
  <FeatureSection
    variant="dark"
    eyebrow="Dynamische Preisoptimierung"
    title={
      <>
        Der richtige Preis.
        <br />
        <span className="text-white/40">Automatisch.</span>
      </>
    }
    description="Wie Airlines und Hotels — Knöllchen-Pilot schlägt den optimalen Mietpreis vor, basierend auf Auslastung, Saison und Wochentag. Freitag im Juli, nur noch 2 Autos frei? Preis geht automatisch hoch."
    bullets={[
      "Saison-, Wochentag- und Nachfrage-Regeln frei kombinierbar",
      "Live-Empfehlung bei jeder Vertragsanlage — Übernahme mit einem Klick",
      "Dashboard-Widget zeigt täglich die Empfehlungen für die ganze Flotte",
      "Mehrtägige Mietzeiträume werden tagesgenau berechnet und gemittelt",
    ]}
    mockup={<PricingMock />}
    side="left"
  />
);

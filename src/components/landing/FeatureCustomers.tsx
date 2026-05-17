import { FeatureSection } from "./FeatureSection";
import { BrowserFrame } from "./BrowserFrame";

// Stilisierter EU-Führerschein (Karte 85.6 × 54 mm → Aspect 1.585).
// Pure CSS, kein externes Bild — passt zu Anna Bauer (rechte Form).
const LicenseCard = () => (
  <div className="relative aspect-[1.585/1] rounded-xl overflow-hidden ring-1 ring-black/10 shadow-md bg-gradient-to-br from-rose-200 via-pink-100 to-amber-50">
    {/* Wasserzeichen-Streifen */}
    <div className="absolute inset-0 bg-[repeating-linear-gradient(45deg,transparent_0,transparent_8px,rgba(255,255,255,0.25)_8px,rgba(255,255,255,0.25)_9px)]" />
    {/* Header */}
    <div className="absolute top-1.5 left-2 right-2 flex items-center justify-between">
      <div className="text-[7.5px] font-semibold tracking-wide text-stone-700 leading-tight">
        FÜHRERSCHEIN
        <div className="text-[6px] font-normal opacity-70">
          BUNDESREPUBLIK DEUTSCHLAND
        </div>
      </div>
      {/* EU-Flagge: blauer Kreis + Sterne + D */}
      <div className="relative w-7 h-7 rounded-full bg-[#003399] flex items-center justify-center shrink-0">
        {Array.from({ length: 12 }).map((_, i) => {
          const angle = (i * 30 - 90) * (Math.PI / 180);
          const r = 11;
          const x = Math.cos(angle) * r + 14;
          const y = Math.sin(angle) * r + 14;
          return (
            <span
              key={i}
              className="absolute text-[5px] text-[#FFCC00] leading-none"
              style={{ left: x - 2, top: y - 2 }}
            >
              ★
            </span>
          );
        })}
        <span className="text-white text-[7.5px] font-bold relative z-10">D</span>
      </div>
    </div>

    {/* Foto-Slot + Felder */}
    <div className="absolute top-7 left-2 right-2 bottom-2 grid grid-cols-[28%_1fr] gap-2">
      {/* Foto */}
      <div className="rounded-md bg-stone-200/80 ring-1 ring-stone-300/80 flex items-center justify-center overflow-hidden">
        <svg viewBox="0 0 32 40" className="w-8 h-10 text-stone-400">
          <circle cx="16" cy="13" r="6.5" fill="currentColor" />
          <path
            d="M 4 38 Q 4 24 16 24 Q 28 24 28 38 Z"
            fill="currentColor"
          />
        </svg>
      </div>

      {/* Felder mit nummerierten Labels */}
      <div className="text-[6.5px] leading-[1.25] text-stone-800 space-y-[1px] font-mono">
        <div>
          <span className="opacity-50">1.</span>{" "}
          <span className="font-semibold tracking-wide">BAUER</span>
        </div>
        <div>
          <span className="opacity-50">2.</span> Anna
        </div>
        <div>
          <span className="opacity-50">3.</span> 14.07.1989 · München
        </div>
        <div className="flex gap-2">
          <span>
            <span className="opacity-50">4a.</span> 12.03.2008
          </span>
          <span>
            <span className="opacity-50">4b.</span> 11.03.2023
          </span>
        </div>
        <div>
          <span className="opacity-50">5.</span> K07HHX9MZ4
        </div>
        <div className="flex gap-2 pt-0.5">
          <span>
            <span className="opacity-50">9.</span>{" "}
            <span className="font-semibold">B</span>
          </span>
          <span>
            <span className="opacity-50">10.</span> 12.03.2008
          </span>
        </div>
      </div>
    </div>

    {/* OCR-Highlights: dezent über den erkannten Feldern */}
    <div className="absolute top-[40%] left-[32%] w-[40%] h-[10%] rounded-sm ring-2 ring-teal-500/80 bg-teal-400/15" />
    <div className="absolute top-[52%] left-[32%] w-[28%] h-[10%] rounded-sm ring-2 ring-teal-500/80 bg-teal-400/15" />
    <div className="absolute top-[64%] left-[32%] w-[55%] h-[10%] rounded-sm ring-2 ring-teal-500/80 bg-teal-400/15" />

    <div className="absolute bottom-1 right-1.5 px-1.5 h-4 rounded bg-black/70 text-white text-[7.5px] flex items-center font-mono">
      0,8s OCR
    </div>
  </div>
);

const Mock = () => (
  <BrowserFrame url="app.knoellchen-pilot.de/customers/new">
    <div className="p-5 text-[11px]">
      <div className="flex items-center justify-between mb-4">
        <div>
          <div className="text-[14px] font-semibold text-stone-900 leading-tight">
            Neuen Kunden anlegen
          </div>
          <div className="text-[10.5px] text-stone-500">
            Führerschein scannen für automatische Erfassung
          </div>
        </div>
        <span className="px-2.5 h-6 rounded bg-emerald-100 text-emerald-700 text-[10px] font-medium flex items-center gap-1.5 ring-1 ring-emerald-200">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          Verifiziert
        </span>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* Echter EU-Führerschein-Mockup */}
        <LicenseCard />

        {/* Extracted form */}
        <div className="space-y-2.5">
          {[
            ["Name", "Anna Bauer"],
            ["Geburtsdatum", "14.07.1989"],
            ["Adresse", "Lindenstr. 24, 80333 München"],
            ["FS-Klasse", "B · seit 12.03.2008"],
            ["FS-Nummer", "K07HHX9MZ4"],
          ].map(([label, value]) => (
            <div key={label}>
              <div className="text-[9.5px] uppercase tracking-wide text-stone-500 font-medium mb-0.5">
                {label}
              </div>
              <div className="px-2.5 h-7 rounded-md bg-stone-50 ring-1 ring-black/[0.05] flex items-center text-[10.5px] text-stone-900 justify-between">
                <span>{value}</span>
                <span className="text-emerald-600 text-[9.5px]">✓</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between gap-2 pt-3 border-t border-black/[0.05]">
        <div className="text-[10.5px] text-stone-500">
          5 Felder erkannt · 0 manuell ergänzt
        </div>
        <div className="flex gap-2">
          <span className="px-3 h-8 rounded-md bg-stone-100 text-stone-700 text-[10.5px] flex items-center font-medium ring-1 ring-black/[0.05]">
            Bearbeiten
          </span>
          <span className="px-3 h-8 rounded-md bg-teal-600 text-white text-[10.5px] flex items-center font-medium">
            Kunde anlegen →
          </span>
        </div>
      </div>
    </div>
  </BrowserFrame>
);

export const FeatureCustomers = () => (
  <FeatureSection
    variant="light"
    eyebrow="Kunden & Führerschein-Scan"
    title={
      <>
        Führerschein scannen.
        <br />
        <span className="text-stone-400">Kunde angelegt.</span>
      </>
    }
    description="Führerscheinfoto hochladen — Knöllchen-Pilot liest Name, Adresse, Geburtsdatum, Führerscheinklasse und Gültigkeit aus. In unter einer Sekunde. Keine Tippfehler, keine vergessenen Felder, kein Papierchaos."
    bullets={[
      "OCR liest Vorder- und Rückseite, EU- und Drittländer-Führerscheine",
      "Automatischer Abgleich: Ist die Führerscheinklasse für das Fahrzeug gültig?",
      "Kundenkartei mit Mietverlauf, Strafzetteln und offenen Beträgen",
      "DSGVO-konform: alles verschlüsselt in EU-Rechenzentren",
    ]}
    mockup={<Mock />}
    side="left"
  />
);

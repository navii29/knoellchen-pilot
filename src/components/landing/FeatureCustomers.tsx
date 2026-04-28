import { FeatureSection } from "./FeatureSection";
import { BrowserFrame } from "./BrowserFrame";

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
        {/* License preview */}
        <div className="aspect-[4/3] rounded-lg overflow-hidden ring-1 ring-black/[0.08] relative bg-gradient-to-br from-pink-100 via-amber-50 to-stone-100">
          <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1542362567-b07e54358753?w=500&q=70')] bg-cover bg-center opacity-40" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent" />
          <div className="absolute top-2 left-2 right-2 flex justify-between items-start text-[8.5px]">
            <span className="px-1.5 h-4 rounded bg-white/90 text-stone-700 font-medium flex items-center">
              FÜHRERSCHEIN · DE
            </span>
            <span className="px-1.5 h-4 rounded bg-emerald-500 text-white font-medium flex items-center">
              ✓ erkannt
            </span>
          </div>
          {/* OCR overlay highlights */}
          <div className="absolute top-[55%] left-[10%] w-[40%] h-3 rounded-sm ring-2 ring-teal-400 bg-teal-400/10" />
          <div className="absolute top-[68%] left-[10%] w-[55%] h-3 rounded-sm ring-2 ring-teal-400 bg-teal-400/10" />
          <div className="absolute top-[80%] left-[10%] w-[35%] h-3 rounded-sm ring-2 ring-teal-400 bg-teal-400/10" />
          <div className="absolute bottom-2 right-2 px-1.5 h-4 rounded bg-black/70 text-white text-[8.5px] flex items-center font-mono">
            0,8s OCR
          </div>
        </div>

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

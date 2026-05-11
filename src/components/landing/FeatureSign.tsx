import { FeatureSection } from "./FeatureSection";
import { BrowserFrame } from "./BrowserFrame";

const SignMock = () => (
  <BrowserFrame url="app.knoellchen-pilot.de/contracts/MV-2026-0184/sign">
    <div className="p-5 text-[11px]">
      <div className="grid grid-cols-[1fr_180px] gap-4 items-start">
        {/* PDF preview side */}
        <div className="rounded-lg ring-1 ring-stone-200 bg-stone-50 px-3 py-3">
          <div className="text-[8.5px] uppercase tracking-wider text-stone-500 font-semibold mb-2">
            Vertragsvorschau
          </div>
          <div className="bg-white rounded ring-1 ring-stone-200 px-3 py-3 space-y-2">
            <div className="text-[10px] font-bold text-teal-700">
              Mietwagen Müller GmbH
            </div>
            <div className="text-[12px] font-bold text-stone-900 leading-tight">
              Mietvertrag MV-2026-0184
            </div>
            <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-[8.5px] mt-2">
              <div className="text-stone-400">Mieter</div>
              <div className="text-stone-700 font-medium">Lukas Becker</div>
              <div className="text-stone-400">Fahrzeug</div>
              <div className="text-stone-700">VW Polo · M-AV 5678</div>
              <div className="text-stone-400">Mietzeitraum</div>
              <div className="text-stone-700 font-mono">20.04. → 23.04.</div>
              <div className="text-stone-400">Tagespreis</div>
              <div className="text-stone-700 font-mono">49,00 €</div>
              <div className="text-stone-400">Gesamt</div>
              <div className="text-stone-900 font-semibold font-mono">
                147,00 €
              </div>
            </div>
            <div className="h-1.5" />
            <div className="text-[8px] text-stone-400 leading-tight">
              § 1 Vertragsgegenstand · § 2 Übergabe und Rückgabe · § 3 Mietzeit
              und Mietzins · § 4 Kilometerregelung · § 5 Tankregelung · § 6
              Versicherung und Selbstbeteiligung · § 7 Pflichten des Mieters …
            </div>
          </div>
        </div>

        {/* Signature pad */}
        <div className="rounded-lg ring-1 ring-stone-200 bg-white p-3">
          <div className="flex items-center justify-between mb-2">
            <div className="text-[8.5px] uppercase tracking-wider text-stone-500 font-semibold">
              Unterschrift
            </div>
            <div className="text-[8.5px] text-stone-400">Löschen</div>
          </div>
          <div className="rounded ring-1 ring-stone-200 bg-stone-50 h-24 relative overflow-hidden">
            {/* Stylized signature curve */}
            <svg
              viewBox="0 0 160 96"
              className="w-full h-full"
              preserveAspectRatio="none"
            >
              <path
                d="M 12 60 Q 28 30, 44 50 T 78 56 T 110 36 Q 122 30, 136 56"
                stroke="#0f172a"
                strokeWidth="2.2"
                strokeLinecap="round"
                fill="none"
              />
              <path
                d="M 80 64 L 130 78"
                stroke="#0f172a"
                strokeWidth="1.4"
                strokeLinecap="round"
                fill="none"
                opacity="0.7"
              />
            </svg>
          </div>
          <div className="mt-2 flex items-start gap-1.5">
            <div className="w-2.5 h-2.5 rounded bg-emerald-500 mt-0.5 flex items-center justify-center text-white">
              <svg width="6" height="6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
            <div className="text-[8.5px] text-stone-600 leading-tight">
              Ich akzeptiere die Mietbedingungen.
            </div>
          </div>
          <div className="mt-3 h-7 rounded-full bg-stone-900 text-white text-[9.5px] font-medium flex items-center justify-center gap-1">
            <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
            Unterschreiben
          </div>
        </div>
      </div>

      {/* Status banner */}
      <div className="mt-3 flex items-center gap-2 px-3 h-8 rounded-md bg-emerald-50 ring-1 ring-emerald-200/60 text-[10px] text-emerald-900">
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="20 6 9 17 4 12" />
        </svg>
        Unterschrieben am 20.04.2026 · IP 95.91.…
        <span className="ml-auto font-medium">PDF herunterladen ↗</span>
      </div>
    </div>
  </BrowserFrame>
);

export const FeatureSign = () => (
  <FeatureSection
    variant="light"
    eyebrow="Digitale Vertragsunterschrift"
    title={
      <>
        Vertrag unterschreiben.
        <br />
        <span className="text-stone-400">Am Tablet. In 5 Sekunden.</span>
      </>
    }
    description="Knöllchen-Pilot generiert den kompletten Mietvertrag als PDF — mit allen Daten, AGB und Konditionen. Der Kunde unterschreibt digital auf dem Tablet oder Handy. Kein Drucker, kein Scanner, kein Papier."
    bullets={[
      "3-seitiger Vertrag mit Stammdaten, AGB und Unterschriftenseite — automatisch generiert",
      "AGB pro Vermietung editierbar — Default-Vorlage mit 12 Standard-Paragraphen",
      "Audit-Trail: Datum + IP-Adresse werden auf dem PDF mitgedruckt",
      "Funktioniert am Schalter-Tablet, am Kunden-Handy oder im Büro",
    ]}
    mockup={<SignMock />}
    side="left"
  />
);

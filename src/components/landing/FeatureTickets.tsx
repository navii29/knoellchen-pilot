import { FeatureSection } from "./FeatureSection";
import { BrowserFrame } from "./BrowserFrame";

const Mock = () => (
  <BrowserFrame url="app.knoellchen-pilot.de/upload" variant="dark">
    <div className="p-5 text-[11px]">
      {/* Drop zone */}
      <div className="rounded-xl border-2 border-dashed border-white/15 bg-white/[0.02] p-6 text-center">
        <div className="mx-auto w-12 h-12 rounded-full bg-teal-500/20 flex items-center justify-center mb-3">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="rgb(45,212,191)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="17 8 12 3 7 8" />
            <line x1="12" y1="3" x2="12" y2="15" />
          </svg>
        </div>
        <div className="text-white text-[12.5px] font-medium">strafzettel-2041.pdf</div>
        <div className="text-white/40 text-[10.5px] mt-1">2,4 MB · soeben hochgeladen</div>
      </div>

      {/* 4-step progress */}
      <div className="mt-5 space-y-2">
        {[
          ["KI liest Dokument aus", "1,2s", true],
          ["Fahrer wird zugeordnet", "0,4s", true],
          ["3 PDFs werden generiert", "0,8s", true],
          ["E-Mail an Mieter versenden", "bereit", false],
        ].map(([label, sub, done], i) => (
          <div
            key={label as string}
            className="flex items-center gap-3 px-3 h-10 rounded-lg bg-white/[0.03] ring-1 ring-white/[0.06]"
          >
            <div
              className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-semibold ${
                done
                  ? "bg-emerald-500 text-black"
                  : "bg-white/10 text-white/60 ring-1 ring-white/15"
              }`}
            >
              {done ? "✓" : i + 1}
            </div>
            <div className="flex-1">
              <div className={`text-[11px] ${done ? "text-white" : "text-white/60"}`}>
                {label}
              </div>
            </div>
            <div className={`text-[10px] font-mono ${done ? "text-emerald-400" : "text-white/40"}`}>
              {sub}
            </div>
          </div>
        ))}
      </div>

      {/* Extracted data preview */}
      <div className="mt-5 rounded-lg bg-white/[0.03] ring-1 ring-white/[0.06] p-3">
        <div className="text-[9.5px] uppercase tracking-wide text-white/40 mb-2">
          Extrahierte Daten · Confidence 0.96
        </div>
        <div className="grid grid-cols-2 gap-y-1.5 text-[10.5px]">
          <span className="text-white/50">Aktenzeichen</span>
          <span className="text-white font-mono">VR-2026-04-1124</span>
          <span className="text-white/50">Kennzeichen</span>
          <span className="text-white font-mono">M-AB 1234</span>
          <span className="text-white/50">Verstoß</span>
          <span className="text-white">Parken im Halteverbot</span>
          <span className="text-white/50">Betrag</span>
          <span className="text-white">€ 55,00</span>
        </div>
      </div>
    </div>
  </BrowserFrame>
);

export const FeatureTickets = () => (
  <div id="features">
    <FeatureSection
      variant="dark"
      eyebrow="Strafzettel-Automatisierung"
      title={
        <>
          Foto hochladen.
          <br />
          <span className="text-white/40">KI erledigt den Rest.</span>
        </>
      }
      description="Bußgeldbescheid abfotografieren oder per E-Mail weiterleiten — Knöllchen-Pilot liest alle Daten aus, ordnet den Mieter zu, generiert Anschreiben, Rechnung und Zeugenfragebogen, und versendet alles automatisch. Was vorher 30 Minuten dauerte, dauert jetzt 30 Sekunden."
      bullets={[
        "Claude Vision liest Aktenzeichen, Kennzeichen, Tatort und Betrag",
        "Automatischer Mieter-Match anhand Buchung und Tatzeitpunkt",
        "PDFs nach §31a StVG-Standard, rechtssicher formatiert",
        "Zahlungsstatus und Mahnstufen werden automatisch getrackt",
      ]}
      mockup={<Mock />}
      side="right"
    />
  </div>
);

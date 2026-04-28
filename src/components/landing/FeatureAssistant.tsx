import { FeatureSection } from "./FeatureSection";
import { BrowserFrame } from "./BrowserFrame";

const Mock = () => (
  <BrowserFrame url="app.knoellchen-pilot.de/assistant" variant="dark">
    <div className="p-5 text-[11px] h-[460px] flex flex-col">
      <div className="flex items-center gap-2 mb-4 pb-3 border-b border-white/[0.06]">
        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-teal-400 to-emerald-500 flex items-center justify-center">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="black" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="12 2 15 8.5 22 9.3 17 14 18.2 21 12 17.8 5.8 21 7 14 2 9.3 9 8.5 12 2" />
          </svg>
        </div>
        <div className="leading-tight">
          <div className="text-white text-[12px] font-medium">KP-Assistent</div>
          <div className="text-white/40 text-[10px]">Online · Spracheingabe aktiv</div>
        </div>
        <div className="ml-auto flex items-center gap-1.5 px-2 h-6 rounded-full bg-emerald-500/15 ring-1 ring-emerald-500/30 text-[10px] text-emerald-300">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          hört zu
        </div>
      </div>

      {/* Chat */}
      <div className="space-y-3 flex-1 overflow-hidden">
        <div className="flex justify-end">
          <div className="max-w-[85%] px-3 py-2 rounded-2xl rounded-br-sm bg-teal-600 text-white text-[11px] leading-snug">
            Lege einen neuen Mietvertrag für Frau Bauer an — Tesla Model 3, vom 2. bis 9. Mai.
          </div>
        </div>
        <div className="flex justify-start">
          <div className="max-w-[85%] px-3 py-2 rounded-2xl rounded-bl-sm bg-white/[0.06] text-white/90 text-[11px] leading-snug">
            Erledigt. Frau Bauer ist als Kundin angelegt, Vertrag <span className="font-mono text-emerald-300">VR-2026-05-018</span> erstellt. Tesla M3 (K-GH 3456) ist im gewünschten Zeitraum verfügbar.
          </div>
        </div>
        <div className="flex justify-start">
          <div className="max-w-[85%] rounded-xl bg-white/[0.04] ring-1 ring-white/[0.06] p-3 text-[10.5px] space-y-1.5">
            <div className="flex justify-between">
              <span className="text-white/50">Mieter</span>
              <span className="text-white">Anna Bauer</span>
            </div>
            <div className="flex justify-between">
              <span className="text-white/50">Fahrzeug</span>
              <span className="text-white">Tesla M3 · K-GH 3456</span>
            </div>
            <div className="flex justify-between">
              <span className="text-white/50">Zeitraum</span>
              <span className="text-white">02.05. – 09.05.2026</span>
            </div>
            <div className="flex justify-between">
              <span className="text-white/50">Tagessatz</span>
              <span className="text-white">€ 89,00</span>
            </div>
            <div className="pt-2 mt-1 border-t border-white/[0.06] flex justify-between font-medium">
              <span className="text-white/70">Summe</span>
              <span className="text-emerald-300">€ 623,00</span>
            </div>
          </div>
        </div>
        <div className="flex justify-end">
          <div className="max-w-[85%] px-3 py-2 rounded-2xl rounded-br-sm bg-teal-600 text-white text-[11px] leading-snug">
            Wie viele Tesla-Verträge hatten wir letzten Monat?
          </div>
        </div>
      </div>

      {/* Voice input bar */}
      <div className="mt-4 flex items-center gap-2 px-3 h-10 rounded-full bg-white/[0.04] ring-1 ring-white/[0.08]">
        <div className="flex items-end gap-0.5 h-4">
          {[3, 6, 4, 8, 5, 7, 4, 6, 3].map((h, i) => (
            <span
              key={i}
              className="w-[2.5px] bg-teal-400 rounded-full"
              style={{ height: `${h * 1.5}px` }}
            />
          ))}
        </div>
        <span className="text-[10.5px] text-white/50 italic flex-1">
          „Zeig mir alle offenen Strafzettel von letzter Woche…“
        </span>
        <div className="w-7 h-7 rounded-full bg-teal-500 flex items-center justify-center">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="black" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
            <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
            <line x1="12" y1="19" x2="12" y2="23" />
          </svg>
        </div>
      </div>
    </div>
  </BrowserFrame>
);

export const FeatureAssistant = () => (
  <FeatureSection
    variant="dark"
    eyebrow="KI-Assistent mit Sprache"
    title={
      <>
        Einfach sagen,
        <br />
        <span className="text-white/40">was du brauchst.</span>
      </>
    }
    description="Lege Verträge an, frage Kennzahlen ab, finde verfügbare Fahrzeuge — alles per Spracheingabe oder Chat. Der Knöllchen-Pilot Assistent kennt deine ganze Flotte, deine Buchungen und alle Strafzettel und antwortet in Sekunden."
    bullets={[
      "Spracheingabe in natürlichem Deutsch — kein Kommando-Stil nötig",
      "„Welcher BMW ist nächste Woche frei?“ — sofort die Antwort",
      "Aktionen per Sprache: Vertrag anlegen, E-Mail senden, Termin merken",
      "Lernt deine Vermietung kennen und gibt proaktive Vorschläge",
    ]}
    mockup={<Mock />}
    side="right"
  />
);

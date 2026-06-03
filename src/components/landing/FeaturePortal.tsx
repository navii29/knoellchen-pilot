import { FeatureSection } from "./FeatureSection";

const PhoneMock = () => (
  <div className="relative mx-auto w-full max-w-[260px] sm:max-w-[300px]">
    <div className="rounded-[36px] bg-zinc-900 p-2.5 shadow-2xl ring-1 ring-white/10">
      <div className="rounded-[28px] bg-white overflow-hidden">
        {/* Statusbar */}
        <div className="flex items-center justify-between px-5 pt-2 pb-1 text-[10px] font-medium text-zinc-700">
          <span>9:41</span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-1.5 rounded-[1px] bg-zinc-700/80" />
          </span>
        </div>
        {/* Header */}
        <div className="px-4 pt-3 pb-3 border-b border-zinc-100 flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-400 to-emerald-500 flex items-center justify-center shadow shadow-indigo-500/20">
            <span className="text-white font-bold text-[12px]">M</span>
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[8.5px] uppercase tracking-wider text-zinc-500 font-medium">
              Kundenportal
            </div>
            <div className="text-[12.5px] font-medium text-zinc-900 leading-tight truncate">
              Mietwagen Müller
            </div>
          </div>
        </div>

        {/* Wizard progress */}
        <div className="px-4 pt-3 pb-2">
          <div className="flex items-center justify-between mb-1">
            <div className="text-[8.5px] uppercase tracking-wider text-zinc-500 font-semibold">
              Schritt 3 von 5
            </div>
            <div className="text-[10px] font-medium text-zinc-700">
              Fahrzeug-Fotos
            </div>
          </div>
          <div className="h-1 rounded-full bg-zinc-200 overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-emerald-500"
              style={{ width: "60%" }}
            />
          </div>
        </div>

        {/* Photo grid */}
        <div className="px-4 pb-4 pt-2">
          <div className="rounded-2xl bg-amber-50 ring-1 ring-amber-200 px-2.5 py-1.5 text-[9px] text-amber-900 mb-2.5">
            Mindestens 4 Fotos — alle 10 empfohlen.
          </div>
          <div className="grid grid-cols-2 gap-1.5">
            {[
              { label: "Vorne", done: true },
              { label: "Hinten", done: true },
              { label: "Links", done: true },
              { label: "Rechts", done: true },
              { label: "Vorne L", done: false },
              { label: "Vorne R", done: false },
            ].map((it, i) => (
              <div
                key={i}
                className={`rounded-xl ring-1 px-2 py-2 ${
                  it.done
                    ? "bg-emerald-50 ring-emerald-200"
                    : "bg-white ring-zinc-200"
                }`}
              >
                <div className="flex items-center gap-1.5">
                  <div
                    className={`w-5 h-5 rounded-md flex items-center justify-center shrink-0 ${
                      it.done
                        ? "bg-emerald-100 text-emerald-700"
                        : "bg-zinc-100 text-zinc-500"
                    }`}
                  >
                    {it.done ? (
                      <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    ) : (
                      <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                        <circle cx="12" cy="13" r="4" />
                      </svg>
                    )}
                  </div>
                  <div className="text-[9.5px] font-medium text-zinc-900 truncate">
                    {it.label}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Submit */}
          <div className="mt-3 h-9 rounded-full bg-zinc-900 text-white text-[10.5px] font-medium flex items-center justify-center gap-1">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
            Weiter
          </div>
        </div>

        {/* Bottom-Nav */}
        <div className="border-t border-zinc-100 grid grid-cols-4 py-1.5">
          {["Übersicht", "Verträge", "Dokumente", "Profil"].map((l, i) => (
            <div
              key={l}
              className={`text-center text-[8px] font-medium ${
                i === 1 ? "text-zinc-900" : "text-zinc-400"
              }`}
            >
              <div
                className={`w-4 h-4 mx-auto mb-0.5 rounded-sm ${
                  i === 1 ? "bg-zinc-900" : "bg-zinc-300"
                }`}
              />
              {l}
            </div>
          ))}
        </div>
      </div>
    </div>
  </div>
);

export const FeaturePortal = () => (
  <FeatureSection
    variant="dark"
    eyebrow="Self-Service Kundenportal"
    title={
      <>
        Ihre Kunden machen den
        <br />
        <span className="text-white/40">Check-in selbst.</span>
      </>
    }
    description="Mieter erhalten einen Login-Link, scannen ihren Führerschein, fotografieren das Fahrzeug und unterschreiben den Vertrag — alles am eigenen Handy, bevor sie bei Ihnen ankommen. Bei Rückgabe das Gleiche: Fotos, Kilometerstand, Tankstand. Sie geben nur noch den Schlüssel."
    bullets={[
      "Self-Check-in in 5 geführten Schritten — Führerschein, Ausweis, Fahrzeug-Fotos, Unterschrift",
      "Self-Check-out mit Foto-Vergleich der Vorher-/Nachher-Aufnahmen",
      "Digitale Vertragsunterschrift direkt am Display",
      "Eigenes Kundenportal pro Vermietung — mit Ihrem Branding",
    ]}
    mockup={<PhoneMock />}
    side="right"
  />
);

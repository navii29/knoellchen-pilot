import { FeatureSection } from "./FeatureSection";
import { BrowserFrame } from "./BrowserFrame";

const PhotoTile = ({
  side,
  flagged = false,
}: {
  side: "before" | "after";
  flagged?: boolean;
}) => (
  <div
    className={`relative aspect-[4/3] rounded-md overflow-hidden ring-1 ${
      flagged ? "ring-red-500" : "ring-black/[0.08]"
    } bg-gradient-to-br from-stone-300 to-stone-500`}
  >
    <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=400&q=70')] bg-cover bg-center opacity-90" />
    <div className="absolute top-1 left-1 px-1.5 h-4 rounded text-[8.5px] font-medium bg-black/60 text-white backdrop-blur-sm">
      {side === "before" ? "Vorher" : "Nachher"}
    </div>
    {flagged && (
      <div className="absolute inset-0">
        <div className="absolute top-[40%] left-[35%] w-12 h-8 rounded-md ring-2 ring-red-500 bg-red-500/20" />
        <div className="absolute top-[calc(40%-22px)] left-[35%] px-1.5 h-4 rounded bg-red-500 text-white text-[8.5px] font-semibold flex items-center">
          Kratzer · 94 %
        </div>
      </div>
    )}
  </div>
);

const Mock = () => (
  <BrowserFrame url="app.knoellchen-pilot.de/handover/4128">
    <div className="p-5 text-[11px]">
      <div className="flex items-center justify-between mb-3">
        <div>
          <div className="text-[14px] font-semibold text-stone-900 leading-tight">
            Übergabe-Vergleich
          </div>
          <div className="text-[10.5px] text-stone-500">
            Audi A4 · F-EF 9012 · Vergleich abgeschlossen
          </div>
        </div>
        <div className="px-2.5 h-6 rounded bg-red-100 ring-1 ring-red-200 text-red-700 text-[10px] font-medium flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
          1 Schaden erkannt
        </div>
      </div>

      <div className="grid grid-cols-4 gap-2 mb-3">
        <PhotoTile side="before" />
        <PhotoTile side="before" />
        <PhotoTile side="before" />
        <PhotoTile side="before" />
      </div>
      <div className="grid grid-cols-4 gap-2">
        <PhotoTile side="after" />
        <PhotoTile side="after" flagged />
        <PhotoTile side="after" />
        <PhotoTile side="after" />
      </div>

      <div className="mt-4 rounded-md bg-red-50 ring-1 ring-red-200/70 p-3">
        <div className="flex items-start gap-2.5">
          <div className="w-6 h-6 rounded-full bg-red-500 text-white flex items-center justify-center text-[10.5px] font-bold mt-0.5">
            !
          </div>
          <div className="flex-1">
            <div className="text-[11px] font-semibold text-red-900">
              Kratzer an Heckstoßstange links
            </div>
            <div className="text-[10.5px] text-red-700/90 mt-0.5">
              Nicht im Vorher-Foto sichtbar · KI-Konfidenz 94 % · ca. 12 cm
            </div>
            <div className="mt-2 flex gap-2">
              <span className="px-2 h-6 rounded bg-white text-red-700 text-[10px] font-medium flex items-center ring-1 ring-red-200">
                Schadensprotokoll erstellen
              </span>
              <span className="px-2 h-6 rounded bg-red-600 text-white text-[10px] font-medium flex items-center">
                Mieter informieren
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </BrowserFrame>
);

export const FeatureHandover = () => (
  <FeatureSection
    variant="light"
    eyebrow="Übergabe & Schadenerkennung"
    title={
      <>
        Vorher. Nachher.
        <br />
        <span className="text-stone-400">KI sieht den Unterschied.</span>
      </>
    }
    description="10 Fotos bei der Übergabe, 10 bei der Rückgabe — der Rest passiert von selbst. Knöllchen-Pilot vergleicht jedes Detail per Computer Vision und meldet jede Beule, jeden Kratzer, jede Verschmutzung. Kein Streit mehr darüber, was vorher schon da war."
    bullets={[
      "Computer Vision erkennt Schäden mit über 90 % Genauigkeit",
      "Automatisches Schadensprotokoll inkl. Lokalisierung am Fahrzeug",
      "Beweissicheres Foto-Archiv für jeden Mietvorgang",
      "Direkte Übernahme in Versicherungs- und Reparaturworkflows",
    ]}
    mockup={<Mock />}
    side="left"
  />
);

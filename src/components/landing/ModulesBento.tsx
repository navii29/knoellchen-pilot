/**
 * ModulesBento — Bento-grid feature showcase.
 * bg-canvas, engineered cards, strong typographic hierarchy.
 * KI-Strafzettel cell is visually dominant.
 */

import {
  FileText,
  Camera,
  Users,
  Car,
  BarChart2,
  CalendarDays,
  TrendingUp,
  ScanLine,
  ArrowRight,
} from "lucide-react";
import { Plate } from "@/components/ui/Plate";

/* ── helpers ── */
const IconBox = ({ children }: { children: React.ReactNode }) => (
  <span className="inline-flex items-center justify-center w-9 h-9 rounded-panel border border-hairline bg-paper text-ink-soft">
    {children}
  </span>
);

/* ── pipeline mini-rail ── */
const PIPE = [
  { label: "Neu", color: "#B45309" },
  { label: "Zugeordnet", color: "#1D4ED8" },
  { label: "Weiterbelastet", color: "#6D28D9" },
  { label: "Bezahlt", color: "#15803D" },
];

const MiniPipe = () => (
  <div className="flex items-center gap-1 mt-3">
    {PIPE.map((s, i) => (
      <div key={s.label} className="flex items-center gap-1 flex-1">
        <div className="h-[3px] flex-1 rounded-full" style={{ background: s.color }} />
        {i < PIPE.length - 1 && <ArrowRight size={8} className="text-ink-muted shrink-0" />}
      </div>
    ))}
  </div>
);

/* ── cards ── */

/** Large card — KI-Strafzettel (dominant) */
const StrafzettelCard = () => (
  <div className="relative col-span-2 row-span-2 rounded-card border border-hairline bg-paper shadow-panel overflow-hidden group hover:shadow-raised transition-shadow duration-200">
    {/* engineering grid texture */}
    <div className="absolute inset-0 grid-light opacity-60" />

    <div className="relative p-6 h-full flex flex-col">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <span className="inline-flex items-center justify-center w-10 h-10 rounded-panel border border-hairline bg-canvas">
            <ScanLine size={18} className="text-ink-soft" strokeWidth={1.75} />
          </span>
          <div>
            <span className="kicker text-ink-muted">KI-Auslesen</span>
          </div>
        </div>
        <span className="font-mono text-[10.5px] px-2 py-0.5 rounded bg-signal-soft text-signal-ink border border-signal/20">
          Claude Vision
        </span>
      </div>

      <h3 className="mt-5 font-display font-extrabold text-[22px] text-ink leading-tight tracking-tightest">
        Strafzettel rein.
        <br />
        Fahrer zugeordnet.
        <br />
        <span className="text-ink-muted">Gebühr weiterbelastet.</span>
      </h3>

      <p className="mt-3 text-[13.5px] leading-relaxed text-ink-soft max-w-xs">
        KI liest Kennzeichen, Tatzeit, Behörde und Betrag aus dem Scan aus.
        Die Leitstelle gleicht gegen den Mietvertrag ab — vollautomatisch, revisionssicher.
      </p>

      {/* mini dark console */}
      <div className="mt-5 rounded-frame border border-hairline bg-void-800 p-4 space-y-3">
        <div className="flex items-center justify-between">
          <Plate value="B-KP 2041" size="sm" />
          <span className="font-mono text-[10px] text-white/45 tnum">12.05.2026 · 14:32</span>
        </div>

        <div className="grid grid-cols-2 gap-2">
          {[
            { label: "Verstoß", value: "Parken im Halteverbot" },
            { label: "Bußgeld", value: "55,00 €" },
            { label: "Fahrer", value: "M. Krause", signal: true },
            { label: "Gebühr", value: "+ 25,00 €", signal: true },
          ].map((f) => (
            <div key={f.label}>
              <div className="font-mono text-[9.5px] text-white/35 uppercase tracking-wider">{f.label}</div>
              <div className={`font-mono text-[11.5px] mt-0.5 ${f.signal ? "text-signal" : "text-white/80"}`}>
                {f.value}
              </div>
            </div>
          ))}
        </div>

        <MiniPipe />
      </div>

      {/* micro detail */}
      <div className="mt-auto pt-4 flex items-center gap-2">
        <span className="font-mono text-[11px] text-ink-muted">
          Anschreiben · Rechnung · Zeugenfragebogen — automatisch
        </span>
      </div>
    </div>
  </div>
);

/** Medium card — Verträge & E-Signatur */
const VertraegeCard = () => (
  <div className="col-span-2 rounded-card border border-hairline bg-paper shadow-panel p-5 hover:shadow-raised transition-shadow duration-200">
    <IconBox>
      <FileText size={16} strokeWidth={1.75} />
    </IconBox>
    <h3 className="mt-4 font-display font-bold text-[17px] text-ink tracking-tightest">
      Verträge & E-Signatur
    </h3>
    <p className="mt-1.5 text-[13px] leading-relaxed text-ink-soft">
      Mietvertrag erstellen, digital signieren lassen — direkt im Browser des Mieters.
      Übergabe mit Schadensdokumentation und Fotos am selben Tag.
    </p>
    <div className="mt-3 flex items-center gap-3 font-mono text-[11px] text-ink-muted">
      <span className="px-2 py-0.5 rounded bg-canvas border border-hairline">Rechtssicher</span>
      <span className="px-2 py-0.5 rounded bg-canvas border border-hairline">Übergabeprotokoll</span>
    </div>
  </div>
);

/** Small card — Übergabe & Fotos */
const UebergabeCard = () => (
  <div className="rounded-card border border-hairline bg-paper shadow-panel p-5 hover:shadow-raised transition-shadow duration-200">
    <IconBox>
      <Camera size={16} strokeWidth={1.75} />
    </IconBox>
    <h3 className="mt-4 font-display font-bold text-[16px] text-ink tracking-tightest">
      Übergabe & Schadensdoku
    </h3>
    <p className="mt-1.5 text-[13px] leading-relaxed text-ink-soft">
      Fotos, Vorschäden und Unterschrift in einem Protokoll — lückenlos dokumentiert.
    </p>
  </div>
);

/** Small card — Kunden & Portal */
const KundenCard = () => (
  <div className="rounded-card border border-hairline bg-paper shadow-panel p-5 hover:shadow-raised transition-shadow duration-200">
    <IconBox>
      <Users size={16} strokeWidth={1.75} />
    </IconBox>
    <h3 className="mt-4 font-display font-bold text-[16px] text-ink tracking-tightest">
      Kunden-CRM & Mieterportal
    </h3>
    <p className="mt-1.5 text-[13px] leading-relaxed text-ink-soft">
      Mieterdaten, Vertragsverlauf, offene Positionen — Mieter sehen alles selbst im Portal.
    </p>
  </div>
);

/** Small card — Flotte */
const FlotteCard = () => (
  <div className="rounded-card border border-hairline bg-paper shadow-panel p-5 hover:shadow-raised transition-shadow duration-200">
    <IconBox>
      <Car size={16} strokeWidth={1.75} />
    </IconBox>
    <h3 className="mt-4 font-display font-bold text-[16px] text-ink tracking-tightest">
      Flottenverwaltung
    </h3>
    <p className="mt-1.5 text-[13px] leading-relaxed text-ink-soft">
      Fahrzeuge, Kennzeichen, Verfügbarkeit — importierbar per CSV oder einzeln gepflegt.
    </p>
  </div>
);

/** Small card — Kalender */
const KalenderCard = () => (
  <div className="rounded-card border border-hairline bg-paper shadow-panel p-5 hover:shadow-raised transition-shadow duration-200">
    <IconBox>
      <CalendarDays size={16} strokeWidth={1.75} />
    </IconBox>
    <h3 className="mt-4 font-display font-bold text-[16px] text-ink tracking-tightest">
      Kalender
    </h3>
    <p className="mt-1.5 text-[13px] leading-relaxed text-ink-soft">
      Buchungsübersicht auf einen Blick — wer hat was, wann und wie lange.
    </p>
  </div>
);

/** Medium card — Dynamic Pricing + Reports */
const PricingReportsCard = () => (
  <div className="col-span-2 rounded-card border border-hairline bg-paper shadow-panel p-5 hover:shadow-raised transition-shadow duration-200">
    <div className="flex items-start gap-4">
      <div className="flex-1">
        <IconBox>
          <TrendingUp size={16} strokeWidth={1.75} />
        </IconBox>
        <h3 className="mt-4 font-display font-bold text-[17px] text-ink tracking-tightest">
          Dynamic Pricing
        </h3>
        <p className="mt-1.5 text-[13px] leading-relaxed text-ink-soft">
          Tagespreise automatisch anpassen — Saison, Wochentag, Fahrzeugklasse.
          Kein Excel-Chaos mehr.
        </p>
      </div>
      <div className="w-px self-stretch bg-hairline" />
      <div className="flex-1">
        <IconBox>
          <BarChart2 size={16} strokeWidth={1.75} />
        </IconBox>
        <h3 className="mt-4 font-display font-bold text-[17px] text-ink tracking-tightest">
          Auswertung & Reports
        </h3>
        <p className="mt-1.5 text-[13px] leading-relaxed text-ink-soft">
          Umsatz, Margin, offene Strafzettel — Kennzahlen die operativ relevant sind,
          nicht Folien für Investoren.
        </p>
      </div>
    </div>
  </div>
);

/* ── section ── */
export const ModulesBento = () => {
  return (
    <section id="features" className="relative bg-canvas">
      <div className="max-w-wide mx-auto px-5 lg:px-8 py-20 lg:py-28">
        {/* header */}
        <div className="max-w-2xl mb-12">
          <span className="kicker text-ink-muted">Module</span>
          <h2 className="mt-4 font-display font-extrabold text-[28px] lg:text-[38px] text-ink leading-tight tracking-tightest">
            Eine Leitstelle.
            <br />
            <span className="text-ink-muted">Alle Vorgänge Ihrer Vermietung.</span>
          </h2>
          <p className="mt-4 text-[15px] leading-relaxed text-ink-soft max-w-xl">
            Kein Flickenteppich aus Tools. Verträge, Strafzettel, Kunden und
            Fahrzeuge laufen zusammen — in einer Oberfläche, die den Betrieb kennt.
          </p>
        </div>

        {/* bento grid — 4 cols, variable rows */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 auto-rows-auto">
          {/* row 1: KI-Strafzettel (2×2 large) + 2 smalls */}
          <StrafzettelCard />
          <UebergabeCard />
          <KundenCard />

          {/* row 2: remaining smalls */}
          <FlotteCard />
          <KalenderCard />

          {/* row 3: verträge (spans 2) + pricing+reports (spans 2) */}
          <VertraegeCard />
          <PricingReportsCard />
        </div>
      </div>
    </section>
  );
};

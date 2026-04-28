import { FeatureSection } from "./FeatureSection";

const Tile = ({
  name,
  tagline,
  glyph,
  accent,
}: {
  name: string;
  tagline: string;
  glyph: React.ReactNode;
  accent: string;
}) => (
  <div className="rounded-2xl bg-white/[0.03] ring-1 ring-white/[0.08] p-6 hover:bg-white/[0.05] transition-colors">
    <div
      className="w-12 h-12 rounded-xl flex items-center justify-center mb-4 text-white"
      style={{ background: accent }}
    >
      {glyph}
    </div>
    <div className="text-white text-[15px] font-medium">{name}</div>
    <div className="text-white/50 text-[12.5px] mt-1 leading-relaxed">{tagline}</div>
    <div className="mt-4 inline-flex items-center gap-1.5 text-[11.5px] text-emerald-400">
      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
      Verbunden
    </div>
  </div>
);

const Mock = () => (
  <div className="grid grid-cols-2 gap-4">
    <Tile
      name="LexOffice"
      tagline="Rechnungen und Buchhaltungs-Belege werden automatisch nach LexOffice synchronisiert."
      accent="linear-gradient(135deg,#0066FF,#00BFFF)"
      glyph={
        <span className="font-bold text-[18px] tracking-tight">L</span>
      }
    />
    <Tile
      name="Echoes.solutions"
      tagline="GPS-Tracking und Telematikdaten direkt in der Flottenansicht — live."
      accent="linear-gradient(135deg,#0d9488,#10b981)"
      glyph={
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 22s8-7 8-13a8 8 0 0 0-16 0c0 6 8 13 8 13z" />
          <circle cx="12" cy="9" r="2.5" />
        </svg>
      }
    />
    <Tile
      name="Stripe"
      tagline="Zahlungen, Mahnungen und SEPA-Lastschriften in einem Workflow."
      accent="linear-gradient(135deg,#635BFF,#8A86FF)"
      glyph={<span className="font-bold text-[18px]">S</span>}
    />
    <Tile
      name="Mailgun"
      tagline="Inbound-E-Mails von Behörden landen automatisch in der Strafzettel-Pipeline."
      accent="linear-gradient(135deg,#F06B66,#FF9500)"
      glyph={
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
          <polyline points="22,6 12,13 2,6" />
        </svg>
      }
    />
  </div>
);

export const FeatureIntegrations = () => (
  <FeatureSection
    variant="dark"
    eyebrow="Integrationen"
    title={
      <>
        Verbunden mit
        <br />
        <span className="text-white/40">Ihren Tools.</span>
      </>
    }
    description="Knöllchen-Pilot lebt nicht im luftleeren Raum. Wir verbinden uns mit den Tools, die Sie bereits nutzen — und machen Ihre Vermietung dadurch noch schneller."
    bullets={[
      "LexOffice: Belege, Rechnungen und Mahnungen synchronisieren sich automatisch",
      "Echoes.solutions: GPS-Position und Kilometerstand jedes Fahrzeugs in Echtzeit",
      "Stripe-Zahlungen, Mailgun-Inbound, REST-API für eigene Anbindungen",
    ]}
    mockup={<Mock />}
    side="right"
  />
);

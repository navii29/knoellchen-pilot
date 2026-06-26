"use client";

import { useState } from "react";
import { StepShell } from "./StepShell";

const Stat = ({
  value,
  label,
  zero,
}: {
  value: number;
  label: string;
  zero?: boolean;
}) => (
  <div
    className={`px-5 py-4 rounded-card border ${
      zero
        ? "bg-canvas border-hairline"
        : "bg-canvas border-signal/25"
    }`}
  >
    <div className="font-display font-extrabold text-[36px] leading-none tracking-tightest text-ink tnum">
      {value}
    </div>
    <div className="mt-1.5 data-label text-ink-muted">{label}</div>
  </div>
);

export const Step5Done = ({
  vehicleCount,
  customerCount,
  contractCount,
  onFinish,
}: {
  vehicleCount: number;
  customerCount: number;
  contractCount: number;
  onFinish: () => void;
}) => {
  const [loading, setLoading] = useState(false);
  const handle = () => {
    setLoading(true);
    onFinish();
  };
  return (
    <StepShell
      eyebrow="Fertig"
      title="Alles bereit. Willkommen an Bord!"
      subtitle="Ihr Konto ist eingerichtet und einsatzbereit. Im Dashboard sehen Sie ab sofort alle laufenden Verträge, Strafzettel und Auswertungen."
      primaryLabel="Zum Dashboard"
      primaryLoading={loading}
      onPrimary={handle}
    >
      <div className="grid grid-cols-3 gap-3 mb-7">
        <Stat value={vehicleCount} label="Fahrzeug(e)" zero={vehicleCount === 0} />
        <Stat value={customerCount} label="Kunde(n)" zero={customerCount === 0} />
        <Stat value={contractCount} label="Vertrag/Verträge" zero={contractCount === 0} />
      </div>

      {/* dark tip panel — void tone */}
      <div className="rounded-card bg-void text-on-dark p-6 sm:p-7 relative overflow-hidden">
        <div className="absolute inset-0 dot-dark opacity-30 [mask-image:radial-gradient(80%_80%_at_90%_110%,#000_20%,transparent_80%)]" />
        <div className="relative">
          <div className="kicker text-signal mb-3">Tipp</div>
          <h3 className="font-display font-extrabold text-white text-[20px] sm:text-[24px] leading-[1.12] tracking-tightest">
            Laden Sie jetzt einen Strafzettel hoch — und sehen Sie die Software in Aktion.
          </h3>
          <p className="mt-3 text-[14px] leading-[1.55] text-white/60">
            Knöllchen-Pilot liest Aktenzeichen, Tatort, Bußgeld und Frist
            automatisch aus, ordnet den passenden Mietvertrag zu und bereitet
            das Anschreiben an Mieter:in und Behörde vor.
          </p>
        </div>
      </div>
    </StepShell>
  );
};

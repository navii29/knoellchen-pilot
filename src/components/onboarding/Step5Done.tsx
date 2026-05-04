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
    className={`px-5 py-4 rounded-2xl ring-1 ${
      zero
        ? "bg-stone-50 ring-stone-200/70"
        : "bg-gradient-to-br from-teal-50 to-emerald-50 ring-teal-200/60"
    }`}
  >
    <div className="font-display text-[36px] leading-none tracking-[-0.02em] font-medium text-stone-900">
      {value}
    </div>
    <div className="mt-1 text-[12.5px] uppercase tracking-[0.08em] text-stone-500 font-medium">
      {label}
    </div>
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

      <div className="rounded-2xl bg-stone-900 text-white p-6 sm:p-7 relative overflow-hidden">
        <div className="absolute -top-10 -right-10 w-40 h-40 bg-gradient-to-br from-teal-400/20 to-emerald-500/20 blur-3xl rounded-full" />
        <div className="relative">
          <div className="text-[12px] uppercase tracking-[0.1em] font-semibold text-teal-300 mb-2">
            Tipp
          </div>
          <h3 className="font-display text-[22px] sm:text-[26px] leading-[1.15] tracking-[-0.01em] font-medium">
            Laden Sie jetzt einen Strafzettel hoch — und sehen Sie die KI in Aktion.
          </h3>
          <p className="mt-3 text-[14.5px] leading-[1.55] text-white/70">
            Knöllchen-Pilot liest Aktenzeichen, Tatort, Bußgeld und Frist
            automatisch aus, ordnet den passenden Mietvertrag zu und bereitet
            das Anschreiben an Mieter:in und Behörde vor.
          </p>
        </div>
      </div>
    </StepShell>
  );
};

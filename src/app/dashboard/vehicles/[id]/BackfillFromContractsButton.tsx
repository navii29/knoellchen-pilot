"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Sparkles } from "lucide-react";

export const BackfillFromContractsButton = ({
  vehicleId,
  contractCount,
}: {
  vehicleId: string;
  contractCount: number;
}) => {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fill = async () => {
    setBusy(true);
    setError(null);
    setDone(false);
    const res = await fetch(`/api/vehicles/${vehicleId}/backfill-from-contracts`, {
      method: "POST",
    });
    setBusy(false);
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setError(j.error || "Fehlgeschlagen");
      return;
    }
    setDone(true);
    router.refresh();
  };

  return (
    <div className="mt-4 rounded-card border border-hairline bg-canvas px-4 py-3 flex items-center gap-3 flex-wrap">
      <Sparkles size={15} className="text-teal-600 shrink-0" />
      <p className="text-[13px] text-ink-muted flex-1">
        Dieses Fahrzeug hat leere Felder, die aus {contractCount}{" "}
        {contractCount === 1 ? "Vertrag" : "Verträgen"} befüllt werden können.
      </p>
      <button
        onClick={fill}
        disabled={busy || done}
        className="inline-flex items-center gap-1.5 text-[13px] font-medium text-teal-700 px-3 py-1.5 rounded-btn border border-teal-200 hover:bg-teal-50 disabled:opacity-50 transition-colors shrink-0"
      >
        {busy ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
        {done ? "Übernommen" : "Daten aus Verträgen übernehmen"}
      </button>
      {error && <span className="text-[12px] text-red-700">{error}</span>}
    </div>
  );
};

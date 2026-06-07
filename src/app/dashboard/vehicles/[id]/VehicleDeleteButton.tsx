"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Trash2 } from "lucide-react";

export const VehicleDeleteButton = ({ vehicleId }: { vehicleId: string }) => {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const remove = async () => {
    if (!confirm("Fahrzeug inklusive aller Stammdaten löschen? Verträge bleiben erhalten.")) return;
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/vehicles?id=${vehicleId}`, { method: "DELETE" });
    setBusy(false);
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setError(j.error || "Löschen fehlgeschlagen");
      return;
    }
    router.push("/dashboard/vehicles");
    router.refresh();
  };

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={remove}
        disabled={busy}
        className="inline-flex items-center gap-1.5 text-[13px] text-red-700 px-3 py-1.5 rounded-btn border border-hairline hover:bg-red-50 disabled:opacity-50 transition-colors"
      >
        {busy ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />} Löschen
      </button>
      {error && <span className="text-[12px] text-red-700">{error}</span>}
    </div>
  );
};

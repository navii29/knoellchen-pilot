"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowRightLeft,
  CheckCircle2,
  ChevronRight,
  Loader2,
  RotateCcw,
  XCircle,
} from "lucide-react";
import { Panel, PanelHeader } from "@/components/ui/Panel";
import { Button } from "@/components/ui/Button";
import { fmtDate } from "@/lib/utils";

type Candidate = { id: string; label: string };

/**
 * Nachfolge-/Folgefahrzeug-Panel für ein auslaufendes Fahrzeug.
 * Bleibt der Mieter (Auto-Abo/Langzeit), kann hier ein Folgefahrzeug zugeteilt
 * werden — das legt automatisch einen Anschluss-Mietvertrag an. Alternativ:
 * läuft ersatzlos aus.
 */
export const SuccessorPanel = ({
  vehicleId,
  decommissionDate,
  status,
  stayingRenter,
  assignedVehicleLabel,
  assignedContractId,
  candidates,
}: {
  vehicleId: string;
  decommissionDate: string | null;
  status: string | null;
  stayingRenter: string | null;
  assignedVehicleLabel: string | null;
  assignedContractId: string | null;
  candidates: Candidate[];
}) => {
  const router = useRouter();
  const [picked, setPicked] = useState("");
  const [busy, setBusy] = useState<null | "assign" | "ersatzlos" | "reset">(null);
  const [error, setError] = useState<string | null>(null);

  const call = async (
    action: "assign" | "ersatzlos" | "reset",
    successor_vehicle_id?: string
  ) => {
    setError(null);
    setBusy(action);
    const res = await fetch(`/api/vehicles/${vehicleId}/successor`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, successor_vehicle_id }),
    });
    setBusy(null);
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setError(j.error || "Aktion fehlgeschlagen");
      return;
    }
    router.refresh();
  };

  return (
    <Panel flush>
      <PanelHeader Icon={ArrowRightLeft} title="Nachfolge / Folgefahrzeug" />
      <div className="p-5 space-y-4">
        {status === "zugeteilt" ? (
          <>
            <div className="flex items-start gap-3 rounded-panel border border-emerald-200 bg-emerald-50 px-4 py-3">
              <CheckCircle2 size={18} className="text-emerald-600 shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <div className="text-[13.5px] font-medium text-emerald-900">
                  Folgefahrzeug zugeteilt
                  {assignedVehicleLabel ? `: ${assignedVehicleLabel}` : ""}
                </div>
                <div className="text-[12.5px] text-emerald-800 mt-0.5">
                  {stayingRenter ? `${stayingRenter} ` : ""}wird auf dem Nachfolger
                  weitervermietet — der Anschluss-Vertrag wurde angelegt.
                </div>
                {assignedContractId && (
                  <Link
                    href={`/dashboard/contracts/${assignedContractId}`}
                    className="inline-flex items-center gap-1 text-[13px] font-medium text-emerald-700 hover:underline mt-2"
                  >
                    Anschluss-Vertrag öffnen <ChevronRight size={14} />
                  </Link>
                )}
              </div>
            </div>
            <div className="flex justify-end">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={busy != null}
                onClick={() => call("reset")}
              >
                {busy === "reset" ? (
                  <Loader2 size={13} className="animate-spin" />
                ) : (
                  <RotateCcw size={13} />
                )}
                Zuteilung zurücksetzen
              </Button>
            </div>
          </>
        ) : status === "ersatzlos" ? (
          <>
            <div className="flex items-start gap-3 rounded-panel border border-hairline bg-canvas px-4 py-3">
              <XCircle size={18} className="text-ink-muted shrink-0 mt-0.5" />
              <div className="text-[13.5px] text-ink">
                Dieses Fahrzeug läuft <span className="font-medium">ersatzlos</span> aus
                — keine Nachfolge vorgesehen.
              </div>
            </div>
            <div className="flex justify-end">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={busy != null}
                onClick={() => call("reset")}
              >
                {busy === "reset" ? (
                  <Loader2 size={13} className="animate-spin" />
                ) : (
                  <RotateCcw size={13} />
                )}
                Zurücksetzen
              </Button>
            </div>
          </>
        ) : (
          <>
            {stayingRenter ? (
              <p className="text-[13.5px] text-ink-soft">
                <span className="font-medium text-ink">{stayingRenter}</span> hat einen
                laufenden Vertrag auf diesem Fahrzeug. Weise ein Folgefahrzeug zu — daraus
                wird automatisch ein Anschluss-Mietvertrag ab dem Aussteuerungsdatum
                {decommissionDate ? ` (${fmtDate(decommissionDate)})` : ""} angelegt.
              </p>
            ) : (
              <p className="text-[13.5px] text-ink-soft">
                Aktuell kein laufender Mietvertrag auf diesem Fahrzeug — eine Nachfolge
                ist nur nötig, wenn ein Mieter bleibt. Das Fahrzeug kann ersatzlos
                auslaufen.
              </p>
            )}

            {stayingRenter && (
              <div className="flex flex-col sm:flex-row sm:items-end gap-3">
                <label className="block flex-1 min-w-0">
                  <div className="data-label mb-1">Folgefahrzeug</div>
                  <select
                    value={picked}
                    onChange={(e) => setPicked(e.target.value)}
                    className="field"
                    disabled={busy != null || candidates.length === 0}
                  >
                    <option value="">
                      {candidates.length === 0
                        ? "Kein freies Fahrzeug verfügbar"
                        : "Fahrzeug wählen…"}
                    </option>
                    {candidates.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </label>
                <Button
                  type="button"
                  variant="signal"
                  size="sm"
                  disabled={busy != null || !picked}
                  onClick={() => call("assign", picked)}
                >
                  {busy === "assign" ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <ArrowRightLeft size={14} />
                  )}
                  Zuteilen & Anschluss-Vertrag anlegen
                </Button>
              </div>
            )}

            <div className="flex justify-end pt-1 border-t border-hairline">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={busy != null}
                onClick={() => call("ersatzlos")}
                className="mt-3"
              >
                {busy === "ersatzlos" ? (
                  <Loader2 size={13} className="animate-spin" />
                ) : (
                  <XCircle size={13} />
                )}
                Läuft ersatzlos aus
              </Button>
            </div>
          </>
        )}

        {error && (
          <div className="text-[13px] text-red-700 bg-red-50 border border-red-200 rounded-panel px-3 py-2">
            {error}
          </div>
        )}
      </div>
    </Panel>
  );
};

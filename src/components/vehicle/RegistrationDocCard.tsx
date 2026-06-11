"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { FileText, Loader2, Trash2 } from "lucide-react";
import { Panel, PanelHeader } from "@/components/ui/Panel";
import { Button } from "@/components/ui/Button";
import { FileDrop } from "@/components/ui/FileDrop";

/**
 * Fahrzeugschein (Zulassungsbescheinigung Teil I) — Upload, Ansicht, Ersetzen,
 * Entfernen. Speichert über /api/vehicles/[id]/registration-doc.
 */
export const RegistrationDocCard = ({
  vehicleId,
  registrationDocPath,
}: {
  vehicleId: string;
  registrationDocPath: string | null;
}) => {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [replacing, setReplacing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const upload = async (files: File[]) => {
    const file = files[0];
    if (!file) return;
    setError(null);
    setBusy(true);
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch(`/api/vehicles/${vehicleId}/registration-doc`, {
      method: "POST",
      body: fd,
    });
    setBusy(false);
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setError(j.error || "Upload fehlgeschlagen");
      return;
    }
    setReplacing(false);
    router.refresh();
  };

  const remove = async () => {
    if (!confirm("Fahrzeugschein wirklich entfernen?")) return;
    setError(null);
    setBusy(true);
    const res = await fetch(`/api/vehicles/${vehicleId}/registration-doc`, {
      method: "DELETE",
    });
    setBusy(false);
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setError(j.error || "Entfernen fehlgeschlagen");
      return;
    }
    router.refresh();
  };

  return (
    <Panel flush>
      <PanelHeader Icon={FileText} title="Dokumente" />
      <div className="p-5 space-y-3">
        {registrationDocPath && !replacing ? (
          <div className="flex items-center gap-3 flex-wrap rounded-panel border border-hairline bg-canvas px-4 py-3">
            <div className="w-9 h-9 rounded-panel bg-paper border border-hairline text-signal flex items-center justify-center shrink-0">
              <FileText size={16} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[13.5px] font-medium text-ink">
                Fahrzeugschein hinterlegt
              </div>
              <div className="text-[12px] text-ink-muted">
                Zulassungsbescheinigung Teil I
              </div>
            </div>
            <div className="flex items-center gap-2">
              <a
                href={`/api/vehicles/${vehicleId}/registration-doc`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 rounded-btn font-medium tracking-tight h-8 px-3 text-[13px] text-ink-soft hover:bg-ink/5 border border-hairline"
              >
                Öffnen
              </a>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={busy}
                onClick={() => setReplacing(true)}
              >
                Ersetzen
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={busy}
                onClick={remove}
                className="text-red-600 hover:bg-red-50"
              >
                <Trash2 size={13} /> Entfernen
              </Button>
            </div>
          </div>
        ) : (
          <>
            <FileDrop
              onFiles={upload}
              accept="application/pdf,image/*"
              disabled={busy}
              label={
                registrationDocPath
                  ? "Neuen Fahrzeugschein hochladen (ersetzt den vorhandenen)"
                  : "Fahrzeugschein hochladen"
              }
              hint="PDF oder Foto, max 12 MB"
            />
            {replacing && (
              <button
                type="button"
                onClick={() => setReplacing(false)}
                className="text-[12.5px] text-ink-muted hover:text-ink"
              >
                Abbrechen
              </button>
            )}
          </>
        )}

        {busy && (
          <div className="inline-flex items-center gap-1.5 text-[12.5px] text-ink-muted">
            <Loader2 size={13} className="animate-spin" /> Wird übertragen…
          </div>
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

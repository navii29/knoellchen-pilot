"use client";

import { useCallback, useEffect, useState } from "react";
import { Images, Loader2, Trash2 } from "lucide-react";
import { Panel, PanelHeader } from "@/components/ui/Panel";
import { FileDrop } from "@/components/ui/FileDrop";

type PhotoItem = {
  id: string;
  created_at: string;
  url: string | null;
};

/**
 * Fotogalerie des tatsächlichen Fahrzeugs — lädt signierte URLs über
 * /api/vehicles/[id]/photos, Upload per FileDrop, Löschen mit Bestätigung.
 */
export const VehiclePhotosCard = ({ vehicleId }: { vehicleId: string }) => {
  const [photos, setPhotos] = useState<PhotoItem[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetch(`/api/vehicles/${vehicleId}/photos`);
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setError(j.error || "Fotos konnten nicht geladen werden");
      setPhotos([]);
      return;
    }
    const j = (await res.json()) as { photos: PhotoItem[] };
    setPhotos(j.photos || []);
  }, [vehicleId]);

  useEffect(() => {
    void load();
  }, [load]);

  const upload = async (files: File[]) => {
    if (!files.length) return;
    setError(null);
    setBusy(true);
    const fd = new FormData();
    for (const f of files) fd.append("file", f);
    const res = await fetch(`/api/vehicles/${vehicleId}/photos`, {
      method: "POST",
      body: fd,
    });
    setBusy(false);
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setError(j.error || "Upload fehlgeschlagen");
      return;
    }
    await load();
  };

  const remove = async (photoId: string) => {
    if (!confirm("Foto wirklich löschen?")) return;
    setError(null);
    const res = await fetch(`/api/vehicles/${vehicleId}/photos/${photoId}`, {
      method: "DELETE",
    });
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setError(j.error || "Löschen fehlgeschlagen");
      return;
    }
    await load();
  };

  return (
    <Panel flush>
      <PanelHeader
        Icon={Images}
        title={photos ? `Fotos (${photos.length})` : "Fotos"}
      />
      <div className="p-5 space-y-4">
        {photos === null ? (
          <div className="inline-flex items-center gap-1.5 text-[12.5px] text-ink-muted">
            <Loader2 size={13} className="animate-spin" /> Fotos werden geladen…
          </div>
        ) : photos.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {photos.map((p) => (
              <div key={p.id} className="relative group">
                {p.url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={p.url}
                    alt="Fahrzeugfoto"
                    className="w-full aspect-video object-cover rounded-panel border border-hairline bg-canvas"
                  />
                ) : (
                  <div className="w-full aspect-video rounded-panel border border-hairline bg-canvas flex items-center justify-center text-[11px] text-ink-muted">
                    Vorschau nicht verfügbar
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => remove(p.id)}
                  title="Foto löschen"
                  className="absolute top-1.5 right-1.5 w-7 h-7 rounded-full bg-white/90 border border-hairline text-ink-muted hover:text-red-600 items-center justify-center hidden group-hover:flex shadow-sm"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-[12.5px] text-ink-muted">
            Noch keine Fotos hinterlegt.
          </div>
        )}

        <FileDrop
          onFiles={upload}
          accept="image/*"
          multiple
          disabled={busy}
          label="Fotos hinzufügen"
          hint="JPG oder PNG, max 12 MB pro Foto"
        />

        {busy && (
          <div className="inline-flex items-center gap-1.5 text-[12.5px] text-ink-muted">
            <Loader2 size={13} className="animate-spin" /> Wird hochgeladen…
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

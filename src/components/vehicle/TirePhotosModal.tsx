"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Camera,
  Check,
  Loader2,
  Trash2,
  X,
} from "lucide-react";
import {
  TIRE_PHOTO_POSITIONS,
  type TirePhoto,
  type TirePhotoPosition,
  type VehicleTire,
} from "@/lib/tires";
import { Button } from "@/components/ui/Button";

type State = {
  status: "missing" | "uploading" | "uploaded" | "error";
  path?: string;
  error?: string;
};

export const TirePhotosModal = ({
  vehicleId,
  tire,
  initialPhotos,
  onClose,
}: {
  vehicleId: string;
  tire: VehicleTire;
  initialPhotos: TirePhoto[];
  onClose: () => void;
}) => {
  const router = useRouter();
  const [states, setStates] = useState<Record<TirePhotoPosition, State>>(() => {
    const init = {} as Record<TirePhotoPosition, State>;
    for (const p of TIRE_PHOTO_POSITIONS) {
      const existing = initialPhotos.find((x) => x.position === p.key);
      init[p.key] = existing
        ? { status: "uploaded", path: existing.photo_path }
        : { status: "missing" };
    }
    return init;
  });
  const refs = useRef<Record<TirePhotoPosition, HTMLInputElement | null>>(
    {} as Record<TirePhotoPosition, HTMLInputElement | null>
  );
  const [dragOver, setDragOver] = useState<TirePhotoPosition | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const upload = async (position: TirePhotoPosition, file: File) => {
    setStates((s) => ({ ...s, [position]: { status: "uploading" } }));
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("position", position);
      const res = await fetch(
        `/api/vehicles/${vehicleId}/tires/${tire.id}/photos`,
        { method: "POST", body: fd }
      );
      const j = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        path?: string;
        error?: string;
      };
      if (!res.ok || !j.ok) {
        setStates((s) => ({
          ...s,
          [position]: { status: "error", error: j.error ?? "Upload fehlgeschlagen" },
        }));
        return;
      }
      setStates((s) => ({
        ...s,
        [position]: { status: "uploaded", path: j.path },
      }));
    } catch {
      setStates((s) => ({
        ...s,
        [position]: { status: "error", error: "Netzwerkfehler" },
      }));
    }
  };

  const remove = async (position: TirePhotoPosition) => {
    if (!confirm("Foto entfernen?")) return;
    setStates((s) => ({ ...s, [position]: { status: "uploading" } }));
    try {
      const res = await fetch(
        `/api/vehicles/${vehicleId}/tires/${tire.id}/photos?position=${position}`,
        { method: "DELETE" }
      );
      if (!res.ok) {
        setStates((s) => ({
          ...s,
          [position]: { status: "error", error: "Loschen fehlgeschlagen" },
        }));
        return;
      }
      setStates((s) => ({ ...s, [position]: { status: "missing" } }));
    } catch {
      setStates((s) => ({
        ...s,
        [position]: { status: "error", error: "Netzwerkfehler" },
      }));
    }
  };

  const close = () => {
    onClose();
    router.refresh();
  };

  const photoUrl = (path: string) =>
    `/api/vehicles/${vehicleId}/tires/${tire.id}/photo-url?path=${encodeURIComponent(path)}`;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center px-0 sm:px-4">
      <button
        type="button"
        className="absolute inset-0 bg-void/60 backdrop-blur-sm"
        onClick={close}
        aria-label="Schliessen"
      />
      <div className="relative w-full sm:max-w-2xl max-h-[92vh] flex flex-col rounded-card border border-hairline bg-paper shadow-raised overflow-hidden">
        <div className="px-6 py-4 flex items-center justify-between border-b border-hairline shrink-0">
          <div className="min-w-0">
            <div className="kicker text-ink-muted mb-1">Reifen-Fotos</div>
            <h2 className="font-display text-xl tracking-tight font-bold text-ink mt-0.5 truncate">
              {[tire.brand, tire.model].filter(Boolean).join(" ") ||
                "Reifensatz"}
              {tire.size && (
                <span className="ml-2 text-ink-soft text-base font-mono">
                  {tire.size}
                </span>
              )}
            </h2>
          </div>
          <button
            onClick={close}
            className="w-9 h-9 rounded-full inline-flex items-center justify-center text-ink-muted hover:bg-canvas shrink-0"
          >
            <X size={16} />
          </button>
        </div>

        <div className="px-6 py-5 overflow-auto scroll-thin grow">
          <div className="text-[12.5px] text-ink-muted mb-3">
            6 Positionen verfügbar — vorhandene Fotos konnen ersetzt oder
            entfernt werden. Klick auf ein Bild offnet es in voller Grosse.
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {TIRE_PHOTO_POSITIONS.map((p) => {
              const state = states[p.key];
              const isUploaded = state.status === "uploaded";
              const isBusy = state.status === "uploading";
              const isError = state.status === "error";

              return (
                <div
                  key={p.key}
                  onDragOver={(e) => {
                    e.preventDefault();
                    if (!isBusy) setDragOver(p.key);
                  }}
                  onDragLeave={() => setDragOver((d) => (d === p.key ? null : d))}
                  onDrop={(e) => {
                    e.preventDefault();
                    setDragOver((d) => (d === p.key ? null : d));
                    if (isBusy) return;
                    const f = e.dataTransfer.files?.[0];
                    if (f) void upload(p.key, f);
                  }}
                  className={`relative rounded-card border overflow-hidden ${
                    dragOver === p.key
                      ? "ring-2 ring-signal/50 border-signal bg-signal/5"
                      : isUploaded
                      ? "border-emerald-200"
                      : isError
                      ? "border-red-200"
                      : "border-hairline"
                  }`}
                >
                  <input
                    ref={(el) => {
                      refs.current[p.key] = el;
                    }}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) void upload(p.key, f);
                    }}
                  />

                  {/* Thumbnail or empty slot */}
                  <div className="aspect-square bg-canvas flex items-center justify-center relative">
                    {isUploaded && state.path ? (
                      <a
                        href={photoUrl(state.path)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block w-full h-full"
                        aria-label="Foto in voller Grosse offnen"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={photoUrl(state.path)}
                          alt={p.label}
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                      </a>
                    ) : isBusy ? (
                      <Loader2 size={20} className="animate-spin text-ink-muted" />
                    ) : (
                      <Camera size={22} className="text-ink-muted" />
                    )}

                    {isUploaded && (
                      <button
                        type="button"
                        onClick={() => remove(p.key)}
                        className="absolute top-1.5 right-1.5 w-7 h-7 rounded-full bg-paper/90 border border-hairline text-ink-muted hover:text-red-700 hover:bg-paper inline-flex items-center justify-center shadow-sm"
                        aria-label="Foto entfernen"
                        title="Foto entfernen"
                      >
                        <Trash2 size={13} />
                      </button>
                    )}
                  </div>

                  {/* Footer with label + action */}
                  <div className="px-3 py-2 bg-paper">
                    <div className="text-[12.5px] font-medium text-ink leading-tight truncate">
                      {p.label}
                    </div>
                    <div
                      className={`text-[11px] mt-0.5 leading-tight truncate ${
                        isError ? "text-red-700" : "text-ink-muted"
                      }`}
                    >
                      {isError
                        ? state.error
                        : isUploaded
                        ? "Hochgeladen"
                        : isBusy
                        ? "Wird hochgeladen…"
                        : p.hint}
                    </div>
                    <button
                      type="button"
                      onClick={() => refs.current[p.key]?.click()}
                      disabled={isBusy}
                      className="mt-2 w-full inline-flex items-center justify-center gap-1 h-8 rounded-btn border border-hairline bg-paper text-[12px] text-ink-soft font-medium hover:bg-canvas disabled:opacity-40"
                    >
                      {isUploaded ? (
                        <>
                          <Camera size={11} /> Ersetzen
                        </>
                      ) : (
                        <>
                          <Camera size={11} /> {isError ? "Erneut versuchen" : "Foto aufnehmen"}
                        </>
                      )}
                    </button>
                    <div className="mt-1.5 text-center text-[10.5px] text-ink-muted leading-tight">
                      oder Datei hierher ziehen
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="px-6 py-4 flex items-center justify-end gap-3 border-t border-hairline shrink-0">
          <Button variant="signal" onClick={close}>
            <Check size={14} /> Fertig
          </Button>
        </div>
      </div>
    </div>
  );
};

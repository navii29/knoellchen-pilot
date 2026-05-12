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
          [position]: { status: "error", error: "Löschen fehlgeschlagen" },
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
        className="absolute inset-0 bg-stone-900/40 backdrop-blur-sm"
        onClick={close}
        aria-label="Schließen"
      />
      <div className="relative w-full sm:max-w-2xl max-h-[92vh] flex flex-col bg-white sm:rounded-2xl rounded-t-2xl shadow-2xl ring-1 ring-stone-200 overflow-hidden">
        <div className="px-6 py-4 flex items-center justify-between border-b border-stone-100 shrink-0">
          <div className="min-w-0">
            <div className="text-[11px] uppercase tracking-[0.08em] font-semibold text-teal-700">
              Reifen-Fotos
            </div>
            <h2 className="font-display text-xl tracking-tight font-medium mt-0.5 truncate">
              {[tire.brand, tire.model].filter(Boolean).join(" ") ||
                "Reifensatz"}
              {tire.size && (
                <span className="ml-2 text-stone-500 text-base font-mono">
                  {tire.size}
                </span>
              )}
            </h2>
          </div>
          <button
            onClick={close}
            className="w-9 h-9 rounded-full inline-flex items-center justify-center text-stone-500 hover:bg-stone-100 shrink-0"
          >
            <X size={16} />
          </button>
        </div>

        <div className="px-6 py-5 overflow-auto scroll-thin grow">
          <div className="text-[12.5px] text-stone-500 mb-3">
            6 Positionen verfügbar — vorhandene Fotos können ersetzt oder
            entfernt werden. Klick auf ein Bild öffnet es in voller Größe.
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
                  className={`relative rounded-2xl ring-1 overflow-hidden ${
                    isUploaded
                      ? "ring-emerald-200"
                      : isError
                      ? "ring-rose-200"
                      : "ring-stone-200"
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

                  {/* Thumbnail oder leerer Slot */}
                  <div className="aspect-square bg-stone-100 flex items-center justify-center relative">
                    {isUploaded && state.path ? (
                      <a
                        href={photoUrl(state.path)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block w-full h-full"
                        aria-label="Foto in voller Größe öffnen"
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
                      <Loader2 size={20} className="animate-spin text-stone-400" />
                    ) : (
                      <Camera size={22} className="text-stone-400" />
                    )}

                    {isUploaded && (
                      <button
                        type="button"
                        onClick={() => remove(p.key)}
                        className="absolute top-1.5 right-1.5 w-7 h-7 rounded-full bg-white/90 ring-1 ring-stone-200 text-stone-600 hover:text-rose-700 hover:bg-white inline-flex items-center justify-center shadow-sm"
                        aria-label="Foto entfernen"
                        title="Foto entfernen"
                      >
                        <Trash2 size={13} />
                      </button>
                    )}
                  </div>

                  {/* Footer mit Label + Action */}
                  <div className="px-3 py-2 bg-white">
                    <div className="text-[12.5px] font-medium text-stone-900 leading-tight truncate">
                      {p.label}
                    </div>
                    <div
                      className={`text-[11px] mt-0.5 leading-tight truncate ${
                        isError ? "text-rose-700" : "text-stone-500"
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
                      className="mt-2 w-full inline-flex items-center justify-center gap-1 h-8 rounded-md ring-1 ring-stone-200 bg-white text-[12px] text-stone-700 font-medium hover:bg-stone-50 disabled:opacity-40"
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
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="px-6 py-4 flex items-center justify-end gap-3 border-t border-stone-100 shrink-0">
          <button
            type="button"
            onClick={close}
            className="inline-flex items-center justify-center gap-1.5 h-10 px-5 rounded-full bg-stone-900 text-white text-sm font-medium hover:bg-stone-800"
          >
            <Check size={14} /> Fertig
          </button>
        </div>
      </div>
    </div>
  );
};

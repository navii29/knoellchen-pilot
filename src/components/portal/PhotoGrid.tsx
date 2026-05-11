"use client";

import { useEffect, useRef, useState } from "react";
import { Camera, Check, Loader2, RefreshCw } from "lucide-react";
import { POSITIONS } from "@/lib/handover";
import type { HandoverPosition } from "@/lib/types";

export type PhotoStatus = "missing" | "uploading" | "uploaded" | "error";

export type PhotoEntry = {
  position: HandoverPosition;
  status: PhotoStatus;
  errorMessage?: string;
};

export const PhotoGrid = ({
  contractId,
  uploadUrl,
  initialUploaded,
  onChange,
}: {
  contractId: string;
  uploadUrl: string;
  initialUploaded: HandoverPosition[];
  onChange?: (uploadedCount: number) => void;
}) => {
  const [entries, setEntries] = useState<Record<HandoverPosition, PhotoEntry>>(() => {
    const init = {} as Record<HandoverPosition, PhotoEntry>;
    for (const p of POSITIONS) {
      init[p.key] = {
        position: p.key,
        status: initialUploaded.includes(p.key) ? "uploaded" : "missing",
      };
    }
    return init;
  });
  const fileRefs = useRef<Record<HandoverPosition, HTMLInputElement | null>>(
    {} as Record<HandoverPosition, HTMLInputElement | null>
  );

  useEffect(() => {
    const count = Object.values(entries).filter((e) => e.status === "uploaded").length;
    onChange?.(count);
  }, [entries, onChange]);

  void contractId;

  const upload = async (position: HandoverPosition, file: File) => {
    setEntries((s) => ({
      ...s,
      [position]: { position, status: "uploading" },
    }));
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("position", position);
      const res = await fetch(uploadUrl, { method: "POST", body: fd });
      const j = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        error?: string;
      };
      if (!res.ok || !j.ok) {
        setEntries((s) => ({
          ...s,
          [position]: {
            position,
            status: "error",
            errorMessage: j.error ?? "Upload fehlgeschlagen",
          },
        }));
        return;
      }
      setEntries((s) => ({
        ...s,
        [position]: { position, status: "uploaded" },
      }));
    } catch {
      setEntries((s) => ({
        ...s,
        [position]: { position, status: "error", errorMessage: "Netzwerkfehler" },
      }));
    }
  };

  return (
    <div className="grid grid-cols-2 gap-2.5">
      {POSITIONS.map((p) => {
        const entry = entries[p.key];
        const isUploaded = entry.status === "uploaded";
        const isUploading = entry.status === "uploading";
        const isError = entry.status === "error";
        return (
          <button
            key={p.key}
            type="button"
            onClick={() => fileRefs.current[p.key]?.click()}
            disabled={isUploading}
            className={`relative rounded-2xl ring-1 px-3 py-4 text-left transition-all ${
              isUploaded
                ? "bg-emerald-50 ring-emerald-200"
                : isError
                ? "bg-rose-50 ring-rose-200"
                : "bg-white ring-stone-200 hover:ring-stone-300"
            } disabled:opacity-60`}
          >
            <input
              ref={(el) => {
                fileRefs.current[p.key] = el;
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
            <div className="flex items-center gap-2.5">
              <div
                className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                  isUploaded
                    ? "bg-emerald-100 text-emerald-700"
                    : isError
                    ? "bg-rose-100 text-rose-700"
                    : "bg-stone-100 text-stone-600"
                }`}
              >
                {isUploading ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : isUploaded ? (
                  <Check size={16} />
                ) : isError ? (
                  <RefreshCw size={16} />
                ) : (
                  <Camera size={16} />
                )}
              </div>
              <div className="min-w-0">
                <div className="text-[14px] font-medium text-stone-900 leading-tight">
                  {p.label}
                </div>
                <div
                  className={`text-[11.5px] mt-0.5 ${
                    isError ? "text-rose-700" : "text-stone-500"
                  } leading-tight truncate`}
                >
                  {isUploaded
                    ? "Hochgeladen"
                    : isUploading
                    ? "Wird hochgeladen…"
                    : isError
                    ? entry.errorMessage ?? "Fehler"
                    : p.hint}
                </div>
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
};

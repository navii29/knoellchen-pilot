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
  const [dragOver, setDragOver] = useState<HandoverPosition | null>(null);

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
            onDragOver={(e) => {
              e.preventDefault();
              if (!isUploading) setDragOver(p.key);
            }}
            onDragLeave={() => setDragOver((d) => (d === p.key ? null : d))}
            onDrop={(e) => {
              e.preventDefault();
              setDragOver((d) => (d === p.key ? null : d));
              if (isUploading) return;
              const f = e.dataTransfer.files?.[0];
              if (f) void upload(p.key, f);
            }}
            disabled={isUploading}
            className={`relative rounded-card border px-3 py-4 text-left transition-all ${
              dragOver === p.key
                ? "border-signal bg-signal/5 ring-2 ring-signal/50"
                : isUploaded
                ? "bg-canvas border-hairline"
                : isError
                ? "bg-rose-50 border-rose-200"
                : "bg-paper border-hairline hover:border-ink/20"
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
                className={`w-9 h-9 rounded-panel flex items-center justify-center shrink-0 ${
                  isUploaded
                    ? "bg-paper border border-hairline text-signal"
                    : isError
                    ? "bg-rose-100 border-rose-200 text-rose-700"
                    : "bg-canvas border border-hairline text-ink-muted"
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
                <div className="text-[13px] font-medium text-ink leading-tight">
                  {p.label}
                </div>
                <div
                  className={`text-[11px] mt-0.5 leading-tight truncate ${
                    isError ? "text-rose-700" : "text-ink-muted"
                  }`}
                >
                  {isUploaded
                    ? "Hochgeladen"
                    : isUploading
                    ? "Wird hochgeladen…"
                    : isError
                    ? entry.errorMessage ?? "Fehler"
                    : dragOver === p.key
                    ? "Datei hier ablegen"
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

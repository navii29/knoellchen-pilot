"use client";

import { useRef, useState } from "react";
import { AlertTriangle, Camera, Check, Loader2, RefreshCw } from "lucide-react";

export type ScanField = {
  label: string;
  value: string | null;
};

export const DocScanStep = ({
  uploadUrl,
  ctaLabel,
  exampleHint,
  onSuccess,
  parseFields,
}: {
  uploadUrl: string;
  ctaLabel: string;
  exampleHint: string;
  onSuccess: (parsed: Record<string, string | null>) => void;
  // Welche Felder im Result-Display angezeigt werden + wie das Parsed-Object darauf abgebildet wird
  parseFields: Array<{
    label: string;
    keys: string[]; // erste vorhandene wird genommen
    join?: string; // optional: mehrere Keys verbinden
  }>;
}) => {
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [parsed, setParsed] = useState<Record<string, unknown> | null>(null);

  const onFile = async (file: File) => {
    setError(null);
    setParsed(null);
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch(uploadUrl, { method: "POST", body: fd });
      const j = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        parsed?: Record<string, unknown>;
        error?: string;
      };
      if (!res.ok || !j.ok || !j.parsed) {
        setError(j.error ?? "Auslesung fehlgeschlagen");
        return;
      }
      setParsed(j.parsed);
    } catch {
      setError("Netzwerkfehler");
    } finally {
      setBusy(false);
    }
  };

  const renderValue = (keys: string[], join?: string): string | null => {
    if (!parsed) return null;
    if (join) {
      const parts = keys
        .map((k) => parsed[k])
        .filter((v) => typeof v === "string" && v.trim().length > 0) as string[];
      return parts.length > 0 ? parts.join(join) : null;
    }
    for (const k of keys) {
      const v = parsed[k];
      if (typeof v === "string" && v.trim().length > 0) return v;
    }
    return null;
  };

  if (parsed) {
    return (
      <div className="space-y-4">
        <div className="rounded-2xl bg-emerald-50 ring-1 ring-emerald-200 px-4 py-3 flex items-center gap-2 text-[13.5px] text-emerald-800">
          <Check size={14} />
          Daten erkannt — bitte prüfen
        </div>
        <div className="rounded-2xl bg-white ring-1 ring-stone-200 divide-y divide-stone-100">
          {parseFields.map((f) => {
            const value = renderValue(f.keys, f.join);
            return (
              <div key={f.label} className="px-4 py-2.5">
                <div className="text-[11px] uppercase tracking-wider text-stone-500 font-medium">
                  {f.label}
                </div>
                <div
                  className={`text-[14px] mt-0.5 ${
                    value ? "text-stone-900" : "text-stone-400"
                  }`}
                >
                  {value ?? "Nicht erkannt"}
                </div>
              </div>
            );
          })}
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => {
              setParsed(null);
              setError(null);
            }}
            className="text-sm text-stone-500 hover:text-stone-900 inline-flex items-center gap-1"
          >
            <RefreshCw size={13} /> Neu fotografieren
          </button>
          <div className="ml-auto">
            <button
              type="button"
              onClick={() => onSuccess(parsed as Record<string, string | null>)}
              className="inline-flex items-center gap-1.5 h-11 px-5 rounded-full bg-stone-900 text-white text-[14px] font-medium hover:bg-stone-800"
            >
              <Check size={14} /> Daten bestätigen
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl bg-stone-100 ring-1 ring-stone-200 px-4 py-6 text-center">
        <Camera size={26} className="mx-auto text-stone-500 mb-2" />
        <div className="text-[13px] text-stone-600 leading-snug">{exampleHint}</div>
      </div>

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void onFile(f);
        }}
      />

      <button
        type="button"
        onClick={() => fileRef.current?.click()}
        disabled={busy}
        className="w-full inline-flex items-center justify-center gap-1.5 h-12 rounded-full bg-stone-900 text-white text-[14.5px] font-medium hover:bg-stone-800 disabled:opacity-40"
      >
        {busy ? (
          <>
            <Loader2 size={16} className="animate-spin" /> Wird ausgelesen…
          </>
        ) : (
          <>
            <Camera size={16} /> {ctaLabel}
          </>
        )}
      </button>

      {error && (
        <div className="flex items-center gap-2 text-sm rounded-lg px-3 py-2 bg-rose-50 ring-1 ring-rose-200 text-rose-700">
          <AlertTriangle size={14} /> {error}
        </div>
      )}
    </div>
  );
};

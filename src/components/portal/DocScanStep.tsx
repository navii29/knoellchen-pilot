"use client";

import { useRef, useState } from "react";
import { AlertTriangle, Camera, Check, Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/Button";

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
        <div className="bg-canvas border border-hairline rounded-panel px-4 py-3 flex items-center gap-2 text-[13px] text-ink-soft">
          <Check size={14} className="text-signal" />
          Daten erkannt — bitte prüfen
        </div>
        <div className="bg-paper border border-hairline rounded-card divide-y divide-hairline">
          {parseFields.map((f) => {
            const value = renderValue(f.keys, f.join);
            return (
              <div key={f.label} className="px-4 py-2.5">
                <div className="data-label mb-0.5">{f.label}</div>
                <div
                  className={`text-[14px] mt-0.5 ${
                    value ? "text-ink" : "text-ink-muted"
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
            className="text-[13px] text-ink-muted hover:text-ink inline-flex items-center gap-1 transition-colors"
          >
            <RefreshCw size={13} /> Neu fotografieren
          </button>
          <div className="ml-auto">
            <Button
              type="button"
              variant="signal"
              size="md"
              onClick={() => onSuccess(parsed as Record<string, string | null>)}
            >
              <Check size={14} /> Daten bestätigen
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="bg-canvas border border-hairline rounded-card px-4 py-6 text-center">
        <Camera size={24} className="mx-auto text-ink-muted mb-2" />
        <div className="text-[13px] text-ink-soft leading-snug">{exampleHint}</div>
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

      <Button
        type="button"
        variant="signal"
        size="lg"
        onClick={() => fileRef.current?.click()}
        disabled={busy}
        className="w-full"
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
      </Button>

      {error && (
        <div className="flex items-center gap-2 text-[13px] rounded-input px-3 py-2 bg-rose-50 border border-rose-200 text-rose-700">
          <AlertTriangle size={14} /> {error}
        </div>
      )}
    </div>
  );
};

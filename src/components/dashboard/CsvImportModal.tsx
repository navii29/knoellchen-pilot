"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Check,
  FileSpreadsheet,
  Loader2,
  Sparkles,
  UploadCloud,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { FileDrop } from "@/components/ui/FileDrop";
import { decodeCsvFile } from "@/lib/encoding";

export type FieldDef = {
  key: string;
  label: string;
  hint?: string;
  required?: boolean;
};

type AnalyzeResponse = {
  ok: boolean;
  headers: string[];
  sample_rows: Record<string, string>[];
  total_rows: number;
  mapping: Record<string, string | null>;
  reasoning: string;
  target_fields: FieldDef[];
  error?: string;
};

type CommitResponse = {
  ok: boolean;
  inserted: number;
  skipped: number;
  results: { row_index: number; ok: boolean; error?: string }[];
  error?: string;
};

export const CsvImportModal = ({
  title,
  endpoint,
  onClose,
}: {
  title: string;
  endpoint: string;
  onClose: () => void;
}) => {
  const router = useRouter();
  const [csvText, setCsvText] = useState<string | null>(null);
  const [csvFileName, setCsvFileName] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<AnalyzeResponse | null>(null);
  const [mapping, setMapping] = useState<Record<string, string | null>>({});
  const [committing, setCommitting] = useState(false);
  const [commitResult, setCommitResult] = useState<CommitResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const onFile = async (file: File) => {
    setError(null);
    setAnalyzing(true);
    setCommitResult(null);
    try {
      const text = await decodeCsvFile(file);
      setCsvText(text);
      setCsvFileName(file.name);
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch(`${endpoint}?action=analyze`, {
        method: "POST",
        body: fd,
      });
      const j = (await res.json().catch(() => ({}))) as AnalyzeResponse;
      if (!res.ok || !j.ok) {
        setError(j.error ?? "Analyse fehlgeschlagen");
        setAnalyzing(false);
        return;
      }
      setAnalysis(j);
      setMapping(j.mapping);
    } catch {
      setError("Datei konnte nicht gelesen werden");
    } finally {
      setAnalyzing(false);
    }
  };

  const commit = async () => {
    if (!csvText || !analysis) return;
    setCommitting(true);
    setError(null);
    try {
      const res = await fetch(`${endpoint}?action=commit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ csv_text: csvText, mapping }),
      });
      const j = (await res.json().catch(() => ({}))) as CommitResponse;
      if (!res.ok || !j.ok) {
        setError(j.error ?? "Import fehlgeschlagen");
        return;
      }
      setCommitResult(j);
      router.refresh();
    } finally {
      setCommitting(false);
    }
  };

  const reset = () => {
    setAnalysis(null);
    setMapping({});
    setCsvText(null);
    setCsvFileName(null);
    setCommitResult(null);
    setError(null);
  };

  // ───── Subviews ─────
  const renderUpload = () => (
    <div className="px-6 py-8">
      <FileDrop
        onFiles={(files) => {
          const f = files[0];
          if (f) void onFile(f);
        }}
        accept=".csv,text/csv,text/plain"
        multiple={false}
        disabled={analyzing}
        label="CSV-Datei auswählen"
        className="!bg-canvas px-5 py-8"
      >
        <div className="text-center">
          <div className="inline-flex w-12 h-12 rounded-panel border border-hairline bg-paper items-center justify-center text-ink-muted mb-3">
            <UploadCloud size={20} />
          </div>
          <div className="text-[15px] font-medium text-ink">
            CSV-Datei auswählen oder hierher ziehen
          </div>
          <p className="text-[12.5px] text-ink-muted mt-1.5 max-w-sm mx-auto leading-snug">
            Beliebige Spaltenbenennung — die Software ordnet die Spalten automatisch
            den richtigen Feldern zu. Trennzeichen (Komma, Semikolon, Tab) werden
            erkannt.
          </p>
          <span className="mt-5 inline-flex items-center gap-1.5 rounded-btn border border-hairline bg-paper px-3.5 py-2 text-[13px] font-medium text-ink">
            {analyzing ? (
              <>
                <Loader2 size={14} className="animate-spin" />
                Analysiere…
              </>
            ) : (
              <>
                <FileSpreadsheet size={14} />
                CSV auswählen
              </>
            )}
          </span>
        </div>
      </FileDrop>

      {error && (
        <div className="mt-4 flex items-center gap-2 text-[13px] rounded-panel px-3 py-2 bg-red-50 border border-red-200 text-red-700">
          <AlertTriangle size={14} /> {error}
        </div>
      )}
    </div>
  );

  const renderMapping = () => {
    if (!analysis) return null;
    const fieldOptions = analysis.target_fields;
    const isFieldUsed = (key: string) =>
      Object.values(mapping).filter((v) => v === key).length;

    return (
      <div className="px-6 py-5 space-y-4">
        <div className="rounded-panel border border-hairline bg-canvas px-4 py-3">
          <div className="flex items-center gap-2 text-[13.5px] font-medium text-ink">
            <Sparkles size={14} className="text-signal" /> Software-Mapping erstellt
          </div>
          {analysis.reasoning && (
            <div className="text-[12px] text-ink-soft mt-1 leading-snug">
              {analysis.reasoning}
            </div>
          )}
          <div className="text-[11.5px] text-ink-muted mt-1.5 font-mono tnum">
            Datei: <span className="font-mono">{csvFileName}</span> ·{" "}
            {analysis.total_rows} Zeilen · {analysis.headers.length} Spalten
          </div>
        </div>

        <div className="rounded-panel border border-hairline overflow-hidden">
          <div className="grid grid-cols-[1fr_24px_1fr_minmax(0,2fr)] gap-2 items-center px-4 py-2.5 bg-canvas border-b border-hairline th">
            <div>CSV-Spalte</div>
            <div />
            <div>Ziel-Feld</div>
            <div>Beispiel</div>
          </div>
          {analysis.headers.map((h) => {
            const value = mapping[h] ?? "";
            const used = value ? isFieldUsed(value) : 0;
            const sample =
              analysis.sample_rows.find((r) => r[h] && r[h].trim() !== "")?.[h] ?? "";
            return (
              <div
                key={h}
                className="grid grid-cols-[1fr_24px_1fr_minmax(0,2fr)] gap-2 items-center px-4 py-2 border-b border-hairline last:border-0"
              >
                <div className="font-mono text-[12.5px] text-ink truncate">
                  {h}
                </div>
                <div className="text-ink-muted flex items-center justify-center">
                  <ArrowRight size={12} />
                </div>
                <div>
                  <select
                    value={value}
                    onChange={(e) =>
                      setMapping((m) => ({ ...m, [h]: e.target.value || null }))
                    }
                    className={`field ${used > 1 ? "border-amber-300" : ""}`}
                  >
                    <option value="">— ignorieren —</option>
                    {fieldOptions.map((f) => (
                      <option key={f.key} value={f.key}>
                        {f.label}
                        {f.required ? " *" : ""}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="text-[12px] text-ink-muted truncate">
                  {sample || (
                    <span className="text-ink-muted opacity-50">— kein Beispiel —</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {fieldOptions
          .filter((f) => f.required)
          .filter((f) => !Object.values(mapping).includes(f.key))
          .map((f) => (
            <div
              key={f.key}
              className="flex items-center gap-2 text-[13px] rounded-panel px-3 py-2 bg-amber-50 border border-amber-200 text-amber-900"
            >
              <AlertTriangle size={14} />
              Pflichtfeld <strong>{f.label}</strong> ist noch keiner Spalte
              zugeordnet.
            </div>
          ))}

        {error && (
          <div className="flex items-center gap-2 text-[13px] rounded-panel px-3 py-2 bg-red-50 border border-red-200 text-red-700">
            <AlertTriangle size={14} /> {error}
          </div>
        )}
      </div>
    );
  };

  const renderResult = () => {
    if (!commitResult) return null;
    const errors = commitResult.results.filter((r) => !r.ok);
    return (
      <div className="px-6 py-6 space-y-4">
        <div className="rounded-panel border border-hairline bg-canvas px-5 py-4 flex items-center gap-3">
          <div className="w-11 h-11 rounded-panel border border-hairline bg-paper flex items-center justify-center shrink-0">
            <Check size={20} className="text-signal" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-display font-bold text-[18px] text-ink leading-tight">
              {commitResult.inserted} Datensätze importiert
            </div>
            {commitResult.skipped > 0 && (
              <div className="text-[12.5px] text-ink-muted mt-0.5">
                {commitResult.skipped} Zeilen übersprungen — siehe unten.
              </div>
            )}
          </div>
        </div>

        {errors.length > 0 && (
          <div className="rounded-panel border border-hairline overflow-hidden">
            <div className="px-4 py-2 bg-canvas border-b border-hairline th">
              Übersprungene Zeilen
            </div>
            <div className="max-h-48 overflow-auto">
              {errors.map((e) => (
                <div
                  key={e.row_index}
                  className="px-4 py-1.5 text-[12.5px] text-ink border-b border-hairline last:border-0 flex items-center gap-3"
                >
                  <span className="font-mono text-ink-muted tnum">#{e.row_index}</span>
                  <span className="text-red-700">{e.error}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  // ───── Footer ─────
  const renderFooter = () => {
    if (commitResult) {
      return (
        <>
          <button
            type="button"
            onClick={reset}
            className="text-[13px] text-ink-muted hover:text-ink px-3"
          >
            Weitere CSV importieren
          </button>
          <Button variant="ink" size="sm" onClick={onClose}>
            Fertig
          </Button>
        </>
      );
    }
    if (analysis) {
      return (
        <>
          <button
            type="button"
            onClick={reset}
            className="inline-flex items-center gap-1 text-[13px] text-ink-muted hover:text-ink px-2"
          >
            <ArrowLeft size={13} /> Andere Datei
          </button>
          <Button variant="signal" size="sm" onClick={commit} disabled={committing}>
            {committing ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <Check size={14} />
            )}
            {analysis.total_rows} Datensätze importieren
          </Button>
        </>
      );
    }
    return (
      <button
        type="button"
        onClick={onClose}
        className="text-[13px] text-ink-muted hover:text-ink px-3"
      >
        Abbrechen
      </button>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center px-0 sm:px-4">
      <button
        type="button"
        className="absolute inset-0 bg-ink/40 backdrop-blur-sm"
        onClick={onClose}
        aria-label="Schließen"
      />
      <div className="relative w-full sm:max-w-2xl max-h-[92vh] flex flex-col bg-paper sm:rounded-card rounded-t-card shadow-panel border border-hairline overflow-hidden">
        <div className="px-6 py-4 flex items-center justify-between border-b border-hairline shrink-0">
          <div>
            <div className="kicker text-ink-muted mb-1">CSV-Import</div>
            <h2 className="font-display font-bold text-[18px] tracking-tight text-ink mt-0.5">
              {title}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-btn inline-flex items-center justify-center text-ink-muted hover:bg-canvas"
          >
            <X size={16} />
          </button>
        </div>

        <div className="overflow-auto scroll-thin grow">
          {commitResult
            ? renderResult()
            : analysis
            ? renderMapping()
            : renderUpload()}
        </div>

        <div className="px-6 py-4 flex items-center justify-end gap-3 border-t border-hairline shrink-0">
          {renderFooter()}
        </div>
      </div>
    </div>
  );
};

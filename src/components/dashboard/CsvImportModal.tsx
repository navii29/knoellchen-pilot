"use client";

import { useRef, useState } from "react";
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
  endpoint: string; // z. B. /api/customers/import-csv
  onClose: () => void;
}) => {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
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
      const text = await file.text();
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
    if (fileRef.current) fileRef.current.value = "";
  };

  // ───── Subviews ─────
  const renderUpload = () => (
    <div className="px-6 py-8">
      <div className="rounded-2xl ring-1 ring-zinc-200 bg-zinc-50 px-5 py-8 text-center">
        <div className="inline-flex w-12 h-12 rounded-xl bg-white ring-1 ring-zinc-200 items-center justify-center text-zinc-600 mb-3">
          <UploadCloud size={20} />
        </div>
        <div className="text-[15px] font-medium text-zinc-900">
          CSV-Datei auswählen
        </div>
        <p className="text-[12.5px] text-zinc-500 mt-1.5 max-w-sm mx-auto leading-snug">
          Beliebige Spaltenbenennung — die KI ordnet die Spalten automatisch
          den richtigen Feldern zu. Trennzeichen (Komma, Semikolon, Tab) werden
          erkannt.
        </p>
        <input
          ref={fileRef}
          type="file"
          accept=".csv,text/csv,text/plain"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void onFile(f);
          }}
        />
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={analyzing}
          className="mt-5 inline-flex items-center justify-center gap-1.5 h-11 px-5 rounded-full bg-zinc-900 text-white text-[14px] font-medium hover:bg-zinc-800 disabled:opacity-40"
        >
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
        </button>
      </div>

      {error && (
        <div className="mt-4 flex items-center gap-2 text-sm rounded-lg px-3 py-2 bg-rose-50 ring-1 ring-rose-200 text-rose-700">
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
        <div className="rounded-xl bg-emerald-50 ring-1 ring-emerald-200 px-4 py-3">
          <div className="flex items-center gap-2 text-[13.5px] font-medium text-emerald-800">
            <Sparkles size={14} /> KI-Mapping erstellt
          </div>
          {analysis.reasoning && (
            <div className="text-[12px] text-emerald-700 mt-1 leading-snug">
              {analysis.reasoning}
            </div>
          )}
          <div className="text-[11.5px] text-emerald-700 mt-1.5">
            Datei: <span className="font-mono">{csvFileName}</span> ·{" "}
            {analysis.total_rows} Zeilen · {analysis.headers.length} Spalten
          </div>
        </div>

        <div className="rounded-xl ring-1 ring-zinc-200 overflow-hidden">
          <div className="grid grid-cols-[1fr_24px_1fr_minmax(0,2fr)] gap-2 items-center px-4 py-2.5 bg-zinc-50 border-b border-zinc-200 text-[10.5px] uppercase tracking-wider text-zinc-500 font-semibold">
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
                className="grid grid-cols-[1fr_24px_1fr_minmax(0,2fr)] gap-2 items-center px-4 py-2 border-b border-zinc-100 last:border-0"
              >
                <div className="font-mono text-[12.5px] text-zinc-800 truncate">
                  {h}
                </div>
                <div className="text-zinc-400 flex items-center justify-center">
                  <ArrowRight size={12} />
                </div>
                <div>
                  <select
                    value={value}
                    onChange={(e) =>
                      setMapping((m) => ({ ...m, [h]: e.target.value || null }))
                    }
                    className={`w-full h-9 px-2.5 rounded-md text-[13px] bg-white outline-none ${
                      used > 1
                        ? "ring-1 ring-amber-300"
                        : "ring-1 ring-zinc-200"
                    } focus:ring-2 focus:ring-indigo-500/40`}
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
                <div className="text-[12px] text-zinc-500 truncate">
                  {sample || (
                    <span className="text-zinc-300">— kein Beispiel —</span>
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
              className="flex items-center gap-2 text-[13px] rounded-lg px-3 py-2 bg-amber-50 ring-1 ring-amber-200 text-amber-900"
            >
              <AlertTriangle size={14} />
              Pflichtfeld <strong>{f.label}</strong> ist noch keiner Spalte
              zugeordnet.
            </div>
          ))}

        {error && (
          <div className="flex items-center gap-2 text-sm rounded-lg px-3 py-2 bg-rose-50 ring-1 ring-rose-200 text-rose-700">
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
        <div className="rounded-2xl bg-emerald-50 ring-1 ring-emerald-200 px-5 py-4 flex items-center gap-3">
          <div className="w-11 h-11 rounded-full bg-white flex items-center justify-center shrink-0">
            <Check size={20} className="text-emerald-700" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-display text-[18px] text-emerald-900 leading-tight">
              {commitResult.inserted} Datensätze importiert
            </div>
            {commitResult.skipped > 0 && (
              <div className="text-[12.5px] text-emerald-700 mt-0.5">
                {commitResult.skipped} Zeilen übersprungen — siehe unten.
              </div>
            )}
          </div>
        </div>

        {errors.length > 0 && (
          <div className="rounded-xl ring-1 ring-zinc-200 overflow-hidden">
            <div className="px-4 py-2 bg-zinc-50 border-b border-zinc-200 text-[11px] uppercase tracking-wider text-zinc-500 font-semibold">
              Übersprungene Zeilen
            </div>
            <div className="max-h-48 overflow-auto">
              {errors.map((e) => (
                <div
                  key={e.row_index}
                  className="px-4 py-1.5 text-[12.5px] text-zinc-700 border-b border-zinc-100 last:border-0 flex items-center gap-3"
                >
                  <span className="font-mono text-zinc-400">#{e.row_index}</span>
                  <span className="text-rose-700">{e.error}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  // ───── Footer (Action Buttons je Phase) ─────
  const renderFooter = () => {
    if (commitResult) {
      return (
        <>
          <button
            type="button"
            onClick={reset}
            className="text-sm text-zinc-500 hover:text-zinc-800 px-3"
          >
            Weitere CSV importieren
          </button>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center justify-center gap-1.5 h-10 px-5 rounded-full bg-zinc-900 text-white text-sm font-medium hover:bg-zinc-800"
          >
            Fertig
          </button>
        </>
      );
    }
    if (analysis) {
      return (
        <>
          <button
            type="button"
            onClick={reset}
            className="inline-flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-800 px-2"
          >
            <ArrowLeft size={13} /> Andere Datei
          </button>
          <button
            type="button"
            onClick={commit}
            disabled={committing}
            className="inline-flex items-center justify-center gap-1.5 h-10 px-5 rounded-full bg-zinc-900 text-white text-sm font-medium hover:bg-zinc-800 disabled:opacity-40"
          >
            {committing ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <Check size={14} />
            )}
            {analysis.total_rows} Datensätze importieren
          </button>
        </>
      );
    }
    return (
      <button
        type="button"
        onClick={onClose}
        className="text-sm text-zinc-500 hover:text-zinc-800 px-3"
      >
        Abbrechen
      </button>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center px-0 sm:px-4">
      <button
        type="button"
        className="absolute inset-0 bg-zinc-900/40 backdrop-blur-sm"
        onClick={onClose}
        aria-label="Schließen"
      />
      <div className="relative w-full sm:max-w-2xl max-h-[92vh] flex flex-col bg-white sm:rounded-2xl rounded-t-2xl shadow-2xl ring-1 ring-zinc-200 overflow-hidden">
        <div className="px-6 py-4 flex items-center justify-between border-b border-zinc-100 shrink-0">
          <div>
            <div className="text-[11px] uppercase tracking-[0.08em] font-semibold text-indigo-700">
              CSV-Import
            </div>
            <h2 className="font-display text-xl tracking-tight font-medium mt-0.5">
              {title}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full inline-flex items-center justify-center text-zinc-500 hover:bg-zinc-100"
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

        <div className="px-6 py-4 flex items-center justify-end gap-3 border-t border-zinc-100 shrink-0">
          {renderFooter()}
        </div>
      </div>
    </div>
  );
};

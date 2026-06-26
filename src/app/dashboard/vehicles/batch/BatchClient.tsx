"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  FileText,
  Loader2,
  Sparkles,
  Upload,
  X,
} from "lucide-react";
import { FileDrop } from "@/components/ui/FileDrop";
import { Panel, PanelHeader } from "@/components/ui/Panel";
import { Button } from "@/components/ui/Button";
import { Plate } from "@/components/ui/Plate";

type Existing = {
  id: string;
  label: string;
  plate: string;
  current: Record<string, string | number | null>;
};
type Item = {
  source_file: string;
  fields: Record<string, string>;
  registration_data: Record<string, unknown> | null;
  confidence: number | null;
  existing: Existing | null;
};
type Row = Item & {
  include: boolean;
  status: "todo" | "done" | "merged" | "error";
  message?: string;
};

export const BatchClient = () => {
  const router = useRouter();
  const [files, setFiles] = useState<File[]>([]);
  const [parsing, setParsing] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);
  const [fileErrors, setFileErrors] = useState<{ file: string; error: string }[]>([]);
  const [rows, setRows] = useState<Row[]>([]);
  const [creating, setCreating] = useState(false);

  const addFiles = (fs: File[]) => {
    setFiles((prev) => [...prev, ...fs]);
    setRows([]);
  };

  const parse = async () => {
    if (files.length === 0) return;
    setParsing(true);
    setParseError(null);
    setFileErrors([]);
    setRows([]);
    try {
      const fd = new FormData();
      files.forEach((f) => fd.append("file", f));
      const res = await fetch("/api/vehicles/parse-registration-batch", {
        method: "POST",
        body: fd,
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) {
        setParseError(j.error || "Auslesen fehlgeschlagen");
        return;
      }
      setFileErrors(j.file_errors ?? []);
      setRows(
        ((j.vehicles ?? []) as Item[]).map((it) => ({
          ...it,
          include: true,
          status: "todo" as const,
        }))
      );
    } catch (e) {
      setParseError(e instanceof Error ? e.message : "Auslesen fehlgeschlagen");
    } finally {
      setParsing(false);
    }
  };

  const createOne = async (row: Row): Promise<Row> => {
    // Vorhandenes Kennzeichen → nur fehlende Felder ergänzen.
    if (row.existing) {
      const patch: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(row.fields)) {
        if (!(k in row.existing.current)) continue;
        const cur = row.existing.current[k];
        const empty = cur === null || cur === undefined || cur === "";
        if (empty && v.trim() !== "") patch[k] = v;
      }
      if (row.registration_data) patch.registration_data = row.registration_data;
      const res = await fetch(`/api/vehicles/${row.existing.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        return { ...row, status: "error", message: j.error || "Ergänzen fehlgeschlagen" };
      }
      return { ...row, status: "merged", message: `Ergänzt: ${row.existing.label}` };
    }
    // Neu anlegen.
    if (!row.fields.plate?.trim()) {
      return { ...row, status: "error", message: "Kein Kennzeichen erkannt — manuell anlegen" };
    }
    const res = await fetch("/api/vehicles", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...row.fields, registration_data: row.registration_data }),
    });
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      return { ...row, status: "error", message: j.error || "Anlegen fehlgeschlagen" };
    }
    return { ...row, status: "done", message: "Angelegt" };
  };

  const createAll = async () => {
    setCreating(true);
    const next = [...rows];
    for (let i = 0; i < next.length; i++) {
      if (!next[i].include || next[i].status === "done" || next[i].status === "merged") continue;
      next[i] = await createOne(next[i]);
      setRows([...next]);
    }
    setCreating(false);
    router.refresh();
  };

  const selectedCount = rows.filter((r) => r.include && r.status === "todo").length;
  const doneCount = rows.filter((r) => r.status === "done" || r.status === "merged").length;

  return (
    <>
      <Link
        href="/dashboard/vehicles"
        className="inline-flex items-center gap-1.5 text-sm text-ink-muted hover:text-ink mb-4"
      >
        <ArrowLeft size={14} /> Zurück zu Fahrzeugen
      </Link>

      <div className="font-display font-bold text-2xl tracking-tight text-ink">
        Mehrere Fahrzeugscheine einlesen
      </div>
      <p className="text-sm text-ink-soft mt-1">
        Lade mehrere Dateien oder ein mehrseitiges PDF (je Seite ein Auto) hoch. Die Software liest
        jeden Schein einzeln aus; du prüfst und legst alle auf einmal an.
      </p>

      <Panel flush className="mt-6">
        <PanelHeader title="Dateien" />
        <div className="p-5 space-y-3">
          <FileDrop
            onFiles={addFiles}
            accept="application/pdf,image/jpeg,image/png,image/webp"
            multiple
            disabled={parsing}
            label="Fahrzeugscheine hierher ziehen oder klicken (mehrere möglich)"
            hint="PDF, JPG, PNG, WebP · bis 12 Dateien · je max 12 MB"
          />
          {files.length > 0 && (
            <div className="space-y-1.5">
              {files.map((f, i) => (
                <div
                  key={`${f.name}-${i}`}
                  className="flex items-center gap-2 text-[13px] bg-canvas border border-hairline rounded-frame px-3 py-2"
                >
                  <FileText size={15} className="text-ink-muted shrink-0" />
                  <span className="truncate flex-1">{f.name}</span>
                  <button
                    type="button"
                    onClick={() => setFiles((prev) => prev.filter((_, j) => j !== i))}
                    className="text-ink-muted hover:text-ink shrink-0"
                    aria-label="Entfernen"
                  >
                    <X size={15} />
                  </button>
                </div>
              ))}
            </div>
          )}
          <div className="flex items-center gap-3">
            <Button variant="signal" size="sm" disabled={parsing || files.length === 0} onClick={parse}>
              {parsing ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
              {parsing ? "Wird ausgelesen…" : "Auslesen"}
            </Button>
            {files.length > 0 && !parsing && (
              <button
                type="button"
                onClick={() => {
                  setFiles([]);
                  setRows([]);
                }}
                className="text-[13px] text-ink-muted hover:text-ink"
              >
                Alle entfernen
              </button>
            )}
          </div>
          {parseError && (
            <div className="text-[13px] text-red-700 bg-red-50 border border-red-200 rounded-frame px-3 py-2">
              {parseError}
            </div>
          )}
          {fileErrors.map((fe) => (
            <div
              key={fe.file}
              className="text-[12.5px] text-amber-800 bg-amber-50 border border-amber-200 rounded-frame px-3 py-1.5"
            >
              {fe.file}: {fe.error}
            </div>
          ))}
        </div>
      </Panel>

      {rows.length > 0 && (
        <Panel flush className="mt-6 overflow-hidden">
          <PanelHeader
            title={`${rows.length} Fahrzeug${rows.length === 1 ? "" : "e"} erkannt`}
          />
          <div className="divide-y divide-hairline">
            {rows.map((r, i) => (
              <div key={i} className="flex items-center gap-3 px-5 py-3 text-[13px]">
                <input
                  type="checkbox"
                  checked={r.include}
                  disabled={r.status === "done" || r.status === "merged"}
                  onChange={(e) =>
                    setRows((prev) =>
                      prev.map((x, j) => (j === i ? { ...x, include: e.target.checked } : x))
                    )
                  }
                  className="h-4 w-4 rounded border-hairline text-signal focus:ring-signal shrink-0"
                />
                <div className="shrink-0">
                  {r.fields.plate ? (
                    <Plate value={r.fields.plate} size="sm" />
                  ) : (
                    <span className="text-[12px] text-amber-700">kein Kennzeichen</span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-ink truncate">
                    {[r.fields.manufacturer, r.fields.model].filter(Boolean).join(" ") || "—"}
                    {r.fields.power_ps ? (
                      <span className="text-ink-muted"> · {r.fields.power_ps} PS</span>
                    ) : null}
                    {r.fields.fuel_type ? (
                      <span className="text-ink-muted"> · {r.fields.fuel_type}</span>
                    ) : null}
                  </div>
                  <div className="text-[11px] text-ink-muted truncate">
                    {r.source_file}
                    {r.existing ? (
                      <span className="text-amber-700"> · ergänzt vorhandenes ({r.existing.label})</span>
                    ) : (
                      <span className="text-emerald-700"> · neu</span>
                    )}
                  </div>
                </div>
                <div className="shrink-0 w-32 text-right">
                  {r.status === "done" && (
                    <span className="inline-flex items-center gap-1 text-emerald-700 text-[12px]">
                      <CheckCircle2 size={13} /> Angelegt
                    </span>
                  )}
                  {r.status === "merged" && (
                    <span className="inline-flex items-center gap-1 text-emerald-700 text-[12px]">
                      <CheckCircle2 size={13} /> Ergänzt
                    </span>
                  )}
                  {r.status === "error" && (
                    <span
                      title={r.message}
                      className="inline-flex items-center gap-1 text-red-700 text-[12px]"
                    >
                      <AlertTriangle size={13} /> Fehler
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
          <div className="flex items-center justify-between gap-3 px-5 py-3 border-t border-hairline">
            <span className="text-[12.5px] text-ink-muted">
              {doneCount > 0 ? `${doneCount} fertig · ` : ""}
              {selectedCount} ausgewählt
            </span>
            <div className="flex items-center gap-3">
              {doneCount > 0 && (
                <Link href="/dashboard/vehicles" className="text-[13px] text-signal hover:underline">
                  Zu den Fahrzeugen
                </Link>
              )}
              <Button
                variant="signal"
                size="sm"
                disabled={creating || selectedCount === 0}
                onClick={createAll}
              >
                {creating ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
                {selectedCount} Fahrzeug{selectedCount === 1 ? "" : "e"} anlegen
              </Button>
            </div>
          </div>
        </Panel>
      )}
    </>
  );
};

"use client";

import { useCallback, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Check,
  CheckCircle2,
  FileStack,
  FileText,
  Mail,
  ScanText,
  Upload,
  UploadCloud,
  UserCheck,
  X,
} from "lucide-react";
import { Topbar } from "@/components/dashboard/Topbar";
import { THEME } from "@/lib/theme";

type Phase = "idle" | "uploading" | "ocr" | "matching" | "done" | "error";

const PHASES: Array<{ key: Exclude<Phase, "idle" | "done" | "error">; label: string; Icon: typeof Upload }> = [
  { key: "uploading", label: "Datei wird hochgeladen", Icon: Upload },
  { key: "ocr", label: "KI liest Daten aus", Icon: ScanText },
  { key: "matching", label: "Fahrer wird zugeordnet", Icon: UserCheck },
];

export const UploadClient = ({ inboundEmail }: { inboundEmail: string | null }) => {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [phase, setPhase] = useState<Phase>("idle");
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [resultId, setResultId] = useState<string | null>(null);
  const [resultMatched, setResultMatched] = useState<boolean>(false);

  const start = useCallback(async (chosen: File) => {
    setFile(chosen);
    setError(null);
    setPhase("uploading");

    const fd = new FormData();
    fd.append("file", chosen);

    const upRes = await fetch("/api/tickets", { method: "POST", body: fd });
    if (!upRes.ok) {
      const j = await upRes.json().catch(() => ({}));
      setError(j.error || "Upload fehlgeschlagen");
      setPhase("error");
      return;
    }
    const upJson = (await upRes.json()) as { ticket: { id: string; ticket_nr: string } };
    const id = upJson.ticket.id;

    setPhase("ocr");
    const parseRes = await fetch(`/api/tickets/${id}/parse`, { method: "POST" });
    if (!parseRes.ok) {
      const j = await parseRes.json().catch(() => ({}));
      setError(j.error || "Auslesung fehlgeschlagen");
      setResultId(id);
      setPhase("error");
      return;
    }

    setPhase("matching");
    const matchRes = await fetch(`/api/tickets/${id}/match`, { method: "POST" });
    let matched = false;
    if (matchRes.ok) {
      const mj = (await matchRes.json()) as { matched: boolean };
      matched = !!mj.matched;
    }

    setResultId(id);
    setResultMatched(matched);
    setPhase("done");
  }, []);

  const onChoose = (f: File | null | undefined) => {
    if (!f) return;
    if (f.size > 12 * 1024 * 1024) {
      setError("Datei ist größer als 12 MB.");
      return;
    }
    start(f);
  };

  const currentIdx =
    phase === "idle" ? -1 : phase === "done" || phase === "error" ? PHASES.length : PHASES.findIndex((p) => p.key === phase);

  return (
    <>
      <Topbar section="Strafzettel hochladen" />
      <div className="flex-1 overflow-auto scroll-thin bg-stone-50">
        <div className="max-w-2xl mx-auto p-6 md:p-10">
          <div className="font-display font-bold text-2xl tracking-tight">Strafzettel hochladen</div>
          <p className="text-sm text-stone-500 mt-1">
            PDF, JPG oder PNG. KI liest die Daten aus und ordnet automatisch dem richtigen Mieter zu.
          </p>

          <div className="mt-8 rounded-2xl bg-white ring-1 ring-stone-200 p-6 md:p-8">
            {phase === "idle" && (
              <>
                <input
                  ref={inputRef}
                  type="file"
                  className="hidden"
                  accept="image/png,image/jpeg,image/webp,application/pdf"
                  onChange={(e) => onChoose(e.target.files?.[0])}
                />
                <DropZone onFile={onChoose} onClick={() => inputRef.current?.click()} />
                {inboundEmail && (
                  <div className="mt-5 flex items-center gap-2 text-xs text-stone-500">
                    <Mail size={13} />
                    Oder direkt weiterleiten an{" "}
                    <span className="font-mono text-stone-700">{inboundEmail}</span>
                  </div>
                )}
                {error && (
                  <div className="mt-3 text-sm text-red-700 bg-red-50 ring-1 ring-red-200 rounded-lg px-3 py-2">
                    {error}
                  </div>
                )}
              </>
            )}

            {phase !== "idle" && (
              <ProgressView
                file={file}
                phase={phase}
                error={error}
                resultId={resultId}
                resultMatched={resultMatched}
                currentIdx={currentIdx}
                onContinue={() => router.push(resultId ? `/dashboard/tickets/${resultId}` : "/dashboard")}
                onCancel={() => {
                  setPhase("idle");
                  setFile(null);
                  setResultId(null);
                  setError(null);
                }}
              />
            )}
          </div>
        </div>
      </div>
    </>
  );
};

const DropZone = ({ onFile, onClick }: { onFile: (f: File) => void; onClick: () => void }) => {
  const [over, setOver] = useState(false);
  return (
    <div
      onClick={onClick}
      onDragOver={(e) => {
        e.preventDefault();
        setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setOver(false);
        const f = e.dataTransfer.files?.[0];
        if (f) onFile(f);
      }}
      className={`border-2 border-dashed rounded-xl py-12 px-6 text-center cursor-pointer transition ${
        over ? "border-stone-500 bg-stone-50" : "border-stone-300 hover:border-stone-400 hover:bg-stone-50"
      }`}
    >
      <div
        className="w-12 h-12 mx-auto rounded-full flex items-center justify-center"
        style={{ background: THEME.primaryTint, color: THEME.primary }}
      >
        <UploadCloud size={22} />
      </div>
      <div className="mt-4 font-display font-semibold">PDF, JPG oder PNG hier ablegen</div>
      <div className="text-sm text-stone-500 mt-1">oder klicken, um Datei auszuwählen</div>
      <div className="text-xs text-stone-400 mt-4">Max. 12 MB · Behördliche Zeugenfragebögen bevorzugt</div>
    </div>
  );
};

const ProgressView = ({
  file,
  phase,
  error,
  resultMatched,
  currentIdx,
  onContinue,
  onCancel,
}: {
  file: File | null;
  phase: Phase;
  error: string | null;
  resultId: string | null;
  resultMatched: boolean;
  currentIdx: number;
  onContinue: () => void;
  onCancel: () => void;
}) => {
  const isDone = phase === "done";
  const isError = phase === "error";
  return (
    <>
      <div className="flex items-center gap-3 p-3 rounded-lg bg-stone-50">
        <FileText size={18} className="text-stone-500" />
        <div className="flex-1 text-sm min-w-0">
          <div className="font-medium truncate">{file?.name || "Strafzettel"}</div>
          <div className="text-xs text-stone-500">{file ? `${Math.round(file.size / 1024)} KB` : ""}</div>
        </div>
        {isDone ? (
          <Check size={18} className="text-emerald-600" />
        ) : isError ? (
          <X size={18} className="text-red-600" />
        ) : (
          <div
            className="w-5 h-5 rounded-full border-2 border-stone-200"
            style={{ borderTopColor: THEME.primary, animation: "spin .7s linear infinite" }}
          />
        )}
      </div>

      <div className="space-y-2 pt-4">
        {PHASES.map((p, i) => {
          const done = i < currentIdx;
          const active = i === currentIdx && !isDone && !isError;
          return (
            <div
              key={p.key}
              className={`flex items-center gap-3 p-2.5 rounded-lg ${active ? "bg-white ring-1 ring-stone-200" : ""}`}
            >
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center ${
                  done ? "bg-emerald-100 text-emerald-700" : active ? "text-white" : "bg-stone-100 text-stone-400"
                }`}
                style={active ? { background: THEME.primary } : {}}
              >
                {done ? <Check size={13} /> : <p.Icon size={13} />}
              </div>
              <div className={`text-sm flex-1 ${done ? "text-stone-500" : active ? "font-medium" : "text-stone-400"}`}>
                {p.label}
              </div>
              {active && (
                <div className="w-16 h-1 bg-stone-100 rounded-full overflow-hidden">
                  <div className="h-full shimmer" style={{ background: THEME.primary, width: "60%" }} />
                </div>
              )}
            </div>
          );
        })}
        <div
          className={`flex items-center gap-3 p-2.5 rounded-lg ${isDone ? "bg-white ring-1 ring-stone-200" : ""}`}
        >
          <div
            className={`w-7 h-7 rounded-full flex items-center justify-center ${
              isDone ? "bg-emerald-100 text-emerald-700" : "bg-stone-100 text-stone-400"
            }`}
          >
            {isDone ? <Check size={13} /> : <FileStack size={13} />}
          </div>
          <div className={`text-sm flex-1 ${isDone ? "text-stone-500" : "text-stone-400"}`}>
            Bereit für Dokumenten-Erstellung
          </div>
        </div>
      </div>

      {isDone && (
        <div className="mt-4 p-4 rounded-lg text-white" style={{ background: THEME.primary }}>
          <div className="flex items-center gap-3">
            <CheckCircle2 size={22} />
            <div className="flex-1">
              <div className="font-display font-semibold">Bereit zur Freigabe</div>
              <div className="text-xs opacity-90">
                {resultMatched
                  ? "Fahrer wurde automatisch zugeordnet · weiter zur Detailansicht"
                  : "Fahrer noch nicht zugeordnet — manuell prüfen"}
              </div>
            </div>
          </div>
        </div>
      )}

      {isError && error && (
        <div className="mt-4 text-sm text-red-700 bg-red-50 ring-1 ring-red-200 rounded-lg px-3 py-2">
          {error}
        </div>
      )}

      <div className="mt-6 flex items-center justify-end gap-2">
        <button onClick={onCancel} className="text-sm px-3 py-1.5 rounded-md hover:bg-stone-100">
          Neuer Upload
        </button>
        <button
          onClick={onContinue}
          disabled={!isDone && !isError}
          className="text-sm px-3.5 py-1.5 rounded-md text-white font-medium disabled:opacity-40"
          style={{ background: THEME.primary }}
        >
          {isDone ? "Zum Strafzettel" : isError ? "Trotzdem öffnen" : "Wird verarbeitet…"}
        </button>
      </div>
    </>
  );
};

"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Camera, Loader2, Trash2 } from "lucide-react";
import type { DamageReportStatus } from "@/lib/types";

const NEXT_STATUS: Record<DamageReportStatus, { label: string; next: DamageReportStatus } | null> = {
  offen: { label: "Als gemeldet markieren", next: "gemeldet" },
  gemeldet: { label: "Als reguliert markieren", next: "reguliert" },
  reguliert: null,
};

export const DamageReportActions = ({
  reportId,
  initialStatus,
}: {
  reportId: string;
  initialStatus: DamageReportStatus;
}) => {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<DamageReportStatus>(initialStatus);
  const [uploading, setUploading] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const upload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploading(true);
    setError(null);
    for (const file of Array.from(files)) {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch(`/api/damage-reports/${reportId}/photos`, {
        method: "POST",
        body: fd,
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        setError(j.error || "Upload fehlgeschlagen");
        break;
      }
    }
    setUploading(false);
    if (fileRef.current) fileRef.current.value = "";
    router.refresh();
  };

  const advance = async () => {
    const next = NEXT_STATUS[status]?.next;
    if (!next) return;
    setUpdating(true);
    setError(null);
    const res = await fetch(`/api/damage-reports/${reportId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: next }),
    });
    setUpdating(false);
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setError(j.error || "Status-Update fehlgeschlagen");
      return;
    }
    setStatus(next);
    router.refresh();
  };

  const remove = async () => {
    if (!confirm("Bericht inklusive aller Fotos löschen?")) return;
    setDeleting(true);
    const res = await fetch(`/api/damage-reports/${reportId}`, { method: "DELETE" });
    setDeleting(false);
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setError(j.error || "Löschen fehlgeschlagen");
      return;
    }
    router.push("/dashboard/damage-reports");
    router.refresh();
  };

  const advanceMeta = NEXT_STATUS[status];

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <button
        onClick={() => fileRef.current?.click()}
        disabled={uploading}
        className="inline-flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-md ring-1 ring-stone-200 hover:bg-stone-50 disabled:opacity-50"
      >
        {uploading ? <Loader2 size={14} className="animate-spin" /> : <Camera size={14} />} Fotos hinzufügen
      </button>
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => upload(e.target.files)}
      />

      {advanceMeta && (
        <button
          onClick={advance}
          disabled={updating}
          className="inline-flex items-center gap-1.5 text-sm text-white px-3 py-1.5 rounded-md font-medium bg-teal-600 hover:bg-teal-700 disabled:opacity-50"
        >
          {updating && <Loader2 size={14} className="animate-spin" />}
          {advanceMeta.label}
        </button>
      )}

      <button
        onClick={remove}
        disabled={deleting}
        className="inline-flex items-center gap-1.5 text-sm text-stone-500 hover:text-red-600 px-2.5 py-1.5 rounded-md disabled:opacity-50"
        title="Bericht löschen"
      >
        {deleting ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
      </button>

      {error && (
        <span className="text-xs text-red-700 bg-red-50 ring-1 ring-red-200 rounded px-2 py-1">
          {error}
        </span>
      )}
    </div>
  );
};

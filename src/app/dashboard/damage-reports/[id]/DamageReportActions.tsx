"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Camera, Loader2, Trash2 } from "lucide-react";
import type { DamageReportStatus } from "@/lib/types";
import { Button } from "@/components/ui/Button";
import { FileDrop } from "@/components/ui/FileDrop";

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
  const [status, setStatus] = useState<DamageReportStatus>(initialStatus);
  const [uploading, setUploading] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const upload = async (files: File[]) => {
    if (files.length === 0) return;
    setUploading(true);
    setError(null);
    for (const file of files) {
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
      <FileDrop
        onFiles={upload}
        accept="image/*"
        multiple
        disabled={uploading}
        label="Fotos hinzufügen"
        className="!border !border-hairline !rounded-btn !px-3 !py-0 !bg-paper hover:!border-signal/40 inline-flex items-center h-9 text-left"
      >
        <span className="inline-flex items-center gap-2 text-[13px] font-medium text-ink">
          {uploading ? <Loader2 size={14} className="animate-spin" /> : <Camera size={14} />}
          Fotos hinzufügen oder hierher ziehen
        </span>
      </FileDrop>

      {advanceMeta && (
        <Button
          variant="signal"
          size="sm"
          onClick={advance}
          disabled={updating}
        >
          {updating && <Loader2 size={14} className="animate-spin" />}
          {advanceMeta.label}
        </Button>
      )}

      <button
        onClick={remove}
        disabled={deleting}
        className="inline-flex items-center justify-center w-9 h-9 rounded-btn border border-hairline bg-paper text-ink-muted hover:text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50"
        title="Bericht löschen"
      >
        {deleting ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
      </button>

      {error && (
        <span className="text-[12px] text-red-700 bg-red-50 border border-red-200 rounded px-2 py-1">
          {error}
        </span>
      )}
    </div>
  );
};

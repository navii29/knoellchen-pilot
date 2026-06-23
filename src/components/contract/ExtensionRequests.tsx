"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarClock, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { fmtDate, fmtEur } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ContractExtension = {
  id: string;
  contract_id: string;
  org_id: string;
  current_return_date: string | null;
  requested_return_date: string;
  requested_return_time: string | null;
  extra_days: number | null;
  est_cost: number | null;
  status: string;
  created_at: string;
};

type Props = {
  contractId: string;
  extensions: ContractExtension[];
  /** Geplantes Rückgabedatum des Vertrags als Fallback */
  contractReturnDate: string;
};

// ---------------------------------------------------------------------------
// Helper — Datum + optionale Uhrzeit formatieren
// ---------------------------------------------------------------------------

function fmtDateOpt(date: string, time: string | null): string {
  const d = fmtDate(date);
  return time ? `${d} · ${time} Uhr` : d;
}

function fmtCreatedAt(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// ---------------------------------------------------------------------------
// Single-card state — each request manages its own busy/error state
// ---------------------------------------------------------------------------

function ExtensionCard({
  ext,
  contractId,
  contractReturnDate,
  onDone,
}: {
  ext: ContractExtension;
  contractId: string;
  contractReturnDate: string;
  onDone: () => void;
}) {
  const [busy, setBusy] = useState<"approve" | "decline" | null>(null);
  const [error, setError] = useState<string | null>(null);

  const currentDate = ext.current_return_date ?? contractReturnDate;

  const act = async (action: "approve" | "decline") => {
    setError(null);
    setBusy(action);
    try {
      const res = await fetch(`/api/contracts/${contractId}/extension`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ extension_id: ext.id, action }),
      });
      const j = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string };
      if (!res.ok || !j.ok) {
        setError(j.error ?? "Aktion fehlgeschlagen — bitte erneut versuchen.");
        return;
      }
      onDone();
    } catch {
      setError("Aktion fehlgeschlagen — bitte erneut versuchen.");
    } finally {
      setBusy(null);
    }
  };

  const isBusy = busy !== null;

  return (
    <div className="rounded-panel border border-amber-300 bg-amber-50 p-4 space-y-3">
      {/* Header */}
      <div className="flex items-center gap-2">
        <CalendarClock size={14} className="text-amber-700 shrink-0" />
        <span className="data-label text-amber-800 font-semibold text-[12px] uppercase tracking-wider">
          Verlängerungs-Anfrage
        </span>
        <span className="ml-auto font-mono text-[11px] text-amber-700/70">
          {fmtCreatedAt(ext.created_at)}
        </span>
      </div>

      {/* Dates */}
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 text-[13px]">
        <div>
          <div className="text-[11px] text-amber-700/70 uppercase tracking-wider mb-0.5">
            Aktuell
          </div>
          <div className="font-mono tnum text-amber-900 font-medium">
            {fmtDate(currentDate)}
          </div>
        </div>
        <span className="text-amber-400 text-[16px] select-none">&#8594;</span>
        <div>
          <div className="text-[11px] text-amber-700/70 uppercase tracking-wider mb-0.5">
            Gewünscht
          </div>
          <div className="font-mono tnum text-amber-900 font-medium">
            {fmtDateOpt(ext.requested_return_date, ext.requested_return_time)}
          </div>
        </div>
      </div>

      {/* Meta row */}
      <div className="flex flex-wrap gap-4 text-[12.5px] text-amber-800">
        {ext.extra_days != null && ext.extra_days > 0 && (
          <span>
            <span className="font-mono tnum font-semibold">{ext.extra_days}</span>{" "}
            {ext.extra_days === 1 ? "Tag" : "Tage"} extra
          </span>
        )}
        {ext.est_cost != null && (
          <span>
            Geschätzte Zusatzkosten:{" "}
            <span className="font-mono tnum font-semibold">{fmtEur(ext.est_cost)}</span>
          </span>
        )}
      </div>

      {/* Action buttons */}
      <div className="flex items-center gap-2 pt-1">
        <Button
          type="button"
          variant="signal"
          size="sm"
          disabled={isBusy}
          onClick={() => act("approve")}
        >
          {busy === "approve" ? (
            <Loader2 size={13} className="animate-spin" />
          ) : null}
          Genehmigen
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={isBusy}
          onClick={() => act("decline")}
          className="text-amber-800 hover:bg-amber-100 border-amber-300"
        >
          {busy === "decline" ? (
            <Loader2 size={13} className="animate-spin" />
          ) : null}
          Ablehnen
        </Button>
      </div>

      {/* Error box */}
      {error && (
        <div className="text-[12.5px] text-red-700 bg-red-50 border border-red-200 rounded-panel px-3 py-2">
          {error}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// ExtensionRequests — renders nothing when no pending requests
// ---------------------------------------------------------------------------

export function ExtensionRequests({ contractId, extensions, contractReturnDate }: Props) {
  const router = useRouter();

  if (extensions.length === 0) return null;

  return (
    <div className="mt-6 space-y-3">
      {extensions.map((ext) => (
        <ExtensionCard
          key={ext.id}
          ext={ext}
          contractId={contractId}
          contractReturnDate={contractReturnDate}
          onDone={() => router.refresh()}
        />
      ))}
    </div>
  );
}

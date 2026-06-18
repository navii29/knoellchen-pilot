"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2, ShieldQuestion } from "lucide-react";

export const TicketActions = ({
  ticketId,
  acknowledged,
  disputeStatus,
}: {
  ticketId: string;
  acknowledged: boolean;
  disputeStatus: string | null;
}) => {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [showDispute, setShowDispute] = useState(false);
  const [kind, setKind] = useState<"not_driver" | "objection">("not_driver");
  const [reason, setReason] = useState("");
  const [nd, setNd] = useState({ name: "", address: "", email: "" });
  const [error, setError] = useState<string | null>(null);

  const acknowledge = async () => {
    setBusy("ack");
    setError(null);
    try {
      const r = await fetch(`/api/portal/tickets/${ticketId}/acknowledge`, { method: "POST" });
      if (!r.ok) {
        const j = (await r.json().catch(() => ({}))) as { error?: string };
        setError(j.error ?? "Fehler");
        return;
      }
      router.refresh();
    } finally {
      setBusy(null);
    }
  };

  const submitDispute = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy("dispute");
    setError(null);
    try {
      const r = await fetch(`/api/portal/tickets/${ticketId}/dispute`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind,
          reason,
          named_driver_name: nd.name,
          named_driver_address: nd.address,
          named_driver_email: nd.email,
        }),
      });
      if (!r.ok) {
        const j = (await r.json().catch(() => ({}))) as { error?: string };
        setError(j.error ?? "Fehler");
        return;
      }
      setShowDispute(false);
      router.refresh();
    } finally {
      setBusy(null);
    }
  };

  if (disputeStatus) {
    return (
      <div className="glass-card rounded-card p-4 text-[13px] text-ink-soft">
        Einspruch eingereicht — wird von der Vermietung geprüft.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <button
        type="button"
        disabled
        className="w-full rounded-btn bg-frost text-ink-muted py-3 text-[14px] font-semibold cursor-not-allowed"
      >
        Online bezahlen — bald verfügbar
      </button>

      {acknowledged ? (
        <div className="glass-card rounded-card p-3 flex items-center gap-2 text-[13px] text-emerald-700">
          <Check size={15} /> Als Fahrer bestätigt
        </div>
      ) : (
        <button
          type="button"
          onClick={acknowledge}
          disabled={busy !== null}
          className="w-full rounded-btn bg-signal text-white py-3 text-[14px] font-semibold inline-flex items-center justify-center gap-2 active:scale-[.99]"
        >
          {busy === "ack" ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} />}
          Ich war der Fahrer — bestätigen
        </button>
      )}

      {!showDispute ? (
        <button
          type="button"
          onClick={() => setShowDispute(true)}
          className="w-full rounded-btn bg-paper border border-hairline text-ink py-3 text-[14px] font-medium inline-flex items-center justify-center gap-2"
        >
          <ShieldQuestion size={15} /> Ich war nicht der Fahrer / Einspruch
        </button>
      ) : (
        <form onSubmit={submitDispute} className="glass-card rounded-card p-4 space-y-3">
          <div className="grid grid-cols-2 gap-1 p-1 rounded-input bg-canvas border border-hairline">
            <button
              type="button"
              onClick={() => setKind("not_driver")}
              className={`h-9 rounded-input text-[12px] font-medium transition-colors ${
                kind === "not_driver" ? "bg-paper text-ink border border-hairline" : "text-ink-muted"
              }`}
            >
              Nicht der Fahrer
            </button>
            <button
              type="button"
              onClick={() => setKind("objection")}
              className={`h-9 rounded-input text-[12px] font-medium transition-colors ${
                kind === "objection" ? "bg-paper text-ink border border-hairline" : "text-ink-muted"
              }`}
            >
              Einspruch
            </button>
          </div>

          {kind === "not_driver" && (
            <div className="space-y-2">
              <p className="text-[12px] text-ink-muted">
                Wer hat das Fahrzeug zu diesem Zeitpunkt gefahren?
              </p>
              <input
                className="field"
                placeholder="Name des Fahrers"
                value={nd.name}
                onChange={(e) => setNd({ ...nd, name: e.target.value })}
              />
              <input
                className="field"
                placeholder="Adresse"
                value={nd.address}
                onChange={(e) => setNd({ ...nd, address: e.target.value })}
              />
              <input
                className="field"
                type="email"
                placeholder="E-Mail (optional)"
                value={nd.email}
                onChange={(e) => setNd({ ...nd, email: e.target.value })}
              />
            </div>
          )}

          <textarea
            className="field"
            rows={3}
            placeholder="Begründung (optional)"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />

          {error && (
            <div className="text-[12px] text-rose-700 bg-rose-50 border border-rose-200 rounded-input px-3 py-2">
              {error}
            </div>
          )}

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setShowDispute(false)}
              className="flex-1 rounded-btn bg-paper border border-hairline py-2.5 text-[13px] font-medium text-ink-soft"
            >
              Abbrechen
            </button>
            <button
              type="submit"
              disabled={busy !== null}
              className="flex-1 rounded-btn bg-signal text-white py-2.5 text-[13px] font-semibold inline-flex items-center justify-center gap-1.5"
            >
              {busy === "dispute" && <Loader2 size={14} className="animate-spin" />}
              Einreichen
            </button>
          </div>
        </form>
      )}

      {error && !showDispute && <div className="text-[12px] text-rose-700 px-1">{error}</div>}
    </div>
  );
};

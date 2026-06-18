"use client";

import { useState } from "react";
import { Check, Loader2, Send } from "lucide-react";

export const SupportForm = () => {
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const r = await fetch("/api/portal/support", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message }),
      });
      const j = (await r.json().catch(() => ({}))) as { ok?: boolean; error?: string };
      if (!r.ok || !j.ok) {
        setError(j.error ?? "Fehlgeschlagen");
        return;
      }
      setDone(true);
      setMessage("");
    } finally {
      setBusy(false);
    }
  };

  if (done) {
    return (
      <div className="glass-card rounded-card p-5 flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
          <Check size={18} />
        </div>
        <div className="text-[14px] text-ink">
          Danke! Deine Nachricht ist bei der Vermietung eingegangen.
          <button
            type="button"
            onClick={() => setDone(false)}
            className="block text-[12px] text-signal mt-1"
          >
            Weitere Nachricht
          </button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="glass-card glass-sheen rounded-card p-5 space-y-3">
      <div className="kicker text-ink-muted">Nachricht an die Vermietung</div>
      <textarea
        className="field"
        rows={4}
        placeholder="Wie können wir helfen?"
        value={message}
        onChange={(e) => setMessage(e.target.value)}
      />
      {error && (
        <div className="text-[13px] rounded-input px-3 py-2 bg-rose-50 border border-rose-200 text-rose-700">
          {error}
        </div>
      )}
      <button
        type="submit"
        disabled={busy || !message.trim()}
        className="w-full rounded-btn bg-signal text-white py-3 text-[14px] font-semibold inline-flex items-center justify-center gap-2 active:scale-[.99] disabled:opacity-60"
      >
        {busy ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
        Senden
      </button>
    </form>
  );
};

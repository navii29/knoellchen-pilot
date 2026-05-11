"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Copy, Loader2, Trash2, UserPlus } from "lucide-react";

export const CustomerActions = ({ customerId }: { customerId: string }) => {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [inviteResult, setInviteResult] = useState<{
    initial_password: string | null;
  } | null>(null);
  const [copied, setCopied] = useState(false);

  const remove = async () => {
    if (!confirm("Diesen Kunden wirklich löschen? Verknüpfte Verträge bleiben erhalten.")) return;
    setBusy("delete");
    setError(null);
    const res = await fetch(`/api/customers/${customerId}`, { method: "DELETE" });
    setBusy(null);
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setError(j.error || "Löschen fehlgeschlagen");
      return;
    }
    router.push("/dashboard/customers");
    router.refresh();
  };

  const invite = async () => {
    if (!confirm("Portalzugang per E-Mail an den Kunden senden?")) return;
    setBusy("invite");
    setError(null);
    setInviteResult(null);
    try {
      const res = await fetch(`/api/customers/${customerId}/portal-invite`, {
        method: "POST",
      });
      const j = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        initial_password?: string | null;
        error?: string;
      };
      if (!res.ok || !j.ok) {
        setError(j.error ?? "Versand fehlgeschlagen");
        return;
      }
      setInviteResult({ initial_password: j.initial_password ?? null });
    } finally {
      setBusy(null);
    }
  };

  const copyPwd = async () => {
    if (!inviteResult?.initial_password) return;
    await navigator.clipboard.writeText(inviteResult.initial_password);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <button
        onClick={invite}
        disabled={busy != null}
        className="inline-flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-md ring-1 ring-stone-200 hover:bg-stone-50 disabled:opacity-50"
      >
        {busy === "invite" ? (
          <Loader2 size={14} className="animate-spin" />
        ) : (
          <UserPlus size={14} />
        )}
        Portalzugang erstellen
      </button>

      <button
        onClick={remove}
        disabled={busy != null}
        className="inline-flex items-center gap-1.5 text-sm text-red-700 px-3 py-1.5 rounded-md hover:bg-red-50 disabled:opacity-50"
      >
        {busy === "delete" ? (
          <Loader2 size={14} className="animate-spin" />
        ) : (
          <Trash2 size={14} />
        )}
        Löschen
      </button>

      {error && <span className="text-xs text-red-700">{error}</span>}

      {inviteResult && (
        <div className="basis-full mt-2 rounded-lg bg-emerald-50 ring-1 ring-emerald-200 px-3 py-2 text-sm text-emerald-800">
          <div className="font-medium flex items-center gap-1.5">
            <Check size={14} /> Einladung versendet
          </div>
          {inviteResult.initial_password && (
            <div className="mt-1.5 text-[12.5px] flex items-center gap-2 flex-wrap">
              <span>Initialpasswort:</span>
              <code className="font-mono px-2 py-0.5 rounded bg-white ring-1 ring-emerald-200">
                {inviteResult.initial_password}
              </code>
              <button
                onClick={copyPwd}
                className="inline-flex items-center gap-1 text-xs text-emerald-700 hover:underline"
              >
                {copied ? <Check size={11} /> : <Copy size={11} />}
                {copied ? "Kopiert" : "Kopieren"}
              </button>
            </div>
          )}
          <div className="mt-1 text-[11px] text-emerald-700">
            Magic-Link wurde per E-Mail gesendet (24h gültig).
          </div>
        </div>
      )}
    </div>
  );
};

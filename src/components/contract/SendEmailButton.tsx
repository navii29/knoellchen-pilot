"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2, Mail } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { fmtDate } from "@/lib/utils";

/**
 * "Per E-Mail senden" — hängt das Vertrags-PDF an und sendet die vorbereitete
 * Vertrags-E-Mail an den Mieter (von der verifizierten Absenderdomain der Org).
 * Operative Aktion — jedes Org-Mitglied darf sie auslösen.
 */
export const SendEmailButton = ({
  contractId,
  recipient,
  alreadySentAt,
  alreadySentTo,
}: {
  contractId: string;
  recipient: string | null;
  alreadySentAt: string | null;
  alreadySentTo: string | null;
}) => {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [sentAt, setSentAt] = useState<string | null>(alreadySentAt);
  const [sentTo, setSentTo] = useState<string | null>(alreadySentTo);
  const [err, setErr] = useState<string | null>(null);

  const send = async () => {
    setErr(null);
    if (!recipient) {
      setErr("Keine E-Mail-Adresse für den Mieter hinterlegt.");
      return;
    }
    if (
      !confirm(
        `Vertrag mit angehängtem PDF per E-Mail an ${recipient} senden?`
      )
    )
      return;
    setBusy(true);
    try {
      const res = await fetch(`/api/contracts/${contractId}/send-email`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      const j = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        sent_to?: string;
        error?: string;
      };
      if (!res.ok || !j.ok) {
        setErr(j.error || "Versand fehlgeschlagen.");
        return;
      }
      setSentAt(new Date().toISOString());
      setSentTo(j.sent_to ?? recipient);
      router.refresh();
    } catch {
      setErr("Versand fehlgeschlagen — bitte später erneut versuchen.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-3 flex-wrap">
        <Button type="button" variant="ink" size="sm" onClick={send} disabled={busy}>
          {busy ? <Loader2 size={14} className="animate-spin" /> : <Mail size={14} />}
          {sentAt ? "Erneut per E-Mail senden" : "Per E-Mail senden"}
        </Button>
        <div className="text-[12.5px] text-ink-muted">
          {recipient ? (
            <>
              An <span className="text-ink">{recipient}</span> · Vertrags-PDF wird angehängt
            </>
          ) : (
            <span className="text-amber-700">Keine E-Mail-Adresse für den Mieter hinterlegt.</span>
          )}
        </div>
      </div>

      {sentAt && (
        <div className="inline-flex items-center gap-1.5 text-[12.5px] text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-panel px-3 py-1.5">
          <Check size={13} />
          Gesendet am {fmtDate(sentAt)}
          {sentTo ? <> an {sentTo}</> : null}
        </div>
      )}

      {err && (
        <div className="text-[12.5px] text-rose-700 bg-rose-50 border border-rose-200 rounded-panel px-3 py-1.5">
          {err}
        </div>
      )}
    </div>
  );
};

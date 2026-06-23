"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2, Mail, Paperclip } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { fmtDate } from "@/lib/utils";
import {
  EMAIL_TEMPLATE_CATALOG,
  type EmailTemplateKey,
} from "@/lib/email-templates";

/**
 * "Per E-Mail senden" — sendet eine der vorbereiteten Vorlagen (Vorlagen-Picker)
 * an den Mieter, abgesendet über die verifizierte Absenderdomain der Org.
 * Vertrag/Rechnung hängen ein PDF an; die übrigen Vorlagen senden ohne Anhang.
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
  const [templateKey, setTemplateKey] = useState<EmailTemplateKey>("contract");

  const entry =
    EMAIL_TEMPLATE_CATALOG.find((e) => e.key === templateKey) ??
    EMAIL_TEMPLATE_CATALOG[0];

  const send = async () => {
    setErr(null);
    if (!recipient) {
      setErr("Keine E-Mail-Adresse für den Mieter hinterlegt.");
      return;
    }
    if (
      !confirm(
        `Vorlage „${entry.label}“${
          entry.attachesPdf ? " mit angehängtem PDF" : ""
        } per E-Mail an ${recipient} senden?`
      )
    )
      return;
    setBusy(true);
    try {
      const res = await fetch(`/api/contracts/${contractId}/send-email`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ template_key: templateKey }),
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
        <select
          value={templateKey}
          onChange={(e) => setTemplateKey(e.target.value as EmailTemplateKey)}
          disabled={busy}
          aria-label="E-Mail-Vorlage wählen"
          className="text-[13px] rounded-panel border border-hairline bg-paper px-2.5 py-1.5 text-ink focus:outline-none focus:border-ink/30"
        >
          {EMAIL_TEMPLATE_CATALOG.map((e) => (
            <option key={e.key} value={e.key}>
              {e.label}
            </option>
          ))}
        </select>
        <Button type="button" variant="ink" size="sm" onClick={send} disabled={busy}>
          {busy ? <Loader2 size={14} className="animate-spin" /> : <Mail size={14} />}
          {sentAt ? "Erneut per E-Mail senden" : "Per E-Mail senden"}
        </Button>
        <div className="text-[12.5px] text-ink-muted">
          {recipient ? (
            <span className="inline-flex items-center gap-1.5 flex-wrap">
              An <span className="text-ink">{recipient}</span>
              {entry.attachesPdf ? (
                <span className="inline-flex items-center gap-1 text-ink-soft">
                  · <Paperclip size={12} /> PDF wird angehängt
                </span>
              ) : (
                <span className="text-ink-soft">· ohne Anhang</span>
              )}
            </span>
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

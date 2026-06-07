"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Building2,
  Calculator,
  Check,
  CheckCircle,
  FileStack,
  FileText,
  FlaskConical,
  Loader2,
  Mail,
  ReceiptText,
  Send,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { fmtEur, fmtDate } from "@/lib/utils";
import type { Ticket } from "@/lib/types";
import { Button } from "@/components/ui/Button";

export const TicketActions = ({
  ticket,
  lexofficeEnabled,
}: {
  ticket: Ticket;
  lexofficeEnabled: boolean;
}) => {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [authorityInput, setAuthorityInput] = useState(ticket.authority_email || "");
  const [showAuthorityField, setShowAuthorityField] = useState(false);

  const handleSendResponse = async (res: Response): Promise<boolean> => {
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setError(j.error || "Versand fehlgeschlagen");
      return false;
    }
    const j = (await res.json()) as { test_override?: string | null };
    if (j.test_override) {
      setInfo(`Test-Modus aktiv: tatsächlich gesendet an ${j.test_override}`);
    } else {
      setInfo(null);
    }
    return true;
  };

  const syncLexoffice = async () => {
    setLoading("lexoffice");
    setError(null);
    const res = await fetch(`/api/tickets/${ticket.id}/sync-lexoffice`, {
      method: "POST",
    });
    const j = await res.json().catch(() => ({}));
    setLoading(null);
    if (!res.ok) {
      setError(j.error || "Übertragung fehlgeschlagen");
      return;
    }
    router.refresh();
  };

  const generateDocs = async () => {
    setLoading("docs");
    setError(null);
    const res = await fetch(`/api/tickets/${ticket.id}/documents`, { method: "POST" });
    setLoading(null);
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setError(j.error || "Dokumente konnten nicht erstellt werden");
      return;
    }
    router.refresh();
  };

  const sendToRenter = async () => {
    if (!ticket.renter_email) return;
    if (!confirm(`E-Mail mit Anschreiben + Rechnung an ${ticket.renter_email} senden?`)) return;
    setLoading("send_renter");
    setError(null);
    const res = await fetch(`/api/tickets/${ticket.id}/send`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "mieter" }),
    });
    setLoading(null);
    if (await handleSendResponse(res)) router.refresh();
  };

  const sendToAuthority = async () => {
    const target = ticket.authority_email || authorityInput.trim();
    if (!target) {
      setShowAuthorityField(true);
      setError("Bitte Behörden-E-Mail eingeben");
      return;
    }
    if (!confirm(`Zeugenfragebogen an ${target} senden?`)) return;
    setLoading("send_authority");
    setError(null);
    const res = await fetch(`/api/tickets/${ticket.id}/send`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "behoerde", behoerde_email: target }),
    });
    setLoading(null);
    if (await handleSendResponse(res)) router.refresh();
  };

  const autoSendToAuthority = async () => {
    if (!ticket.authority_email) {
      setError("Behörden-E-Mail nicht im Ticket — manuell über 'An Behörde senden' eintragen");
      return;
    }
    if (!ticket.questionnaire_path) {
      setError("Zeugenfragebogen-PDF fehlt — bitte zuerst PDFs erstellen");
      return;
    }
    setLoading("auto_authority");
    setError(null);
    const res = await fetch(`/api/tickets/${ticket.id}/send`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "behoerde", behoerde_email: ticket.authority_email }),
    });
    setLoading(null);
    if (await handleSendResponse(res)) router.refresh();
  };

  const markPaid = async () => {
    setLoading("paid");
    setError(null);
    const res = await fetch(`/api/tickets/${ticket.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ paid: true, status: "bezahlt" }),
    });
    setLoading(null);
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setError(j.error || "Konnte nicht aktualisieren");
      return;
    }
    router.refresh();
  };

  const total = (ticket.fine_amount || 0) + Number(ticket.processing_fee || 0);
  const docsReady = !!ticket.letter_path && !!ticket.invoice_path;
  const autoReady = !!ticket.questionnaire_path && !!ticket.authority_email;

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <div className="kicker text-ink-muted">Aktionen</div>
        <TestModeBadge />
      </div>

      {/* Auto-Pilot — prominent if authority email known and not yet sent */}
      {autoReady && !ticket.authority_sent && (
        <button
          onClick={autoSendToAuthority}
          disabled={loading != null}
          className="w-full mb-3 flex items-center gap-3 p-3.5 rounded-card bg-signal text-white text-left disabled:opacity-50 shadow-signal hover:bg-signal-strong transition-colors"
        >
          <div className="w-9 h-9 rounded-panel bg-white/20 flex items-center justify-center shrink-0">
            {loading === "auto_authority" ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Zap size={16} />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[13.5px] font-semibold">Automatisch an Behörde senden</div>
            <div className="text-[12px] opacity-90 truncate">
              Zeugenfragebogen direkt an {ticket.authority_email}
            </div>
          </div>
        </button>
      )}

      <div className="grid sm:grid-cols-2 gap-2.5">
        <ActionButton
          Icon={FileStack}
          label={docsReady ? "PDFs neu erstellen" : "PDFs erstellen"}
          hint="Anschreiben + Rechnung + Zeugenfragebogen"
          onClick={generateDocs}
          disabled={!ticket.plate || !ticket.fine_amount}
          loading={loading === "docs"}
        />

        <ActionButton
          Icon={Mail}
          label={ticket.letter_sent ? "Erneut an Mieter senden" : "An Mieter senden"}
          hint={
            ticket.renter_email
              ? `Per E-Mail an ${ticket.renter_email}`
              : "Mieter-E-Mail fehlt im Vertrag"
          }
          onClick={sendToRenter}
          disabled={!docsReady || !ticket.renter_email}
          loading={loading === "send_renter"}
        />

        <ActionButton
          Icon={Building2}
          label={ticket.authority_sent ? "Erneut an Behörde senden" : "An Behörde senden"}
          hint={
            ticket.authority_email || authorityInput
              ? `Per E-Mail an ${ticket.authority_email || authorityInput}`
              : "Behörden-E-Mail eintragen"
          }
          onClick={sendToAuthority}
          disabled={!ticket.questionnaire_path}
          loading={loading === "send_authority"}
        />

        <ActionButton
          Icon={CheckCircle}
          label="Als bezahlt markieren"
          hint={`${fmtEur(total)} eingegangen`}
          onClick={markPaid}
          disabled={ticket.paid}
          loading={loading === "paid"}
        />
      </div>

      {lexofficeEnabled && (ticket.charge_fine || ticket.charge_fee) && (
        <div className="mt-3">
          {ticket.lexoffice_invoice_id ? (
            <div className="inline-flex items-center gap-2 text-[13px] px-3 py-2 rounded-card border border-hairline bg-canvas text-ink-soft">
              <Check size={13} className="text-ink-muted" />
              <span className="font-medium text-ink">In LexOffice</span>
              <span className="font-mono tnum text-[11px] text-ink-muted">
                · {ticket.lexoffice_invoice_id.slice(0, 8)}
              </span>
            </div>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              onClick={syncLexoffice}
              disabled={loading != null}
            >
              {loading === "lexoffice" ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <Calculator size={14} />
              )}
              An LexOffice übertragen
            </Button>
          )}
        </div>
      )}

      {(showAuthorityField || (!ticket.authority_email && !ticket.authority_sent)) && (
        <div className="mt-3 flex items-center gap-2">
          <input
            type="email"
            value={authorityInput}
            onChange={(e) => setAuthorityInput(e.target.value)}
            placeholder="bussgeld@behoerde.de"
            className="field flex-1 text-[13px]"
          />
          <Button
            onClick={sendToAuthority}
            disabled={!authorityInput || loading != null || !ticket.questionnaire_path}
            variant="signal"
            size="sm"
          >
            <Send size={13} /> Senden
          </Button>
        </div>
      )}

      {ticket.letter_path && (
        <div className="mt-3 grid sm:grid-cols-3 gap-2">
          <DocLink label="Anschreiben" Icon={FileText} url={`/api/tickets/${ticket.id}/files/letter`} />
          <DocLink label="Rechnung" Icon={ReceiptText} url={`/api/tickets/${ticket.id}/files/invoice`} />
          <DocLink
            label="Zeugenfragebogen"
            Icon={Building2}
            url={`/api/tickets/${ticket.id}/files/questionnaire`}
          />
        </div>
      )}

      {(ticket.letter_sent || ticket.authority_sent) && (
        <div className="mt-4 rounded-card border border-hairline bg-canvas p-3 space-y-1.5 text-[13px]">
          {ticket.letter_sent && ticket.letter_sent_at && (
            <div className="flex items-center gap-2 text-ink-soft">
              <Check size={13} className="text-ink-muted" />
              <span>
                Anschreiben gesendet am{" "}
                <strong className="text-ink font-mono tnum">{fmtDate(ticket.letter_sent_at)}</strong> an{" "}
                <span className="text-ink-muted text-[12px]">{ticket.letter_sent_to}</span>
              </span>
            </div>
          )}
          {ticket.authority_sent && ticket.authority_sent_at && (
            <div className="flex items-center gap-2 text-ink-soft">
              <Check size={13} className="text-ink-muted" />
              <span>
                Zeugenfragebogen gesendet am{" "}
                <strong className="text-ink font-mono tnum">{fmtDate(ticket.authority_sent_at)}</strong> an{" "}
                <span className="text-ink-muted text-[12px]">{ticket.authority_sent_to}</span>
              </span>
            </div>
          )}
        </div>
      )}

      {info && (
        <div className="mt-3 text-[13px] text-amber-800 bg-amber-50 border border-amber-200 rounded-card px-3 py-2 flex items-center gap-2">
          <FlaskConical size={14} />
          <span>{info}</span>
        </div>
      )}

      {error && (
        <div className="mt-3 text-[13px] text-red-700 bg-red-50 border border-red-200 rounded-card px-3 py-2">
          {error}
        </div>
      )}
    </div>
  );
};

const TestModeBadge = () => null;

const ActionButton = ({
  Icon,
  label,
  hint,
  onClick,
  disabled,
  loading,
}: {
  Icon: LucideIcon;
  label: string;
  hint: string;
  onClick: () => void;
  disabled?: boolean;
  loading?: boolean;
}) => (
  <button
    onClick={onClick}
    disabled={disabled || loading}
    className="flex items-start gap-3 p-3.5 rounded-card border border-hairline bg-paper hover:bg-canvas text-left disabled:opacity-50 disabled:cursor-not-allowed shadow-panel transition-colors"
  >
    <div className="w-9 h-9 rounded-panel border border-hairline bg-canvas text-ink-muted flex items-center justify-center shrink-0">
      {loading ? <Loader2 size={15} className="animate-spin" /> : <Icon size={15} />}
    </div>
    <div className="flex-1 min-w-0">
      <div className="text-[13.5px] font-medium text-ink">{label}</div>
      <div className="text-[12px] text-ink-muted truncate">{hint}</div>
    </div>
  </button>
);

const DocLink = ({ label, Icon, url }: { label: string; Icon: LucideIcon; url: string }) => (
  <a
    href={url}
    target="_blank"
    rel="noreferrer"
    className="inline-flex items-center gap-2 px-3 py-2 rounded-btn border border-hairline bg-paper hover:bg-canvas text-ink-soft text-[13px] transition-colors"
  >
    <Icon size={13} />
    {label}
  </a>
);

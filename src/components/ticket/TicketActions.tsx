"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Building2,
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
import { THEME } from "@/lib/theme";
import { fmtEur, fmtDate } from "@/lib/utils";
import type { Ticket } from "@/lib/types";

export const TicketActions = ({ ticket }: { ticket: Ticket }) => {
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

  // Auto-Pilot: ein Klick, ohne Confirm, nur möglich wenn Behörden-E-Mail bereits im Ticket
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
      <div className="flex items-center justify-between mb-2">
        <div className="text-xs uppercase tracking-wider text-stone-500 font-medium">Aktionen</div>
        <TestModeBadge />
      </div>

      {/* Auto-Pilot Button — wenn Auslesung Behörden-Adresse erkannt hat, prominent oben */}
      {autoReady && !ticket.authority_sent && (
        <button
          onClick={autoSendToAuthority}
          disabled={loading != null}
          className="w-full mb-3 flex items-center gap-3 p-3.5 rounded-lg text-white text-left disabled:opacity-50"
          style={{ background: THEME.primary }}
        >
          <div className="w-9 h-9 rounded-lg bg-white/20 flex items-center justify-center shrink-0">
            {loading === "auto_authority" ? <Loader2 size={16} className="animate-spin" /> : <Zap size={16} />}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold">Automatisch an Behörde senden</div>
            <div className="text-xs opacity-90 truncate">
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

      {(showAuthorityField || (!ticket.authority_email && !ticket.authority_sent)) && (
        <div className="mt-3 flex items-center gap-2">
          <input
            type="email"
            value={authorityInput}
            onChange={(e) => setAuthorityInput(e.target.value)}
            placeholder="bussgeld@behoerde.de"
            className="flex-1 px-3 py-2 text-sm rounded-lg ring-1 ring-stone-200 outline-none focus:ring-stone-400 font-mono"
          />
          <button
            onClick={sendToAuthority}
            disabled={!authorityInput || loading != null || !ticket.questionnaire_path}
            className="inline-flex items-center gap-1.5 text-sm text-white px-3 py-2 rounded-md font-medium disabled:opacity-50"
            style={{ background: THEME.primary }}
          >
            <Send size={13} /> Senden
          </button>
        </div>
      )}

      {ticket.letter_path && (
        <div className="mt-3 grid sm:grid-cols-3 gap-2 text-sm">
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
        <div className="mt-4 rounded-lg ring-1 ring-emerald-200 bg-emerald-50/50 p-3 space-y-1.5 text-sm">
          {ticket.letter_sent && ticket.letter_sent_at && (
            <div className="flex items-center gap-2 text-emerald-800">
              <Check size={14} />
              <span>
                Anschreiben gesendet am{" "}
                <strong>{fmtDate(ticket.letter_sent_at)}</strong> an{" "}
                <span className="font-mono text-xs">{ticket.letter_sent_to}</span>
              </span>
            </div>
          )}
          {ticket.authority_sent && ticket.authority_sent_at && (
            <div className="flex items-center gap-2 text-emerald-800">
              <Check size={14} />
              <span>
                Zeugenfragebogen gesendet am{" "}
                <strong>{fmtDate(ticket.authority_sent_at)}</strong> an{" "}
                <span className="font-mono text-xs">{ticket.authority_sent_to}</span>
              </span>
            </div>
          )}
        </div>
      )}

      {info && (
        <div className="mt-3 text-sm text-amber-800 bg-amber-50 ring-1 ring-amber-200 rounded-lg px-3 py-2 flex items-center gap-2">
          <FlaskConical size={14} />
          <span>{info}</span>
        </div>
      )}

      {error && (
        <div className="mt-3 text-sm text-red-700 bg-red-50 ring-1 ring-red-200 rounded-lg px-3 py-2">
          {error}
        </div>
      )}
    </div>
  );
};

// Wird auf Detail-Seite (Server Component) per Body-Daten oder via separater Probe injiziert.
// Hier: passive Heuristik — wenn das URL-Hash oder window.localStorage es signalisiert.
// Der echte Test-Modus wird vom Server zurückgegeben (siehe info-State).
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
    className="flex items-start gap-3 p-3.5 rounded-lg ring-1 ring-stone-200 bg-white hover:bg-stone-50 text-left disabled:opacity-50 disabled:cursor-not-allowed"
  >
    <div
      className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
      style={{ background: THEME.primaryTint, color: THEME.primary }}
    >
      {loading ? <Loader2 size={15} className="animate-spin" /> : <Icon size={15} />}
    </div>
    <div className="flex-1 min-w-0">
      <div className="text-sm font-medium">{label}</div>
      <div className="text-xs text-stone-500 truncate">{hint}</div>
    </div>
  </button>
);

const DocLink = ({ label, Icon, url }: { label: string; Icon: LucideIcon; url: string }) => (
  <a
    href={url}
    target="_blank"
    rel="noreferrer"
    className="inline-flex items-center gap-2 px-3 py-2 rounded-lg ring-1 ring-stone-200 hover:bg-stone-50 text-stone-700"
  >
    <Icon size={14} />
    {label}
  </a>
);

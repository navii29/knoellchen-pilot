"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Building2,
  CheckCircle,
  FileStack,
  FileText,
  Loader2,
  ReceiptText,
  type LucideIcon,
} from "lucide-react";
import { THEME } from "@/lib/theme";
import { fmtEur } from "@/lib/utils";
import type { Ticket } from "@/lib/types";

export const TicketActions = ({ ticket }: { ticket: Ticket }) => {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

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

  const markSent = async () => {
    setLoading("sent");
    setError(null);
    const res = await fetch(`/api/tickets/${ticket.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ letter_sent: true, authority_sent: true, status: "weiterbelastet" }),
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

  type Action = {
    key: string;
    Icon: LucideIcon;
    label: string;
    hint: string;
    onClick: () => void;
    disabled?: boolean;
  };

  const actions: Action[] = [
    {
      key: "docs",
      Icon: FileStack,
      label: docsReady ? "Dokumente neu erstellen" : "PDFs erstellen",
      hint: docsReady ? "Anschreiben, Rechnung, Zeugenfragebogen" : "Anschreiben + Rechnung + Zeugenfragebogen",
      onClick: generateDocs,
      disabled: !ticket.plate || !ticket.fine_amount,
    },
    {
      key: "sent",
      Icon: Building2,
      label: "Als versendet markieren",
      hint: "Mieter + Behörde benachrichtigt",
      onClick: markSent,
      disabled: !docsReady || ticket.letter_sent,
    },
    {
      key: "paid",
      Icon: CheckCircle,
      label: "Als bezahlt markieren",
      hint: `${fmtEur(total)} eingegangen`,
      onClick: markPaid,
      disabled: ticket.paid,
    },
  ];

  return (
    <div>
      <div className="text-xs uppercase tracking-wider text-stone-500 font-medium mb-2">Aktionen</div>
      <div className="grid sm:grid-cols-2 gap-2.5">
        {actions.map((a) => (
          <button
            key={a.key}
            onClick={a.onClick}
            disabled={a.disabled || loading != null}
            className="flex items-start gap-3 p-3.5 rounded-lg ring-1 ring-stone-200 bg-white hover:bg-stone-50 text-left disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <div
              className="w-9 h-9 rounded-lg flex items-center justify-center"
              style={{ background: THEME.primaryTint, color: THEME.primary }}
            >
              {loading === a.key ? <Loader2 size={15} className="animate-spin" /> : <a.Icon size={15} />}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium">{a.label}</div>
              <div className="text-xs text-stone-500 truncate">{a.hint}</div>
            </div>
          </button>
        ))}
      </div>
      {ticket.letter_path && (
        <div className="mt-3 grid sm:grid-cols-3 gap-2 text-sm">
          <DocLink label="Anschreiben" Icon={FileText} url={`/api/tickets/${ticket.id}/files/letter`} />
          <DocLink label="Rechnung" Icon={ReceiptText} url={`/api/tickets/${ticket.id}/files/invoice`} />
          <DocLink label="Zeugenfragebogen" Icon={Building2} url={`/api/tickets/${ticket.id}/files/questionnaire`} />
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

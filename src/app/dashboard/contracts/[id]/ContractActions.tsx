"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  AlertTriangle,
  Camera,
  Check,
  Download,
  Euro,
  FileSignature,
  Loader2,
  Send,
  Trash2,
  UserPlus,
  X,
  Zap,
} from "lucide-react";
import { fmtDate } from "@/lib/utils";
import type { Contract } from "@/lib/types";
import { ButtonLink } from "@/components/ui/Button";
import { Panel } from "@/components/ui/Panel";
import { PortalInviteModal } from "@/components/dashboard/PortalInviteModal";

export const ContractActions = ({
  contract,
  pdfUrl,
  lexofficeEnabled,
}: {
  contract: Contract;
  pdfUrl: string | null;
  lexofficeEnabled: boolean;
}) => {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [customerId, setCustomerId] = useState<string | null>(contract.customer_id);

  // Portal-Zugang braucht einen verknüpften Kunden. Hat der Vertrag noch keinen,
  // wird hier aus den Mieterdaten einer angelegt + verknüpft.
  const ensureCustomer = async (): Promise<string | null> => {
    if (customerId) return customerId;
    setBusy("ensure");
    setError(null);
    const res = await fetch(`/api/contracts/${contract.id}/ensure-customer`, {
      method: "POST",
    });
    const j = (await res.json().catch(() => ({}))) as {
      ok?: boolean;
      customer_id?: string;
      error?: string;
    };
    setBusy(null);
    if (!res.ok || !j.customer_id) {
      setError(j.error || "Kunde konnte nicht angelegt werden.");
      return null;
    }
    setCustomerId(j.customer_id);
    router.refresh();
    return j.customer_id;
  };

  const patch = async (key: string, body: Record<string, unknown>) => {
    setBusy(key);
    setError(null);
    const res = await fetch(`/api/contracts/${contract.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    setBusy(null);
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setError(j.error || "Fehler");
      return false;
    }
    router.refresh();
    return true;
  };

  const remove = async () => {
    if (!confirm(`Vertrag ${contract.contract_nr} wirklich löschen?`)) return;
    setBusy("delete");
    const res = await fetch(`/api/contracts/${contract.id}`, { method: "DELETE" });
    setBusy(null);
    if (res.ok) router.push("/dashboard/contracts");
  };

  const activate = async () => {
    setBusy("activate");
    setError(null);
    const res = await fetch(`/api/contracts/${contract.id}/activate`, {
      method: "POST",
    });
    const j = await res.json().catch(() => ({}));
    setBusy(null);
    if (!res.ok) {
      setError(j.error || "Aktivierung fehlgeschlagen");
      // Auch bei Teilfehler aktualisieren: eine bereits erstellte Miet-Rechnung
      // soll sichtbar werden, damit niemand versehentlich neu auslöst.
      router.refresh();
      return;
    }
    router.refresh();
  };

  const [sentInfo, setSentInfo] = useState<string | null>(null);
  const sendCheckinLink = async () => {
    setBusy("checkin");
    setError(null);
    setSentInfo(null);
    const res = await fetch(`/api/contracts/${contract.id}/checkin-link`, {
      method: "POST",
    });
    const j = (await res.json().catch(() => ({}))) as {
      ok?: boolean;
      link?: string;
      error?: string;
    };
    setBusy(null);
    if (!res.ok || !j.ok || !j.link) {
      setError(j.error || "Link konnte nicht erstellt werden");
      return;
    }
    try {
      await navigator.clipboard.writeText(j.link);
      setSentInfo("Zugangs-Link kopiert — jetzt an den Mieter weitergeben (24h gültig).");
    } catch {
      // Clipboard nicht verfügbar — Link direkt anzeigen
      setSentInfo(j.link);
    }
  };

  return (
    <Panel flush className="p-4">
      <div className="flex items-center gap-2 flex-wrap">
        {pdfUrl && (
          <a
            href={pdfUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 text-[13px] px-3 h-9 rounded-btn border border-hairline bg-paper text-ink-soft hover:bg-canvas hover:text-ink transition-colors"
          >
            <Download size={14} /> Upload-PDF anzeigen
          </a>
        )}

        {contract.signed_at ? (
          <a
            href={`/api/contracts/${contract.id}/contract-pdf`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-[13px] px-3 h-9 rounded-btn border border-[#166534]/30 bg-[#E6F4EA] text-[#166534] hover:bg-[#D1FAE5] transition-colors"
          >
            <Download size={14} /> Unterschriebenen Vertrag öffnen
          </a>
        ) : (
          <ButtonLink
            href={`/dashboard/contracts/${contract.id}/sign`}
            variant="signal"
            size="sm"
          >
            <FileSignature size={14} /> Vertrag generieren & unterschreiben
          </ButtonLink>
        )}

        <Link
          href={`/dashboard/contracts/${contract.id}/handover`}
          className="inline-flex items-center gap-1.5 text-[13px] px-3 h-9 rounded-btn border border-hairline bg-paper text-ink-soft hover:bg-canvas hover:text-ink transition-colors"
        >
          <Camera size={14} /> Übergabe-Fotos
        </Link>

        {contract.status === "aktiv" && (
          <ButtonLink
            href={`/dashboard/contracts/${contract.id}/handover?tab=return`}
            variant="signal"
            size="sm"
          >
            <Check size={14} /> Rückgabe erfassen
          </ButtonLink>
        )}

        {contract.status !== "storniert" && (
          <button
            onClick={() => patch("cancel", { status: "storniert" })}
            disabled={busy != null}
            className="inline-flex items-center gap-1.5 text-[13px] px-3 h-9 rounded-btn border border-hairline bg-paper text-ink-soft hover:bg-canvas hover:text-ink transition-colors disabled:opacity-50"
          >
            {busy === "cancel" ? <Loader2 size={14} className="animate-spin" /> : <X size={14} />}
            Stornieren
          </button>
        )}

        <button
          onClick={async () => {
            const id = await ensureCustomer();
            if (id) setInviteOpen(true);
          }}
          disabled={busy != null}
          className="inline-flex items-center gap-1.5 text-[13px] px-3 h-9 rounded-btn border border-hairline bg-paper text-ink-soft hover:bg-canvas hover:text-ink transition-colors disabled:opacity-50"
        >
          {busy === "ensure" ? (
            <Loader2 size={14} className="animate-spin" />
          ) : (
            <UserPlus size={14} />
          )}
          Portalzugang erstellen
        </button>

        <button
          onClick={async () => {
            const id = await ensureCustomer();
            if (id) await sendCheckinLink();
          }}
          disabled={busy != null}
          className="inline-flex items-center gap-1.5 text-[13px] px-3 h-9 rounded-btn border border-hairline bg-paper text-ink-soft hover:bg-canvas hover:text-ink transition-colors disabled:opacity-50"
        >
          {busy === "checkin" ? (
            <Loader2 size={14} className="animate-spin" />
          ) : (
            <Send size={14} />
          )}
          Zugangs-Link kopieren
        </button>

        {/* Aktivierung & Abrechnung */}
        {contract.status !== "storniert" && !contract.is_activated && (
          <button
            onClick={activate}
            disabled={busy != null}
            title={
              lexofficeEnabled
                ? "Erstellt Miet-Rechnung + separate Kautions-Rechnung in LexOffice"
                : "Markiert den Vertrag als aktiviert (LexOffice nicht aktiviert — keine Rechnung)"
            }
            className="inline-flex items-center gap-1.5 text-[13px] px-3 h-9 rounded-btn bg-signal text-white hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {busy === "activate" ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <Zap size={14} />
            )}
            {lexofficeEnabled ? "Aktivieren & Rechnung erstellen" : "Aktivieren"}
          </button>
        )}

        {contract.is_activated && (
          <span className="inline-flex items-center gap-1.5 text-[12px] px-2.5 h-8 rounded-btn border border-[#166534]/30 bg-[#E6F4EA] text-[#166534] font-mono">
            <Check size={12} /> Aktiviert
          </span>
        )}

        {/* Kaution wurde nach Aktivierung gesetzt → fehlende Kautions-Rechnung nachholen */}
        {contract.is_activated &&
          lexofficeEnabled &&
          Number(contract.deposit ?? 0) > 0 &&
          !contract.deposit_invoice_id && (
            <button
              onClick={activate}
              disabled={busy != null}
              className="inline-flex items-center gap-1.5 text-[13px] px-3 h-9 rounded-btn border border-hairline bg-paper text-ink-soft hover:bg-canvas hover:text-ink transition-colors disabled:opacity-50"
            >
              {busy === "activate" ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <Euro size={14} />
              )}
              Kaution-Rechnung erstellen
            </button>
          )}

        {contract.lexoffice_invoice_id && (
          <a
            href={`/api/contracts/${contract.id}/invoice-pdf?type=rental`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-[13px] px-3 h-9 rounded-btn border border-hairline bg-paper text-ink-soft hover:bg-canvas hover:text-ink transition-colors"
          >
            <Download size={14} /> Rechnung (PDF)
          </a>
        )}

        {contract.deposit_invoice_id && (
          <a
            href={`/api/contracts/${contract.id}/invoice-pdf?type=deposit`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-[13px] px-3 h-9 rounded-btn border border-hairline bg-paper text-ink-soft hover:bg-canvas hover:text-ink transition-colors"
            title="Kaution — steuerneutrale Rechnung (0 % USt)"
          >
            <Download size={14} /> Kaution (PDF)
          </a>
        )}

        {contract.is_activated &&
          (contract.payment_status === "bezahlt" ? (
            <span className="inline-flex items-center gap-1.5 text-[12px] px-2.5 h-8 rounded-btn border border-[#166534]/30 bg-[#E6F4EA] text-[#166534] font-mono">
              <Check size={12} /> Bezahlt
              {contract.paid_at ? ` · ${fmtDate(contract.paid_at)}` : ""}
            </span>
          ) : (
            <button
              onClick={() =>
                patch("paid", {
                  payment_status: "bezahlt",
                  paid_at: new Date().toISOString(),
                })
              }
              disabled={busy != null}
              className="inline-flex items-center gap-1.5 text-[13px] px-3 h-9 rounded-btn border border-hairline bg-paper text-ink-soft hover:bg-canvas hover:text-ink transition-colors disabled:opacity-50"
            >
              {busy === "paid" ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <Euro size={14} />
              )}
              Als bezahlt markieren
            </button>
          ))}

        <div className="ml-auto">
          <button
            onClick={remove}
            disabled={busy != null}
            className="inline-flex items-center gap-1.5 text-[13px] px-2.5 h-9 rounded-btn text-ink-muted hover:text-red-600 transition-colors disabled:opacity-50"
          >
            <Trash2 size={14} /> Löschen
          </button>
        </div>
      </div>

      {error && (
        <div className="mt-3 text-[13px] text-red-700 bg-red-50 border border-red-200 rounded-panel px-3 py-2 inline-flex items-center gap-2">
          <AlertTriangle size={14} /> {error}
        </div>
      )}

      {sentInfo && (
        <div className="mt-3 text-[13px] text-[#166534] bg-[#E6F4EA] border border-[#166534]/30 rounded-panel px-3 py-2 inline-flex items-center gap-2">
          <Check size={14} /> {sentInfo}
        </div>
      )}

      {inviteOpen && customerId && (
        <PortalInviteModal
          customerId={customerId}
          defaultEmail={contract.renter_email ?? ""}
          onClose={() => setInviteOpen(false)}
          onDone={() => router.refresh()}
        />
      )}
    </Panel>
  );
};

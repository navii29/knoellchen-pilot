"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  AlertTriangle,
  Calculator,
  Camera,
  Check,
  Download,
  FileSignature,
  Loader2,
  Send,
  Trash2,
  UserPlus,
  X,
} from "lucide-react";
import { fmtDate, fmtEur } from "@/lib/utils";
import type { Contract } from "@/lib/types";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Panel } from "@/components/ui/Panel";
import { PortalInviteModal } from "@/components/dashboard/PortalInviteModal";

type ReturnSummary = {
  plannedDays: number;
  actualDays: number;
  daysDiff: number;
  kmPickup: number | null;
  kmReturn: number | null;
  drivenKm: number | null;
  inclusiveKmMonth: number | null;
  source: "override" | "inclusive_month" | "none";
  allowedKm: number | null;
  excessKm: number;
  pricePerKm: number;
  cost: number;
};

const todayIso = () => new Date().toISOString().slice(0, 10);

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
  const [returnOpen, setReturnOpen] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);

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

  const syncLexoffice = async () => {
    setBusy("lexoffice");
    setError(null);
    const res = await fetch(`/api/contracts/${contract.id}/sync-lexoffice`, {
      method: "POST",
    });
    const j = await res.json().catch(() => ({}));
    setBusy(null);
    if (!res.ok) {
      setError(j.error || "Übertragung fehlgeschlagen");
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
          <Button
            variant="signal"
            size="sm"
            onClick={() => setReturnOpen(true)}
          >
            <Check size={14} /> Rückgabe erfassen
          </Button>
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

        {contract.customer_id && (
          <button
            onClick={() => setInviteOpen(true)}
            disabled={busy != null}
            className="inline-flex items-center gap-1.5 text-[13px] px-3 h-9 rounded-btn border border-hairline bg-paper text-ink-soft hover:bg-canvas hover:text-ink transition-colors disabled:opacity-50"
          >
            <UserPlus size={14} /> Portalzugang erstellen
          </button>
        )}

        {contract.customer_id && (
          <button
            onClick={sendCheckinLink}
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
        )}

        {lexofficeEnabled &&
          contract.status === "abgeschlossen" &&
          (contract.lexoffice_invoice_id ? (
            <span className="inline-flex items-center gap-1.5 text-[12px] px-2.5 h-8 rounded-btn border border-[#166534]/30 bg-[#E6F4EA] text-[#166534] font-mono">
              <Check size={12} />
              In LexOffice
              <span className="opacity-70">· {contract.lexoffice_invoice_id.slice(0, 8)}</span>
            </span>
          ) : (
            <button
              onClick={syncLexoffice}
              disabled={busy != null}
              className="inline-flex items-center gap-1.5 text-[13px] px-3 h-9 rounded-btn border border-hairline bg-paper text-ink-soft hover:bg-canvas hover:text-ink transition-colors disabled:opacity-50"
            >
              {busy === "lexoffice" ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <Calculator size={14} />
              )}
              An LexOffice übertragen
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

      {returnOpen && (
        <ReturnModal
          contract={contract}
          onClose={() => setReturnOpen(false)}
          onDone={() => {
            setReturnOpen(false);
            router.refresh();
          }}
        />
      )}

      {inviteOpen && contract.customer_id && (
        <PortalInviteModal
          customerId={contract.customer_id}
          defaultEmail={contract.renter_email ?? ""}
          onClose={() => setInviteOpen(false)}
          onDone={() => router.refresh()}
        />
      )}
    </Panel>
  );
};

const ReturnModal = ({
  contract,
  onClose,
  onDone,
}: {
  contract: Contract;
  onClose: () => void;
  onDone: () => void;
}) => {
  const [returnDate, setReturnDate] = useState(todayIso());
  const [kmReturn, setKmReturn] = useState("");
  const [summary, setSummary] = useState<ReturnSummary | null>(null);
  const [previewBusy, setPreviewBusy] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!returnDate || !kmReturn) {
      setSummary(null);
      return;
    }
    const t = setTimeout(async () => {
      setPreviewBusy(true);
      setError(null);
      const res = await fetch(`/api/contracts/${contract.id}/return-preview`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          actual_return_date: returnDate,
          km_return: kmReturn.replace(",", "."),
        }),
      });
      setPreviewBusy(false);
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        setError(j.error || "Vorschau fehlgeschlagen");
        setSummary(null);
        return;
      }
      const j = (await res.json()) as { summary: ReturnSummary };
      setSummary(j.summary);
    }, 350);
    return () => clearTimeout(t);
  }, [returnDate, kmReturn, contract.id]);

  const submit = async () => {
    setSaving(true);
    setError(null);
    const res = await fetch(`/api/contracts/${contract.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        status: "abgeschlossen",
        actual_return_date: returnDate,
        km_return: kmReturn ? Number(kmReturn.replace(",", ".")) : null,
      }),
    });
    setSaving(false);
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setError(j.error || "Speichern fehlgeschlagen");
      return;
    }
    onDone();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-0 md:p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-paper w-full md:w-[560px] md:rounded-card rounded-t-card border border-hairline shadow-panel max-h-[92vh] overflow-y-auto">
        <div className="px-5 py-4 border-b border-hairline flex items-center justify-between sticky top-0 bg-paper">
          <div className="font-display font-bold text-[15px] tracking-tight text-ink">Rückgabe erfassen</div>
          <button
            onClick={onClose}
            className="w-8 h-8 inline-flex items-center justify-center rounded-btn text-ink-muted hover:text-ink hover:bg-canvas transition-colors"
            aria-label="Schließen"
          >
            <X size={16} />
          </button>
        </div>

        <div className="p-5 space-y-5">
          <div className="font-mono tnum text-[12px] text-ink-muted">
            {contract.contract_nr} · {contract.plate} · {contract.renter_name}
          </div>

          <div className="grid sm:grid-cols-2 gap-3">
            <ModalField label="Tatsächliches Rückgabedatum">
              <input
                type="date"
                value={returnDate}
                onChange={(e) => setReturnDate(e.target.value)}
                className="field font-mono tnum"
              />
            </ModalField>
            <ModalField label="Km bei Rückgabe *">
              <div className="relative">
                <input
                  required
                  inputMode="numeric"
                  value={kmReturn}
                  onChange={(e) => setKmReturn(e.target.value)}
                  placeholder="z.B. 5890"
                  className="field font-mono tnum pr-9"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[12px] text-ink-muted">km</span>
              </div>
            </ModalField>
          </div>

          {summary && (
            <SummaryPanel
              summary={summary}
              plannedReturn={contract.return_date}
              actualReturn={returnDate}
            />
          )}
          {previewBusy && (
            <div className="font-mono text-[12px] text-ink-muted inline-flex items-center gap-1.5">
              <Loader2 size={12} className="animate-spin" /> Berechne…
            </div>
          )}

          {error && (
            <div className="text-[13px] text-red-700 bg-red-50 border border-red-200 rounded-panel px-3 py-2">
              {error}
            </div>
          )}

          <div className="flex items-center justify-end gap-2 pt-2 sticky bottom-0 bg-paper pb-1">
            <button
              onClick={onClose}
              className="text-[13px] px-3 h-9 rounded-btn text-ink-muted hover:text-ink hover:bg-canvas transition-colors"
            >
              Abbrechen
            </button>
            <Button
              onClick={submit}
              disabled={saving || !kmReturn}
              variant="signal"
              size="sm"
            >
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
              Rückgabe abschließen
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

const SummaryPanel = ({
  summary,
  plannedReturn,
  actualReturn,
}: {
  summary: ReturnSummary;
  plannedReturn: string;
  actualReturn: string;
}) => {
  const diffLabel =
    summary.daysDiff === 0
      ? "(planmäßig)"
      : summary.daysDiff > 0
      ? `(${summary.daysDiff} Tage später)`
      : `(${Math.abs(summary.daysDiff)} Tage früher)`;

  return (
    <div className="panel bg-canvas p-4 space-y-3">
      <ModalSection title="Zeitraum">
        <ModalRow label="Geplante Rückgabe" value={fmtDate(plannedReturn)} mono />
        <ModalRow label="Tatsächliche Rückgabe" value={`${fmtDate(actualReturn)} ${diffLabel}`} mono />
        <ModalRow label="Miettage" value={`${summary.actualDays}`} mono bold />
      </ModalSection>

      {summary.drivenKm != null ? (
        <>
          <div className="border-t border-hairline" />
          <ModalSection title="Kilometer">
            <ModalRow
              label="Km bei Übergabe"
              value={summary.kmPickup != null ? summary.kmPickup.toLocaleString("de-DE") : "—"}
              mono
            />
            <ModalRow
              label="Km bei Rückgabe"
              value={summary.kmReturn != null ? summary.kmReturn.toLocaleString("de-DE") : "—"}
              mono
            />
            <ModalRow
              label="Gefahren"
              value={`${summary.drivenKm.toLocaleString("de-DE")} km`}
              mono
              bold
            />
          </ModalSection>

          <div className="border-t border-hairline" />
          <ModalSection title="Mehrkilometer">
            {summary.allowedKm != null ? (
              <>
                <ModalRow
                  label="Erlaubt"
                  value={
                    summary.source === "inclusive_month" && summary.inclusiveKmMonth
                      ? `${summary.allowedKm.toLocaleString("de-DE")} km (${summary.actualDays} × ${summary.inclusiveKmMonth.toLocaleString("de-DE")} / 30)`
                      : `${summary.allowedKm.toLocaleString("de-DE")} km`
                  }
                  mono
                />
                <ModalRow
                  label="Mehrkilometer"
                  value={`${summary.excessKm.toLocaleString("de-DE")} km`}
                  mono
                  bold={summary.excessKm > 0}
                  highlight={summary.excessKm > 0 ? "amber" : undefined}
                />
                {summary.excessKm > 0 && (
                  <ModalRow
                    label="Mehrkosten"
                    value={
                      <span className="font-display font-semibold text-[#92400E] text-[15px]">
                        {summary.excessKm.toLocaleString("de-DE")} × {summary.pricePerKm.toFixed(2).replace(".", ",")} € ={" "}
                        {fmtEur(summary.cost)}
                      </span>
                    }
                  />
                )}
              </>
            ) : (
              <div className="text-[12px] text-ink-muted italic">
                Kein Inklusiv-km-Limit definiert (am Fahrzeug einstellen oder Vertrags-Freikilometer setzen).
              </div>
            )}
          </ModalSection>
        </>
      ) : (
        <div className="text-[12px] text-ink-muted italic">
          Km-Stand bei Übergabe fehlt — Mehrkilometer können nicht berechnet werden.
        </div>
      )}
    </div>
  );
};

const ModalSection = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div>
    <div className="data-label text-ink-muted mb-2">{title}</div>
    <div className="space-y-1">{children}</div>
  </div>
);

const ModalRow = ({
  label,
  value,
  mono,
  bold,
  highlight,
}: {
  label: string;
  value: React.ReactNode;
  mono?: boolean;
  bold?: boolean;
  highlight?: "amber";
}) => (
  <div className="grid grid-cols-[140px_1fr] gap-2 text-[13px]">
    <div className="text-ink-muted text-[12px]">{label}</div>
    <div
      className={[
        mono ? "font-mono tnum" : "",
        bold ? "font-semibold" : "",
        highlight === "amber" ? "text-[#92400E]" : "text-ink",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {value}
    </div>
  </div>
);

const ModalField = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <label className="block">
    <div className="data-label text-ink-muted mb-1">{label}</div>
    {children}
  </label>
);

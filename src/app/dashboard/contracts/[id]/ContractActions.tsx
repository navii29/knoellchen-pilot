"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  AlertTriangle,
  Camera,
  Check,
  Download,
  Loader2,
  Trash2,
  X,
} from "lucide-react";
import { THEME } from "@/lib/theme";
import { fmtDate, fmtEur } from "@/lib/utils";
import type { Contract } from "@/lib/types";

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
}: {
  contract: Contract;
  pdfUrl: string | null;
}) => {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [returnOpen, setReturnOpen] = useState(false);

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

  return (
    <div className="rounded-xl bg-white ring-1 ring-stone-200 p-5">
      <div className="flex items-center gap-2 flex-wrap">
        {pdfUrl && (
          <a
            href={pdfUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-md ring-1 ring-stone-200 hover:bg-stone-50"
          >
            <Download size={14} /> Vertrags-PDF anzeigen
          </a>
        )}

        <Link
          href={`/dashboard/contracts/${contract.id}/handover`}
          className="inline-flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-md ring-1 ring-stone-200 hover:bg-stone-50"
        >
          <Camera size={14} /> Übergabe-Fotos
        </Link>

        {contract.status === "aktiv" && (
          <button
            onClick={() => setReturnOpen(true)}
            className="inline-flex items-center gap-1.5 text-sm text-white px-3 py-1.5 rounded-md font-medium"
            style={{ background: THEME.primary }}
          >
            <Check size={14} /> Rückgabe erfassen
          </button>
        )}

        {contract.status !== "storniert" && (
          <button
            onClick={() => patch("cancel", { status: "storniert" })}
            disabled={busy != null}
            className="inline-flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-md ring-1 ring-stone-200 hover:bg-stone-50 text-stone-700"
          >
            {busy === "cancel" ? <Loader2 size={14} className="animate-spin" /> : <X size={14} />}
            Stornieren
          </button>
        )}

        <div className="ml-auto">
          <button
            onClick={remove}
            disabled={busy != null}
            className="inline-flex items-center gap-1.5 text-sm px-2.5 py-1.5 rounded-md text-stone-500 hover:text-red-600"
          >
            <Trash2 size={14} /> Löschen
          </button>
        </div>
      </div>

      {error && (
        <div className="mt-3 text-sm text-red-700 bg-red-50 ring-1 ring-red-200 rounded-lg px-3 py-2 inline-flex items-center gap-2">
          <AlertTriangle size={14} /> {error}
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
    </div>
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

  // Live-Preview bei jeder Änderung (debounced)
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
      <div className="relative bg-white w-full md:w-[560px] md:rounded-2xl rounded-t-2xl shadow-2xl max-h-[92vh] overflow-y-auto">
        <div className="px-5 py-4 border-b border-stone-100 flex items-center justify-between sticky top-0 bg-white">
          <div className="font-display font-semibold text-lg">Rückgabe erfassen</div>
          <button
            onClick={onClose}
            className="touch-target flex items-center justify-center text-stone-400 hover:text-stone-700"
            aria-label="Schließen"
          >
            <X size={18} />
          </button>
        </div>

        <div className="p-5 space-y-5">
          <div className="text-xs text-stone-500">
            <span className="font-mono">{contract.contract_nr}</span> ·{" "}
            <span className="font-mono">{contract.plate}</span> · {contract.renter_name}
          </div>

          <div className="grid sm:grid-cols-2 gap-3">
            <Field label="Tatsächliches Rückgabedatum">
              <input
                type="date"
                value={returnDate}
                onChange={(e) => setReturnDate(e.target.value)}
                className="input tabular-nums"
              />
            </Field>
            <Field label="Km bei Rückgabe *">
              <div className="relative">
                <input
                  required
                  inputMode="numeric"
                  value={kmReturn}
                  onChange={(e) => setKmReturn(e.target.value)}
                  placeholder="z.B. 5890"
                  className="input tabular-nums pr-9"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-stone-400">km</span>
              </div>
            </Field>
          </div>

          {/* Live Preview */}
          {summary && (
            <SummaryPanel
              summary={summary}
              plannedReturn={contract.return_date}
              actualReturn={returnDate}
            />
          )}
          {previewBusy && (
            <div className="text-xs text-stone-400 inline-flex items-center gap-1.5">
              <Loader2 size={12} className="animate-spin" /> Berechne…
            </div>
          )}

          {error && (
            <div className="text-sm text-red-700 bg-red-50 ring-1 ring-red-200 rounded-md px-3 py-2">
              {error}
            </div>
          )}

          <div className="flex items-center justify-end gap-2 pt-2 sticky bottom-0 bg-white pb-1">
            <button
              onClick={onClose}
              className="text-sm px-3 py-2 rounded-md text-stone-600 hover:bg-stone-100"
            >
              Abbrechen
            </button>
            <button
              onClick={submit}
              disabled={saving || !kmReturn}
              className="inline-flex items-center gap-1.5 text-white text-sm px-4 py-2 rounded-lg font-medium disabled:opacity-50"
              style={{ background: THEME.primary }}
            >
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
              Rückgabe abschließen
            </button>
          </div>
        </div>

        <style jsx>{`
          .input {
            width: 100%;
            padding: 0.5rem 0.75rem;
            font-size: 0.875rem;
            border-radius: 0.5rem;
            outline: none;
            background: white;
            box-shadow: inset 0 0 0 1px rgb(231 229 228);
          }
          .input:focus {
            box-shadow: inset 0 0 0 1px rgb(168 162 158);
          }
        `}</style>
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
    <div className="rounded-xl bg-stone-50 ring-1 ring-stone-200 p-4 space-y-3">
      <Section title="Zeitraum">
        <Row label="Geplante Rückgabe" value={fmtDate(plannedReturn)} mono />
        <Row label="Tatsächliche Rückgabe" value={`${fmtDate(actualReturn)} ${diffLabel}`} mono />
        <Row label="Miettage" value={`${summary.actualDays}`} mono bold />
      </Section>

      {summary.drivenKm != null ? (
        <>
          <div className="border-t border-stone-200" />
          <Section title="Kilometer">
            <Row
              label="Km bei Übergabe"
              value={summary.kmPickup != null ? summary.kmPickup.toLocaleString("de-DE") : "—"}
              mono
            />
            <Row
              label="Km bei Rückgabe"
              value={summary.kmReturn != null ? summary.kmReturn.toLocaleString("de-DE") : "—"}
              mono
            />
            <Row
              label="Gefahren"
              value={`${summary.drivenKm.toLocaleString("de-DE")} km`}
              mono
              bold
            />
          </Section>

          <div className="border-t border-stone-200" />
          <Section title="Mehrkilometer">
            {summary.allowedKm != null ? (
              <>
                <Row
                  label="Erlaubt"
                  value={
                    summary.source === "inclusive_month" && summary.inclusiveKmMonth
                      ? `${summary.allowedKm.toLocaleString("de-DE")} km (${summary.actualDays} × ${summary.inclusiveKmMonth.toLocaleString("de-DE")} / 30)`
                      : `${summary.allowedKm.toLocaleString("de-DE")} km`
                  }
                  mono
                />
                <Row
                  label="Mehrkilometer"
                  value={`${summary.excessKm.toLocaleString("de-DE")} km`}
                  mono
                  bold={summary.excessKm > 0}
                  highlight={summary.excessKm > 0 ? "amber" : undefined}
                />
                {summary.excessKm > 0 && (
                  <Row
                    label="Mehrkosten"
                    value={
                      <span className="font-display font-semibold text-amber-700 text-base">
                        {summary.excessKm.toLocaleString("de-DE")} × {summary.pricePerKm.toFixed(2).replace(".", ",")} € ={" "}
                        {fmtEur(summary.cost)}
                      </span>
                    }
                  />
                )}
              </>
            ) : (
              <div className="text-xs text-stone-500 italic">
                Kein Inklusiv-km-Limit definiert (am Fahrzeug einstellen oder Vertrags-Freikilometer setzen).
              </div>
            )}
          </Section>
        </>
      ) : (
        <div className="text-xs text-stone-500 italic">
          Km-Stand bei Übergabe fehlt — Mehrkilometer können nicht berechnet werden.
        </div>
      )}
    </div>
  );
};

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div>
    <div className="text-[11px] uppercase tracking-wider text-stone-500 font-semibold mb-2">{title}</div>
    <div className="space-y-1">{children}</div>
  </div>
);

const Row = ({
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
  <div className="grid grid-cols-[140px_1fr] gap-2 text-sm">
    <div className="text-stone-500 text-xs">{label}</div>
    <div
      className={[
        mono ? "tabular-nums" : "",
        bold ? "font-semibold" : "",
        highlight === "amber" ? "text-amber-700" : "text-stone-800",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {value}
    </div>
  </div>
);

const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <label className="block">
    <div className="text-[11px] uppercase tracking-wider text-stone-500 font-medium mb-1">{label}</div>
    {children}
  </label>
);

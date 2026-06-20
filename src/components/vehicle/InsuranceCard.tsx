"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, FileText, Loader2, ShieldCheck, Trash2 } from "lucide-react";
import { Panel, PanelHeader } from "@/components/ui/Panel";
import { Button } from "@/components/ui/Button";
import { FileDrop } from "@/components/ui/FileDrop";

type Slot = "policy" | "card";

/** Ein Dokument-Slot (Police oder Karte): hochladen, öffnen/drucken, ersetzen, entfernen. */
const DocSlot = ({
  vehicleId,
  slot,
  title,
  subtitle,
  path,
}: {
  vehicleId: string;
  slot: Slot;
  title: string;
  subtitle: string;
  path: string | null;
}) => {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [replacing, setReplacing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const endpoint = `/api/vehicles/${vehicleId}/insurance-doc?slot=${slot}`;

  const upload = async (files: File[]) => {
    const file = files[0];
    if (!file) return;
    setError(null);
    setBusy(true);
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch(endpoint, { method: "POST", body: fd });
    setBusy(false);
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setError(j.error || "Upload fehlgeschlagen");
      return;
    }
    setReplacing(false);
    router.refresh();
  };

  const remove = async () => {
    if (!confirm(`${title} wirklich entfernen?`)) return;
    setError(null);
    setBusy(true);
    const res = await fetch(endpoint, { method: "DELETE" });
    setBusy(false);
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setError(j.error || "Entfernen fehlgeschlagen");
      return;
    }
    router.refresh();
  };

  return (
    <div className="space-y-2">
      <div className="data-label">{title}</div>
      {path && !replacing ? (
        <div className="flex items-center gap-3 flex-wrap rounded-panel border border-hairline bg-canvas px-4 py-3">
          <div className="w-9 h-9 rounded-panel bg-paper border border-hairline text-signal flex items-center justify-center shrink-0">
            <FileText size={16} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[13.5px] font-medium text-ink">{title} hinterlegt</div>
            <div className="text-[12px] text-ink-muted">{subtitle}</div>
          </div>
          <div className="flex items-center gap-2">
            <a
              href={endpoint}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 rounded-btn font-medium tracking-tight h-8 px-3 text-[13px] text-ink-soft hover:bg-ink/5 border border-hairline"
            >
              Öffnen / Drucken
            </a>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={busy}
              onClick={() => setReplacing(true)}
            >
              Ersetzen
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={busy}
              onClick={remove}
              className="text-red-600 hover:bg-red-50"
            >
              <Trash2 size={13} /> Entfernen
            </Button>
          </div>
        </div>
      ) : (
        <>
          <FileDrop
            onFiles={upload}
            accept="application/pdf,image/*"
            disabled={busy}
            label={path ? `Neue ${title} hochladen (ersetzt die vorhandene)` : `${title} hochladen`}
            hint="PDF oder Foto, max 12 MB"
          />
          {replacing && (
            <button
              type="button"
              onClick={() => setReplacing(false)}
              className="text-[12.5px] text-ink-muted hover:text-ink"
            >
              Abbrechen
            </button>
          )}
        </>
      )}

      {busy && (
        <div className="inline-flex items-center gap-1.5 text-[12.5px] text-ink-muted">
          <Loader2 size={13} className="animate-spin" /> Wird übertragen…
        </div>
      )}
      {error && (
        <div className="text-[13px] text-red-700 bg-red-50 border border-red-200 rounded-panel px-3 py-2">
          {error}
        </div>
      )}
    </div>
  );
};

/**
 * Versicherungs-Position am Fahrzeug: Stammdaten (Versicherer, Policennummer,
 * gültig bis) + zwei Dokument-Slots (Police, Karte) zum Drucken/Öffnen.
 */
export const InsuranceCard = ({
  vehicleId,
  insurer,
  policyNumber,
  validUntil,
  policyPath,
  cardPath,
}: {
  vehicleId: string;
  insurer: string | null;
  policyNumber: string | null;
  validUntil: string | null;
  policyPath: string | null;
  cardPath: string | null;
}) => {
  const router = useRouter();
  const [form, setForm] = useState({
    insurer: insurer || "",
    policy_number: policyNumber || "",
    insurance_valid_until: validUntil || "",
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const dirty =
    form.insurer !== (insurer || "") ||
    form.policy_number !== (policyNumber || "") ||
    form.insurance_valid_until !== (validUntil || "");

  const save = async () => {
    setError(null);
    setSaving(true);
    setSaved(false);
    const res = await fetch(`/api/vehicles/${vehicleId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setSaving(false);
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setError(j.error || "Speichern fehlgeschlagen");
      return;
    }
    setSaved(true);
    router.refresh();
  };

  return (
    <Panel flush>
      <PanelHeader Icon={ShieldCheck} title="Versicherung" />
      <div className="p-5 space-y-5">
        {/* Stammdaten */}
        <div className="grid sm:grid-cols-3 gap-4">
          <label className="block">
            <div className="data-label mb-1">Versicherer</div>
            <input
              value={form.insurer}
              onChange={(e) => setForm((f) => ({ ...f, insurer: e.target.value }))}
              placeholder="z. B. HUK-Coburg"
              className="field"
            />
          </label>
          <label className="block">
            <div className="data-label mb-1">Policennummer</div>
            <input
              value={form.policy_number}
              onChange={(e) => setForm((f) => ({ ...f, policy_number: e.target.value }))}
              placeholder="z. B. VS-123456789"
              className="field font-mono tabular-nums"
            />
          </label>
          <label className="block">
            <div className="data-label mb-1">Gültig bis</div>
            <input
              type="date"
              value={form.insurance_valid_until}
              onChange={(e) =>
                setForm((f) => ({ ...f, insurance_valid_until: e.target.value }))
              }
              className="field font-mono tabular-nums"
            />
          </label>
        </div>

        {dirty && (
          <div className="flex items-center justify-end gap-3">
            <Button type="button" variant="signal" size="sm" disabled={saving} onClick={save}>
              {saving ? <Loader2 size={14} className="animate-spin" /> : null}
              Speichern
            </Button>
          </div>
        )}
        {saved && !dirty && (
          <div className="flex justify-end">
            <span className="inline-flex items-center gap-1 text-xs text-emerald-700">
              <CheckCircle2 size={13} /> Gespeichert
            </span>
          </div>
        )}
        {error && (
          <div className="text-[13px] text-red-700 bg-red-50 border border-red-200 rounded-panel px-3 py-2">
            {error}
          </div>
        )}

        {/* Dokumente */}
        <div className="grid sm:grid-cols-2 gap-5 pt-1 border-t border-hairline">
          <div className="pt-4">
            <DocSlot
              vehicleId={vehicleId}
              slot="policy"
              title="Versicherungspolice"
              subtitle="Versicherungsschein / Police"
              path={policyPath}
            />
          </div>
          <div className="pt-4">
            <DocSlot
              vehicleId={vehicleId}
              slot="card"
              title="Versicherungskarte"
              subtitle="eVB / Grüne Karte"
              path={cardPath}
            />
          </div>
        </div>
      </div>
    </Panel>
  );
};

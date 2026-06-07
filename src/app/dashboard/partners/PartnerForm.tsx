"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { useState } from "react";
import {
  ArrowLeft,
  Check,
  Loader2,
  Save,
} from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Panel } from "@/components/ui/Panel";
import { Button } from "@/components/ui/Button";
import {
  COMMISSION_TYPE_META,
  PARTNER_TYPE_META,
  type CommissionType,
  type PartnerType,
  type SalesPartner,
} from "@/lib/partners";

const TYPES: PartnerType[] = ["hotel", "agency", "portal", "workshop", "other"];
const COMMISSION_TYPES: CommissionType[] = ["fixed", "percent", "margin"];

export const PartnerForm = ({
  mode,
  initial,
}: {
  mode: "create" | "edit";
  initial?: SalesPartner;
}) => {
  const router = useRouter();
  const [data, setData] = useState({
    name: initial?.name ?? "",
    type: (initial?.type as PartnerType) ?? "hotel",
    contact_name: initial?.contact_name ?? "",
    email: initial?.email ?? "",
    phone: initial?.phone ?? "",
    address: initial?.address ?? "",
    tax_number: initial?.tax_number ?? "",
    commission_type: (initial?.commission_type as CommissionType) ?? "fixed",
    commission_value:
      initial?.commission_value != null ? String(initial.commission_value) : "",
    notes: initial?.notes ?? "",
    active: initial?.active ?? true,
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!data.name.trim()) {
      setError("Name ist Pflichtfeld");
      return;
    }
    setError(null);
    setSaving(true);
    try {
      const payload = {
        ...data,
        commission_value: data.commission_value || null,
      };
      const url =
        mode === "create" ? "/api/partners" : `/api/partners/${initial!.id}`;
      const method = mode === "create" ? "POST" : "PATCH";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const j = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        partner?: { id: string };
        error?: string;
      };
      if (!res.ok || !j.ok) {
        setError(j.error ?? "Speichern fehlgeschlagen");
        setSaving(false);
        return;
      }
      setSaved(true);
      if (mode === "create" && j.partner) {
        router.push(`/dashboard/partners/${j.partner.id}`);
      } else {
        router.refresh();
      }
    } catch {
      setError("Netzwerkfehler");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      {mode === "create" && (
        <>
          <Link
            href="/dashboard/partners"
            className="inline-flex items-center gap-1.5 text-[13px] text-ink-muted hover:text-ink mb-5"
          >
            <ArrowLeft size={14} /> Zurück zu Partner
          </Link>
          <PageHeader
            kicker="Neuer Partner"
            title="Partner anlegen"
            description="Hotel, Portal oder Werkstatt eintragen und Provisionsmodell festlegen — Fahrzeug-Preise je Partner gibt's im Fahrzeug-Detail."
          />
        </>
      )}

      <form onSubmit={submit} className={mode === "create" ? "mt-6 space-y-5" : "space-y-5"}>
        <Panel>
          <div className="data-label mb-4">Stammdaten</div>
          <div className="grid sm:grid-cols-2 gap-3">
            <Field label="Name *">
              <input
                required
                value={data.name}
                onChange={(e) => setData((d) => ({ ...d, name: e.target.value }))}
                className="field"
                placeholder="Hotel Bayerischer Hof"
              />
            </Field>
            <Field label="Typ">
              <select
                value={data.type}
                onChange={(e) =>
                  setData((d) => ({ ...d, type: e.target.value as PartnerType }))
                }
                className="field"
              >
                {TYPES.map((t) => (
                  <option key={t} value={t}>
                    {PARTNER_TYPE_META[t].label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Kontaktperson">
              <input
                value={data.contact_name}
                onChange={(e) =>
                  setData((d) => ({ ...d, contact_name: e.target.value }))
                }
                className="field"
              />
            </Field>
            <Field label="E-Mail">
              <input
                type="email"
                value={data.email}
                onChange={(e) =>
                  setData((d) => ({ ...d, email: e.target.value }))
                }
                className="field"
              />
            </Field>
            <Field label="Telefon">
              <input
                value={data.phone}
                onChange={(e) =>
                  setData((d) => ({ ...d, phone: e.target.value }))
                }
                className="field font-mono tnum"
              />
            </Field>
            <Field label="Steuernummer">
              <input
                value={data.tax_number}
                onChange={(e) =>
                  setData((d) => ({ ...d, tax_number: e.target.value }))
                }
                className="field font-mono tnum"
              />
            </Field>
            <div className="sm:col-span-2">
              <Field label="Adresse">
                <textarea
                  rows={2}
                  value={data.address}
                  onChange={(e) =>
                    setData((d) => ({ ...d, address: e.target.value }))
                  }
                  className="field resize-none"
                />
              </Field>
            </div>
          </div>
        </Panel>

        <Panel>
          <div className="data-label mb-4">Provisionsmodell</div>
          <div className="grid sm:grid-cols-2 gap-3">
            <Field label="Modell">
              <select
                value={data.commission_type}
                onChange={(e) =>
                  setData((d) => ({
                    ...d,
                    commission_type: e.target.value as CommissionType,
                  }))
                }
                className="field"
              >
                {COMMISSION_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {COMMISSION_TYPE_META[t].label}
                  </option>
                ))}
              </select>
            </Field>
            <Field
              label={
                data.commission_type === "percent"
                  ? "Prozentsatz"
                  : data.commission_type === "fixed"
                  ? "Festbetrag"
                  : "Provisionswert"
              }
            >
              <div className="relative">
                <input
                  value={data.commission_value}
                  onChange={(e) =>
                    setData((d) => ({ ...d, commission_value: e.target.value }))
                  }
                  className="field pr-10 font-mono tnum"
                  inputMode="decimal"
                  placeholder={
                    data.commission_type === "percent"
                      ? "10"
                      : data.commission_type === "fixed"
                      ? "25,00"
                      : "(optional)"
                  }
                  disabled={data.commission_type === "margin"}
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[12px] text-ink-muted">
                  {data.commission_type === "percent" ? "%" : "€"}
                </span>
              </div>
            </Field>
            <div className="sm:col-span-2 text-[12px] text-ink-muted leading-snug">
              {COMMISSION_TYPE_META[data.commission_type].description}
            </div>
          </div>
        </Panel>

        <Panel>
          <div className="data-label mb-4">Sonstiges</div>
          <Field label="Notizen">
            <textarea
              value={data.notes}
              onChange={(e) =>
                setData((d) => ({ ...d, notes: e.target.value }))
              }
              rows={3}
              className="field resize-none"
              placeholder="Optional"
            />
          </Field>
          <label className="mt-3 flex items-start gap-3 p-3 rounded-panel border border-hairline cursor-pointer">
            <input
              type="checkbox"
              checked={data.active}
              onChange={(e) =>
                setData((d) => ({ ...d, active: e.target.checked }))
              }
              className="mt-0.5 w-4 h-4 accent-ink"
            />
            <div className="text-[13.5px] text-ink-soft">
              Partner ist <strong className="text-ink">aktiv</strong> — taucht in Vertragsanlage und Listen auf.
            </div>
          </label>
        </Panel>

        {error && (
          <div className="text-[13px] text-red-700 bg-red-50 border border-red-200 rounded-panel px-3 py-2">
            {error}
          </div>
        )}

        <div className="flex items-center justify-end gap-3">
          {saved && (
            <span className="inline-flex items-center gap-1 text-[12px] text-ink-muted">
              <Check size={13} className="text-signal" /> Gespeichert
            </span>
          )}
          <Button type="submit" variant="signal" size="md" disabled={saving}>
            {saving ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <Save size={14} />
            )}
            {mode === "create" ? "Partner anlegen" : "Speichern"}
          </Button>
        </div>
      </form>
    </>
  );
};

const Field = ({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) => (
  <label className="block">
    <div className="data-label mb-1">{label}</div>
    {children}
  </label>
);

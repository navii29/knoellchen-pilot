"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Building2, Loader2, Pencil, Save, User } from "lucide-react";
import { Panel } from "@/components/ui/Panel";
import { Button } from "@/components/ui/Button";
import { LEGAL_FORMS, COUNTRIES } from "@/lib/customer";
import type { Customer } from "@/lib/types";

// Inline-Bearbeiten der Kundendaten auf der Detailseite: "Bearbeiten" schaltet
// die read-only-Karten gegen ein Formular über alle Felder. Speichern via
// PATCH /api/customers/[id], danach zurück zur Ansicht (router.refresh).
type FormState = {
  customer_type: "privat" | "firma";
  company_name: string;
  legal_form: string;
  salutation: string;
  title: string;
  first_name: string;
  last_name: string;
  birthday: string;
  birth_place: string;
  street: string;
  house_nr: string;
  zip: string;
  city: string;
  country: string;
  email: string;
  phone: string;
  license_nr: string;
  license_class: string;
  license_expiry: string;
  license_issued: string;
  id_card_nr: string;
  id_card_authority: string;
  notes: string;
  marketing_opt_in: boolean;
};

const fromCustomer = (c: Customer): FormState => ({
  customer_type: c.customer_type === "firma" ? "firma" : "privat",
  company_name: c.company_name ?? "",
  legal_form: c.legal_form ?? "",
  salutation: c.salutation ?? "",
  title: c.title ?? "",
  first_name: c.first_name ?? "",
  last_name: c.last_name ?? "",
  birthday: (c.birthday ?? "").slice(0, 10),
  birth_place: c.birth_place ?? "",
  street: c.street ?? "",
  house_nr: c.house_nr ?? "",
  zip: c.zip ?? "",
  city: c.city ?? "",
  country: c.country ?? "",
  email: c.email ?? "",
  phone: c.phone ?? "",
  license_nr: c.license_nr ?? "",
  license_class: c.license_class ?? "",
  license_expiry: (c.license_expiry ?? "").slice(0, 10),
  license_issued: (c.license_issued ?? "").slice(0, 10),
  id_card_nr: c.id_card_nr ?? "",
  id_card_authority: c.id_card_authority ?? "",
  notes: c.notes ?? "",
  marketing_opt_in: c.marketing_opt_in ?? false,
});

export const CustomerEditPanel = ({
  customer,
  children,
}: {
  customer: Customer;
  children: React.ReactNode;
}) => {
  const [editing, setEditing] = useState(false);

  if (!editing) {
    return (
      <>
        <div className="flex items-center justify-between gap-3 mb-3">
          <div className="data-label text-ink-muted">Kundendaten</div>
          <Button variant="signal" size="sm" onClick={() => setEditing(true)}>
            <Pencil size={14} /> Bearbeiten
          </Button>
        </div>
        {children}
      </>
    );
  }

  return <CustomerEditForm customer={customer} onClose={() => setEditing(false)} />;
};

const CustomerEditForm = ({
  customer,
  onClose,
}: {
  customer: Customer;
  onClose: () => void;
}) => {
  const router = useRouter();
  const [data, setData] = useState<FormState>(fromCustomer(customer));
  const [saving, setSaving] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const set =
    (k: keyof FormState) =>
    (
      e: React.ChangeEvent<
        HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
      >
    ) =>
      setData((d) => ({ ...d, [k]: e.target.value }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (data.customer_type === "firma") {
      if (!data.company_name.trim()) {
        setError("Firmenname ist Pflichtfeld");
        return;
      }
    } else if (!data.last_name.trim()) {
      setError("Nachname ist Pflichtfeld");
      return;
    }
    setSaving(true);
    const res = await fetch(`/api/customers/${customer.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    setSaving(false);
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setError(j.error || "Speichern fehlgeschlagen");
      return;
    }
    // Erst zurückschalten, wenn die frischen Serverdaten da sind (kein Stale-Flash).
    startTransition(() => {
      router.refresh();
      onClose();
    });
  };

  return (
    <form onSubmit={submit} className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <div className="data-label text-ink-muted">Kundendaten bearbeiten</div>
      </div>

      <Panel>
        <div className="data-label mb-3">Kundentyp</div>
        <div className="inline-flex rounded-btn border border-hairline bg-canvas p-0.5 mb-4">
          {(
            [
              { v: "privat", label: "Privatperson", Icon: User },
              { v: "firma", label: "Firma", Icon: Building2 },
            ] as const
          ).map(({ v, label, Icon }) => (
            <button
              key={v}
              type="button"
              onClick={() => setData((d) => ({ ...d, customer_type: v }))}
              className={`inline-flex items-center gap-1.5 rounded-[6px] px-3 py-1.5 text-[13px] font-medium transition-colors ${
                data.customer_type === v ? "bg-paper text-ink shadow-sm" : "text-ink-muted hover:text-ink"
              }`}
            >
              <Icon size={14} /> {label}
            </button>
          ))}
        </div>
        {data.customer_type === "firma" ? (
          <Section title="Firma">
            <Field label="Firmenname *">
              <input
                required
                value={data.company_name}
                onChange={set("company_name")}
                placeholder="z. B. LEVRA SERVICE"
                className="field"
              />
            </Field>
            <Field label="Rechtsform">
              <select value={data.legal_form} onChange={set("legal_form")} className="field">
                <option value="">—</option>
                {LEGAL_FORMS.map((f) => (
                  <option key={f} value={f}>
                    {f}
                  </option>
                ))}
              </select>
            </Field>
          </Section>
        ) : (
          <Section title="Person">
            <Field label="Anrede">
              <select value={data.salutation} onChange={set("salutation")} className="field">
                <option value="">—</option>
                <option value="Herr">Herr</option>
                <option value="Frau">Frau</option>
                <option value="Divers">Divers</option>
              </select>
            </Field>
            <Field label="Titel">
              <input value={data.title} onChange={set("title")} placeholder="Dr., Prof." className="field" />
            </Field>
            <Field label="Vorname">
              <input value={data.first_name} onChange={set("first_name")} className="field" />
            </Field>
            <Field label="Nachname *">
              <input required value={data.last_name} onChange={set("last_name")} className="field" />
            </Field>
            <Field label="Geburtsdatum">
              <input type="date" value={data.birthday} onChange={set("birthday")} className="field font-mono tnum" />
            </Field>
            <Field label="Geburtsort">
              <input value={data.birth_place} onChange={set("birth_place")} className="field" />
            </Field>
          </Section>
        )}
      </Panel>

      <Panel>
        <Section title="Anschrift">
          <Field label="Straße">
            <input value={data.street} onChange={set("street")} className="field" />
          </Field>
          <Field label="Hausnummer">
            <input value={data.house_nr} onChange={set("house_nr")} className="field font-mono tnum" />
          </Field>
          <Field label="PLZ">
            <input value={data.zip} onChange={set("zip")} className="field font-mono tnum" />
          </Field>
          <Field label="Ort">
            <input value={data.city} onChange={set("city")} className="field" />
          </Field>
          <Field label="Land">
            <select value={data.country || "Deutschland"} onChange={set("country")} className="field">
              {COUNTRIES.map((land) => (
                <option key={land} value={land}>
                  {land}
                </option>
              ))}
            </select>
          </Field>
        </Section>
      </Panel>

      <Panel>
        <Section title="Kontakt">
          <Field label="E-Mail">
            <input type="email" value={data.email} onChange={set("email")} className="field" />
          </Field>
          <Field label="Telefon">
            <input value={data.phone} onChange={set("phone")} className="field font-mono tnum" />
          </Field>
        </Section>
      </Panel>

      <Panel>
        <Section title="Führerschein & Ausweis">
          <Field label="Führerschein-Nr.">
            <input value={data.license_nr} onChange={set("license_nr")} className="field font-mono tnum" />
          </Field>
          <Field label="Klassen">
            <input value={data.license_class} onChange={set("license_class")} placeholder="B, BE" className="field font-mono tnum" />
          </Field>
          <Field label="FS gültig bis">
            <input type="date" value={data.license_expiry} onChange={set("license_expiry")} className="field font-mono tnum" />
          </Field>
          <Field label="FS ausgestellt am">
            <input type="date" value={data.license_issued} onChange={set("license_issued")} className="field font-mono tnum" />
          </Field>
          <Field label="Ausweis-Nr.">
            <input value={data.id_card_nr} onChange={set("id_card_nr")} className="field font-mono tnum" />
          </Field>
          <Field label="Ausweis-Behörde">
            <input value={data.id_card_authority} onChange={set("id_card_authority")} className="field" />
          </Field>
        </Section>
      </Panel>

      <Panel>
        <Section title="Einwilligung">
          <label className="sm:col-span-2 flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={data.marketing_opt_in}
              onChange={(e) =>
                setData((d) => ({ ...d, marketing_opt_in: e.target.checked }))
              }
              className="mt-0.5 w-4 h-4 accent-signal shrink-0"
            />
            <span className="text-[13px] text-ink-soft leading-snug">
              Werbe-Einwilligung (Marketing): Der Kunde ist mit der Kontaktaufnahme
              zu Werbezwecken einverstanden. Beim Speichern wird der Zeitpunkt
              protokolliert.
            </span>
          </label>
        </Section>
      </Panel>

      <Panel>
        <Section title="Notizen">
          <div className="sm:col-span-2">
            <textarea value={data.notes} onChange={set("notes")} rows={3} className="field resize-none" />
          </div>
        </Section>
      </Panel>

      {error && (
        <div className="text-[13px] text-red-700 bg-red-50 border border-red-200 rounded-panel px-3 py-2">
          {error}
        </div>
      )}

      <div className="flex items-center justify-end gap-3">
        <button
          type="button"
          onClick={onClose}
          disabled={saving || isPending}
          className="text-[13px] text-ink-muted hover:text-ink px-2 disabled:opacity-40"
        >
          Abbrechen
        </button>
        <Button type="submit" variant="signal" size="md" disabled={saving || isPending}>
          {saving || isPending ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
          Speichern
        </Button>
      </div>
    </form>
  );
};

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div>
    <div className="data-label mb-3">{title}</div>
    <div className="grid sm:grid-cols-2 gap-4">{children}</div>
  </div>
);

const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <label className="block">
    <div className="data-label mb-1">{label}</div>
    {children}
  </label>
);

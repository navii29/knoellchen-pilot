"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Camera,
  CreditCard,
  IdCard,
  Loader2,
  Save,
  ScanText,
  Sparkles,
  UserPlus,
} from "lucide-react";
import Link from "next/link";
import { PageHeader } from "@/components/ui/PageHeader";
import { Panel } from "@/components/ui/Panel";
import { Button } from "@/components/ui/Button";
import type { CustomerDocumentType, ParsedCustomerData } from "@/lib/types";

type Mode = "choose" | "ai" | "manual";

type FormState = {
  salutation: string;
  title: string;
  first_name: string;
  last_name: string;
  birthday: string;
  street: string;
  house_nr: string;
  zip: string;
  city: string;
  email: string;
  phone: string;
  license_nr: string;
  license_class: string;
  license_expiry: string;
  id_card_nr: string;
  license_photo_path: string;
  id_card_photo_path: string;
  notes: string;
};

const empty: FormState = {
  salutation: "",
  title: "",
  first_name: "",
  last_name: "",
  birthday: "",
  street: "",
  house_nr: "",
  zip: "",
  city: "",
  email: "",
  phone: "",
  license_nr: "",
  license_class: "",
  license_expiry: "",
  id_card_nr: "",
  license_photo_path: "",
  id_card_photo_path: "",
  notes: "",
};

export const NewCustomerClient = () => {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [mode, setMode] = useState<Mode>("choose");
  const [data, setData] = useState<FormState>(empty);
  const [parsing, setParsing] = useState(false);
  const [parsedFromAI, setParsedFromAI] = useState(false);
  const [aiConfidence, setAiConfidence] = useState<number | null>(null);
  const [docType, setDocType] = useState<CustomerDocumentType | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [docHint, setDocHint] = useState<CustomerDocumentType | "">("");

  const set = (k: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setData((d) => ({ ...d, [k]: e.target.value }));

  const handlePhotoUpload = async (file: File) => {
    setError(null);
    setParsing(true);
    const fd = new FormData();
    fd.append("file", file);
    if (docHint) fd.append("doc_type", docHint);
    const res = await fetch("/api/customers/parse-document", { method: "POST", body: fd });
    setParsing(false);
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setError(j.error || "Dokument konnte nicht ausgelesen werden");
      return;
    }
    const j = (await res.json()) as {
      data: ParsedCustomerData;
      document_type: CustomerDocumentType | null;
      storage_path: string;
      confidence: number;
    };
    const d = j.data;
    const isLicense = j.document_type === "license";
    setData((prev) => ({
      ...prev,
      salutation: d.salutation || prev.salutation,
      title: d.title || prev.title,
      first_name: d.first_name || prev.first_name,
      last_name: d.last_name || prev.last_name,
      birthday: d.birthday || prev.birthday,
      street: d.street || prev.street,
      house_nr: d.house_nr || prev.house_nr,
      zip: d.zip || prev.zip,
      city: d.city || prev.city,
      license_nr: d.license_nr || prev.license_nr,
      license_class: d.license_class || prev.license_class,
      license_expiry: d.license_expiry || prev.license_expiry,
      id_card_nr: d.id_card_nr || prev.id_card_nr,
      license_photo_path: isLicense ? j.storage_path : prev.license_photo_path,
      id_card_photo_path: !isLicense && j.document_type === "id_card" ? j.storage_path : prev.id_card_photo_path,
    }));
    setDocType(j.document_type);
    setAiConfidence(j.confidence);
    setParsedFromAI(true);
    setMode("manual");
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!data.last_name.trim()) {
      setError("Nachname ist Pflichtfeld");
      return;
    }
    setSaving(true);
    const res = await fetch("/api/customers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    setSaving(false);
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setError(j.error || "Speichern fehlgeschlagen");
      return;
    }
    const j = (await res.json()) as { customer: { id: string } };
    router.push(`/dashboard/customers/${j.customer.id}`);
    router.refresh();
  };

  return (
    <>
      <Link
        href="/dashboard/customers"
        className="inline-flex items-center gap-1.5 text-[13px] text-ink-muted hover:text-ink mb-5"
      >
        <ArrowLeft size={14} /> Zurück zu Kunden
      </Link>

      <PageHeader
        kicker="Neuer Kunde"
        title="Kunde anlegen"
        description="Foto vom Führerschein oder Personalausweis hochladen — Claude füllt das Formular automatisch — oder manuell anlegen."
      />

      {mode === "choose" && (
        <div className="mt-8 grid sm:grid-cols-2 gap-4">
          <button
            onClick={() => {
              setDocHint("license");
              fileRef.current?.click();
            }}
            className="panel p-6 text-left hover:border-ink/20 transition"
          >
            <div className="w-12 h-12 rounded-panel border border-hairline bg-canvas flex items-center justify-center text-ink-soft mb-4">
              <CreditCard size={22} />
            </div>
            <div className="font-display font-semibold text-[16px] text-ink">Führerschein scannen</div>
            <div className="text-[13px] text-ink-muted mt-1">
              Foto oder Scan — Claude liest Name, Geburtsdatum, FS-Nummer und Klassen aus.
            </div>
          </button>

          <button
            onClick={() => {
              setDocHint("id_card");
              fileRef.current?.click();
            }}
            className="panel p-6 text-left hover:border-ink/20 transition"
          >
            <div className="w-12 h-12 rounded-panel border border-hairline bg-canvas flex items-center justify-center text-ink-soft mb-4">
              <IdCard size={22} />
            </div>
            <div className="font-display font-semibold text-[16px] text-ink">Personalausweis scannen</div>
            <div className="text-[13px] text-ink-muted mt-1">
              Bekommt zusätzlich die Anschrift und die Ausweisnummer.
            </div>
          </button>

          <button
            onClick={() => setMode("manual")}
            className="panel p-6 text-left hover:border-ink/20 transition sm:col-span-2"
          >
            <div className="w-12 h-12 rounded-panel border border-hairline bg-canvas flex items-center justify-center text-ink-soft mb-4">
              <UserPlus size={22} />
            </div>
            <div className="font-display font-semibold text-[16px] text-ink">Manuell anlegen</div>
            <div className="text-[13px] text-ink-muted mt-1">Alle Felder direkt ins Formular eintragen.</div>
          </button>

          <input
            ref={fileRef}
            type="file"
            accept="image/png,image/jpeg,image/webp,application/pdf"
            capture="environment"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) {
                setMode("ai");
                handlePhotoUpload(f);
              }
              if (fileRef.current) fileRef.current.value = "";
            }}
          />
        </div>
      )}

      {mode === "ai" && parsing && (
        <Panel className="mt-8 flex items-center gap-4">
          <div className="w-12 h-12 rounded-panel border border-hairline bg-canvas flex items-center justify-center text-ink-muted shrink-0">
            <ScanText size={22} className="animate-pulse" />
          </div>
          <div>
            <div className="font-display font-semibold text-ink">Claude liest das Dokument aus…</div>
            <div className="text-[12px] text-ink-muted mt-1">Das dauert meist 5–15 Sekunden.</div>
          </div>
        </Panel>
      )}

      {mode === "ai" && error && (
        <div className="mt-8 text-[13px] text-red-700 bg-red-50 border border-red-200 rounded-panel px-3 py-2">
          {error}
          <button onClick={() => setMode("choose")} className="ml-2 underline">
            Zurück
          </button>
        </div>
      )}

      {mode === "manual" && (
        <form onSubmit={submit} className="mt-6 space-y-5">
          {parsedFromAI && (
            <div className="flex items-center gap-3 p-3 rounded-panel border border-hairline bg-canvas">
              <Sparkles size={16} className="text-signal shrink-0" />
              <div className="flex-1 text-[13px] text-ink">
                <span className="font-medium">
                  Vorgefüllt von KI ({docType === "license" ? "Führerschein" : docType === "id_card" ? "Ausweis" : "Dokument"})
                </span>
                {aiConfidence != null && (
                  <span className="text-[12px] ml-2 text-ink-muted">
                    Confidence {Math.round(aiConfidence * 100)} % — bitte prüfen
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="text-[12px] inline-flex items-center gap-1 text-ink-muted hover:text-ink"
              >
                <Camera size={12} /> Weiteres Dokument
              </button>
            </div>
          )}

          <Panel>
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
                <input
                  type="date"
                  value={data.birthday}
                  onChange={set("birthday")}
                  className="field font-mono tnum"
                />
              </Field>
            </Section>
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
              <Field label="Ausweis-Nr.">
                <input value={data.id_card_nr} onChange={set("id_card_nr")} className="field font-mono tnum" />
              </Field>
            </Section>
          </Panel>

          <Panel>
            <Section title="Notizen">
              <div className="sm:col-span-2">
                <textarea
                  value={data.notes}
                  onChange={set("notes")}
                  rows={3}
                  className="field resize-none"
                />
              </div>
            </Section>
          </Panel>

          {error && (
            <div className="text-[13px] text-red-700 bg-red-50 border border-red-200 rounded-panel px-3 py-2">{error}</div>
          )}

          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => setMode("choose")}
              className="text-[13px] text-ink-muted hover:text-ink"
            >
              Eingabe abbrechen
            </button>
            <Button type="submit" variant="signal" size="md" disabled={saving}>
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
              Kunde speichern
            </Button>
          </div>

          <input
            ref={fileRef}
            type="file"
            accept="image/png,image/jpeg,image/webp,application/pdf"
            capture="environment"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handlePhotoUpload(f);
              if (fileRef.current) fileRef.current.value = "";
            }}
          />
        </form>
      )}
    </>
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

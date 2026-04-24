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
import { THEME } from "@/lib/theme";
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
        className="inline-flex items-center gap-1.5 text-sm text-stone-500 hover:text-stone-900 mb-4"
      >
        <ArrowLeft size={14} /> Zurück zu Kunden
      </Link>

      <div className="font-display font-bold text-2xl tracking-tight">Neuer Kunde</div>
      <p className="text-sm text-stone-500 mt-1">
        Foto vom Führerschein oder Personalausweis hochladen — Claude füllt das Formular automatisch — oder manuell anlegen.
      </p>

      {mode === "choose" && (
        <div className="mt-8 grid sm:grid-cols-2 gap-4">
          <button
            onClick={() => {
              setDocHint("license");
              fileRef.current?.click();
            }}
            className="rounded-2xl bg-white ring-1 ring-stone-200 p-6 text-left hover:ring-stone-400 transition"
          >
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center"
              style={{ background: THEME.primaryTint, color: THEME.primary }}
            >
              <CreditCard size={22} />
            </div>
            <div className="font-display font-semibold text-lg mt-4">Führerschein scannen</div>
            <div className="text-sm text-stone-500 mt-1">
              Foto oder Scan — Claude liest Name, Geburtsdatum, FS-Nummer und Klassen aus.
            </div>
          </button>

          <button
            onClick={() => {
              setDocHint("id_card");
              fileRef.current?.click();
            }}
            className="rounded-2xl bg-white ring-1 ring-stone-200 p-6 text-left hover:ring-stone-400 transition"
          >
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center"
              style={{ background: THEME.primaryTint, color: THEME.primary }}
            >
              <IdCard size={22} />
            </div>
            <div className="font-display font-semibold text-lg mt-4">Personalausweis scannen</div>
            <div className="text-sm text-stone-500 mt-1">
              Bekommt zusätzlich die Anschrift und die Ausweisnummer.
            </div>
          </button>

          <button
            onClick={() => setMode("manual")}
            className="rounded-2xl bg-white ring-1 ring-stone-200 p-6 text-left hover:ring-stone-400 transition sm:col-span-2"
          >
            <div className="w-12 h-12 rounded-xl bg-stone-100 text-stone-700 flex items-center justify-center">
              <UserPlus size={22} />
            </div>
            <div className="font-display font-semibold text-lg mt-4">Manuell anlegen</div>
            <div className="text-sm text-stone-500 mt-1">Alle Felder direkt ins Formular eintragen.</div>
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
        <div className="mt-8 rounded-2xl bg-white ring-1 ring-stone-200 p-8 flex items-center gap-4">
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center"
            style={{ background: THEME.primaryTint, color: THEME.primary }}
          >
            <ScanText size={22} className="animate-pulse" />
          </div>
          <div>
            <div className="font-display font-semibold">Claude liest das Dokument aus…</div>
            <div className="text-xs text-stone-500 mt-1">Das dauert meist 5–15 Sekunden.</div>
          </div>
        </div>
      )}

      {mode === "ai" && error && (
        <div className="mt-8 text-sm text-red-700 bg-red-50 ring-1 ring-red-200 rounded-lg px-3 py-2">
          {error}
          <button onClick={() => setMode("choose")} className="ml-2 underline">
            Zurück
          </button>
        </div>
      )}

      {mode === "manual" && (
        <form onSubmit={submit} className="mt-6 rounded-2xl bg-white ring-1 ring-stone-200 p-6 space-y-6">
          {parsedFromAI && (
            <div
              className="flex items-center gap-3 p-3 rounded-lg"
              style={{ background: THEME.primaryTint, color: "#0f5b54" }}
            >
              <Sparkles size={16} />
              <div className="flex-1 text-sm">
                <span className="font-medium">
                  Vorgefüllt von KI ({docType === "license" ? "Führerschein" : docType === "id_card" ? "Ausweis" : "Dokument"})
                </span>
                {aiConfidence != null && (
                  <span className="text-xs ml-2 opacity-80">
                    Confidence {Math.round(aiConfidence * 100)} % — bitte prüfen
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="text-xs inline-flex items-center gap-1 hover:underline"
              >
                <Camera size={12} /> Weiteres Dokument
              </button>
            </div>
          )}

          <Section title="Person">
            <Field label="Anrede">
              <select value={data.salutation} onChange={set("salutation")} className="input">
                <option value="">—</option>
                <option value="Herr">Herr</option>
                <option value="Frau">Frau</option>
                <option value="Divers">Divers</option>
              </select>
            </Field>
            <Field label="Titel">
              <input value={data.title} onChange={set("title")} placeholder="Dr., Prof." className="input" />
            </Field>
            <Field label="Vorname">
              <input value={data.first_name} onChange={set("first_name")} className="input" />
            </Field>
            <Field label="Nachname *">
              <input required value={data.last_name} onChange={set("last_name")} className="input" />
            </Field>
            <Field label="Geburtsdatum">
              <input
                type="date"
                value={data.birthday}
                onChange={set("birthday")}
                className="input font-mono"
              />
            </Field>
          </Section>

          <Section title="Anschrift">
            <Field label="Straße">
              <input value={data.street} onChange={set("street")} className="input" />
            </Field>
            <Field label="Hausnummer">
              <input value={data.house_nr} onChange={set("house_nr")} className="input font-mono" />
            </Field>
            <Field label="PLZ">
              <input value={data.zip} onChange={set("zip")} className="input font-mono" />
            </Field>
            <Field label="Ort">
              <input value={data.city} onChange={set("city")} className="input" />
            </Field>
          </Section>

          <Section title="Kontakt">
            <Field label="E-Mail">
              <input type="email" value={data.email} onChange={set("email")} className="input" />
            </Field>
            <Field label="Telefon">
              <input value={data.phone} onChange={set("phone")} className="input font-mono" />
            </Field>
          </Section>

          <Section title="Führerschein & Ausweis">
            <Field label="Führerschein-Nr.">
              <input value={data.license_nr} onChange={set("license_nr")} className="input font-mono" />
            </Field>
            <Field label="Klassen">
              <input value={data.license_class} onChange={set("license_class")} placeholder="B, BE" className="input font-mono" />
            </Field>
            <Field label="FS gültig bis">
              <input type="date" value={data.license_expiry} onChange={set("license_expiry")} className="input font-mono" />
            </Field>
            <Field label="Ausweis-Nr.">
              <input value={data.id_card_nr} onChange={set("id_card_nr")} className="input font-mono" />
            </Field>
          </Section>

          <Section title="Notizen">
            <div className="sm:col-span-2">
              <textarea
                value={data.notes}
                onChange={set("notes")}
                rows={3}
                className="input resize-none"
              />
            </div>
          </Section>

          {error && (
            <div className="text-sm text-red-700 bg-red-50 ring-1 ring-red-200 rounded-lg px-3 py-2">{error}</div>
          )}

          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => setMode("choose")}
              className="text-sm text-stone-500 hover:text-stone-900"
            >
              Eingabe abbrechen
            </button>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-1.5 text-white text-sm px-4 py-2 rounded-lg font-medium disabled:opacity-50"
              style={{ background: THEME.primary }}
            >
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Kunde speichern
            </button>
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
        </form>
      )}
    </>
  );
};

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div>
    <div className="text-[11px] uppercase tracking-wider text-stone-500 font-semibold mb-3">{title}</div>
    <div className="grid sm:grid-cols-2 gap-4">{children}</div>
  </div>
);

const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <label className="block">
    <div className="text-[11px] uppercase tracking-wider text-stone-500 font-medium mb-1">{label}</div>
    {children}
  </label>
);

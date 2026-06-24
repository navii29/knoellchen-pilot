"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Building2,
  Camera,
  CreditCard,
  IdCard,
  Loader2,
  Save,
  ScanText,
  Sparkles,
  User,
  UserPlus,
} from "lucide-react";
import Link from "next/link";
import { PageHeader } from "@/components/ui/PageHeader";
import { Panel } from "@/components/ui/Panel";
import { Button } from "@/components/ui/Button";
import { LEGAL_FORMS, COUNTRIES } from "@/lib/customer";
import type { CustomerDocumentType, ParsedCustomerData } from "@/lib/types";

type Mode = "choose" | "ai" | "manual";

type FormState = {
  customer_type: "privat" | "firma";
  company_name: string;
  legal_form: string;
  salutation: string;
  title: string;
  first_name: string;
  last_name: string;
  birthday: string;
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
  id_card_nr: string;
  license_photo_path: string;
  license_photo_back_path: string;
  id_card_photo_path: string;
  id_card_photo_back_path: string;
  notes: string;
};

const empty: FormState = {
  customer_type: "privat",
  company_name: "",
  legal_form: "",
  salutation: "",
  title: "",
  first_name: "",
  last_name: "",
  birthday: "",
  street: "",
  house_nr: "",
  zip: "",
  city: "",
  country: "Deutschland",
  email: "",
  phone: "",
  license_nr: "",
  license_class: "",
  license_expiry: "",
  id_card_nr: "",
  license_photo_path: "",
  license_photo_back_path: "",
  id_card_photo_path: "",
  id_card_photo_back_path: "",
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
  const [dragOver, setDragOver] = useState<"license" | "id_card" | "more" | null>(null);
  // Alle hochgeladenen Bilder (Vorder-/Rückseite, weitere) — werden bei jedem
  // neuen Upload GEMEINSAM erneut ausgelesen, damit die KI z. B. Name (vorne)
  // und Adresse (hinten) zu EINEM Datensatz kombiniert.
  const [docImages, setDocImages] = useState<File[]>([]);

  // Mirrors the hidden <input> onChange in "choose" mode: set the doc hint, switch
  // to the AI view and run the same parse pipeline used by click-to-upload.
  const handleScanDrop = (hint: CustomerDocumentType, list: FileList | null) => {
    const f = list?.[0];
    if (!f) return;
    setDocHint(hint);
    setMode("ai");
    handlePhotoUpload(f, hint);
  };

  const set = (k: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setData((d) => ({ ...d, [k]: e.target.value }));

  const handlePhotoUpload = async (file: File, hintOverride?: CustomerDocumentType) => {
    setError(null);
    setParsing(true);
    // Neues Bild an die bisher hochgeladenen anhängen und ALLE gemeinsam auslesen.
    const allImages = [...docImages, file];
    setDocImages(allImages);
    const fd = new FormData();
    for (const f of allImages) fd.append("file", f);
    const hint = hintOverride ?? docHint;
    if (hint) fd.append("doc_type", hint);
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
      storage_paths?: string[];
      confidence: number;
    };
    const d = j.data;
    const paths = j.storage_paths ?? [j.storage_path];
    const isLicense = j.document_type === "license";
    const isId = j.document_type === "id_card";
    // fill-if-empty: bereits gesetzte (auch vom Nutzer editierte) Werte bleiben,
    // nur leere Felder werden aus dem (kombinierten) OCR befüllt.
    setData((prev) => ({
      ...prev,
      salutation: prev.salutation || d.salutation || "",
      title: prev.title || d.title || "",
      first_name: prev.first_name || d.first_name || "",
      last_name: prev.last_name || d.last_name || "",
      birthday: prev.birthday || d.birthday || "",
      street: prev.street || d.street || "",
      house_nr: prev.house_nr || d.house_nr || "",
      zip: prev.zip || d.zip || "",
      city: prev.city || d.city || "",
      license_nr: prev.license_nr || d.license_nr || "",
      license_class: prev.license_class || d.license_class || "",
      license_expiry: prev.license_expiry || d.license_expiry || "",
      id_card_nr: prev.id_card_nr || d.id_card_nr || "",
      license_photo_path: isLicense ? paths[0] ?? prev.license_photo_path : prev.license_photo_path,
      license_photo_back_path: isLicense ? paths[1] ?? prev.license_photo_back_path : prev.license_photo_back_path,
      id_card_photo_path: isId ? paths[0] ?? prev.id_card_photo_path : prev.id_card_photo_path,
      id_card_photo_back_path: isId ? paths[1] ?? prev.id_card_photo_back_path : prev.id_card_photo_back_path,
    }));
    setDocType(j.document_type);
    setAiConfidence(j.confidence);
    setParsedFromAI(true);
    setMode("manual");
  };

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
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver("license");
            }}
            onDragLeave={() => setDragOver(null)}
            onDrop={(e) => {
              e.preventDefault();
              setDragOver(null);
              handleScanDrop("license", e.dataTransfer.files);
            }}
            className={`panel p-6 text-left hover:border-ink/20 transition ${
              dragOver === "license" ? "ring-2 ring-signal/50 border-signal bg-signal/5" : ""
            }`}
          >
            <div className="w-12 h-12 rounded-panel border border-hairline bg-canvas flex items-center justify-center text-ink-soft mb-4">
              <CreditCard size={22} />
            </div>
            <div className="font-display font-semibold text-[16px] text-ink">Führerschein scannen</div>
            <div className="text-[13px] text-ink-muted mt-1">
              Foto oder Scan — Claude liest Name, Geburtsdatum, FS-Nummer und Klassen aus.
            </div>
            <div className="text-[12px] text-ink-muted mt-2">oder Datei hierher ziehen</div>
          </button>

          <button
            onClick={() => {
              setDocHint("id_card");
              fileRef.current?.click();
            }}
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver("id_card");
            }}
            onDragLeave={() => setDragOver(null)}
            onDrop={(e) => {
              e.preventDefault();
              setDragOver(null);
              handleScanDrop("id_card", e.dataTransfer.files);
            }}
            className={`panel p-6 text-left hover:border-ink/20 transition ${
              dragOver === "id_card" ? "ring-2 ring-signal/50 border-signal bg-signal/5" : ""
            }`}
          >
            <div className="w-12 h-12 rounded-panel border border-hairline bg-canvas flex items-center justify-center text-ink-soft mb-4">
              <IdCard size={22} />
            </div>
            <div className="font-display font-semibold text-[16px] text-ink">Personalausweis scannen</div>
            <div className="text-[13px] text-ink-muted mt-1">
              Bekommt zusätzlich die Anschrift und die Ausweisnummer.
            </div>
            <div className="text-[12px] text-ink-muted mt-2">oder Datei hierher ziehen</div>
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
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver("more");
              }}
              onDragLeave={() => setDragOver(null)}
              onDrop={(e) => {
                e.preventDefault();
                setDragOver(null);
                const f = e.dataTransfer.files?.[0];
                if (f) handlePhotoUpload(f);
              }}
              role="button"
              tabIndex={0}
              onClick={() => fileRef.current?.click()}
              className={`flex items-center gap-3 p-4 rounded-panel border-2 border-dashed cursor-pointer transition-colors ${
                dragOver === "more"
                  ? "border-signal bg-signal/10"
                  : "border-hairline bg-canvas hover:border-signal/50 hover:bg-signal/5"
              }`}
            >
              <Sparkles size={18} className="text-signal shrink-0" />
              <div className="flex-1 text-[13px] text-ink">
                <span className="font-medium">
                  Vorgefüllt von KI ({docType === "license" ? "Führerschein" : docType === "id_card" ? "Ausweis" : "Dokument"})
                </span>
                {aiConfidence != null && (
                  <span className="text-[12px] ml-2 text-ink-muted">
                    Confidence {Math.round(aiConfidence * 100)} % — bitte prüfen
                  </span>
                )}
                <div className="text-[12px] text-ink-muted mt-0.5">
                  {docImages.length <= 1
                    ? "Rückseite hierher ziehen oder klicken — Adresse und Ausweisnummer stehen meist hinten."
                    : `${docImages.length} Seiten gemeinsam ausgelesen — weitere hierher ziehen oder klicken.`}
                </div>
              </div>
              <span className="text-[12px] inline-flex items-center gap-1 text-signal font-medium shrink-0">
                <Camera size={13} /> Weitere Seite
              </span>
            </div>
          )}

          <Panel>
            <div className="data-label mb-3">Kundentyp</div>
            <CustomerTypeToggle
              value={data.customer_type}
              onChange={(t) => setData((d) => ({ ...d, customer_type: t }))}
            />
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
                  <input
                    type="date"
                    value={data.birthday}
                    onChange={set("birthday")}
                    className="field font-mono tnum"
                  />
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
                <select value={data.country} onChange={set("country")} className="field">
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

const CustomerTypeToggle = ({
  value,
  onChange,
}: {
  value: "privat" | "firma";
  onChange: (t: "privat" | "firma") => void;
}) => (
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
        onClick={() => onChange(v)}
        className={`inline-flex items-center gap-1.5 rounded-[6px] px-3 py-1.5 text-[13px] font-medium transition-colors ${
          value === v ? "bg-paper text-ink shadow-sm" : "text-ink-muted hover:text-ink"
        }`}
      >
        <Icon size={14} /> {label}
      </button>
    ))}
  </div>
);

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

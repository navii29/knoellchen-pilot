"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, FileText, Loader2, Save, ScanText, Sparkles } from "lucide-react";
import Link from "next/link";
import { THEME } from "@/lib/theme";
import type { ParsedContractData } from "@/lib/types";

type Mode = "choose" | "ai" | "manual";
type FormState = {
  contract_nr: string;
  plate: string;
  vehicle_type: string;
  renter_name: string;
  renter_email: string;
  renter_phone: string;
  renter_address: string;
  renter_birthday: string;
  renter_license_nr: string;
  pickup_date: string;
  pickup_time: string;
  return_date: string;
  return_time: string;
  daily_rate: string;
  total_amount: string;
  deposit: string;
  km_pickup: string;
  contract_pdf_path: string;
  notes: string;
};

const empty: FormState = {
  contract_nr: "",
  plate: "",
  vehicle_type: "",
  renter_name: "",
  renter_email: "",
  renter_phone: "",
  renter_address: "",
  renter_birthday: "",
  renter_license_nr: "",
  pickup_date: "",
  pickup_time: "",
  return_date: "",
  return_time: "",
  daily_rate: "",
  total_amount: "",
  deposit: "",
  km_pickup: "",
  contract_pdf_path: "",
  notes: "",
};

export const NewContractClient = () => {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [mode, setMode] = useState<Mode>("choose");
  const [data, setData] = useState<FormState>(empty);
  const [parsing, setParsing] = useState(false);
  const [parsedFromAI, setParsedFromAI] = useState(false);
  const [aiConfidence, setAiConfidence] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const set = (k: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setData((d) => ({ ...d, [k]: e.target.value }));

  const handlePdfUpload = async (file: File) => {
    setError(null);
    setParsing(true);
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch("/api/contracts/parse", { method: "POST", body: fd });
    setParsing(false);
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setError(j.error || "Vertrag konnte nicht ausgelesen werden");
      return;
    }
    const j = (await res.json()) as { data: ParsedContractData; pdf_path: string; confidence: number };
    const d = j.data;
    setData({
      contract_nr: d.contract_nr || "",
      plate: d.plate || "",
      vehicle_type: d.vehicle_type || "",
      renter_name: d.renter_name || "",
      renter_email: d.renter_email || "",
      renter_phone: d.renter_phone || "",
      renter_address: d.renter_address || "",
      renter_birthday: d.renter_birthday || "",
      renter_license_nr: d.renter_license_nr || "",
      pickup_date: d.pickup_date || "",
      pickup_time: d.pickup_time || "",
      return_date: d.return_date || "",
      return_time: d.return_time || "",
      daily_rate: d.daily_rate ? String(d.daily_rate) : "",
      total_amount: d.total_amount ? String(d.total_amount) : "",
      deposit: d.deposit ? String(d.deposit) : "",
      km_pickup: "",
      contract_pdf_path: j.pdf_path || "",
      notes: "",
    });
    setAiConfidence(j.confidence);
    setParsedFromAI(true);
    setMode("manual");
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSaving(true);
    const numeric = (v: string) => (v.trim() === "" ? null : Number(v));
    const payload = {
      ...data,
      daily_rate: numeric(data.daily_rate),
      total_amount: numeric(data.total_amount),
      deposit: numeric(data.deposit),
      km_pickup: numeric(data.km_pickup),
    };
    const res = await fetch("/api/contracts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    setSaving(false);
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setError(j.error || "Speichern fehlgeschlagen");
      return;
    }
    const j = (await res.json()) as { contract: { id: string } };
    router.push(`/dashboard/contracts/${j.contract.id}`);
    router.refresh();
  };

  return (
    <>
      <Link
        href="/dashboard/contracts"
        className="inline-flex items-center gap-1.5 text-sm text-stone-500 hover:text-stone-900 mb-4"
      >
        <ArrowLeft size={14} /> Zurück zu Verträgen
      </Link>

      <div className="font-display font-bold text-2xl tracking-tight">Neuer Vertrag</div>
      <p className="text-sm text-stone-500 mt-1">
        Vertrag-PDF hochladen — KI füllt das Formular automatisch — oder manuell anlegen.
      </p>

      {mode === "choose" && (
        <div className="mt-8 grid sm:grid-cols-2 gap-4">
          <button
            onClick={() => fileRef.current?.click()}
            className="rounded-2xl bg-white ring-1 ring-stone-200 p-6 text-left hover:ring-stone-400 transition"
          >
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center"
              style={{ background: THEME.primaryTint, color: THEME.primary }}
            >
              <Sparkles size={22} />
            </div>
            <div className="font-display font-semibold text-lg mt-4">PDF hochladen</div>
            <div className="text-sm text-stone-500 mt-1">
              Unterschriebenen Mietvertrag als PDF — Claude liest die Daten aus.
            </div>
          </button>
          <button
            onClick={() => setMode("manual")}
            className="rounded-2xl bg-white ring-1 ring-stone-200 p-6 text-left hover:ring-stone-400 transition"
          >
            <div className="w-12 h-12 rounded-xl bg-stone-100 text-stone-700 flex items-center justify-center">
              <FileText size={22} />
            </div>
            <div className="font-display font-semibold text-lg mt-4">Manuell anlegen</div>
            <div className="text-sm text-stone-500 mt-1">Alle Felder direkt in das Formular eintragen.</div>
          </button>

          <input
            ref={fileRef}
            type="file"
            accept="application/pdf,image/png,image/jpeg,image/webp"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) {
                setMode("ai");
                handlePdfUpload(f);
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
            <div className="font-display font-semibold">Claude liest den Vertrag aus…</div>
            <div className="text-xs text-stone-500 mt-1">Das dauert meist 5–15 Sekunden.</div>
          </div>
        </div>
      )}

      {mode === "ai" && error && (
        <div className="mt-8 text-sm text-red-700 bg-red-50 ring-1 ring-red-200 rounded-lg px-3 py-2">
          {error}
          <button onClick={() => setMode("choose")} className="ml-2 underline">Zurück</button>
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
                <span className="font-medium">Vorgefüllt von KI</span>
                {aiConfidence != null && (
                  <span className="text-xs ml-2 opacity-80">
                    Confidence {Math.round(aiConfidence * 100)} % — bitte prüfen
                  </span>
                )}
              </div>
            </div>
          )}

          <Section title="Vertrag">
            <Field label="Vertrags-Nr">
              <input
                value={data.contract_nr}
                onChange={set("contract_nr")}
                placeholder="MV-2026-0042 (leer = automatisch)"
                className="input font-mono"
              />
            </Field>
            <Field label="Notizen">
              <input value={data.notes} onChange={set("notes")} className="input" />
            </Field>
          </Section>

          <Section title="Fahrzeug">
            <Field label="Kennzeichen *">
              <input required value={data.plate} onChange={set("plate")} placeholder="M-KP 2847" className="input font-mono uppercase" />
            </Field>
            <Field label="Fahrzeugtyp">
              <input value={data.vehicle_type} onChange={set("vehicle_type")} placeholder="VW Golf VIII" className="input" />
            </Field>
          </Section>

          <Section title="Mieter">
            <Field label="Name *">
              <input required value={data.renter_name} onChange={set("renter_name")} className="input" />
            </Field>
            <Field label="Geburtsdatum">
              <input value={data.renter_birthday} onChange={set("renter_birthday")} placeholder="YYYY-MM-DD" className="input font-mono" />
            </Field>
            <Field label="Adresse">
              <input value={data.renter_address} onChange={set("renter_address")} className="input" />
            </Field>
            <Field label="Führerschein-Nr.">
              <input value={data.renter_license_nr} onChange={set("renter_license_nr")} className="input font-mono" />
            </Field>
            <Field label="E-Mail">
              <input type="email" value={data.renter_email} onChange={set("renter_email")} className="input" />
            </Field>
            <Field label="Telefon">
              <input value={data.renter_phone} onChange={set("renter_phone")} className="input font-mono" />
            </Field>
          </Section>

          <Section title="Zeitraum">
            <Field label="Mietbeginn *">
              <input type="date" required value={data.pickup_date} onChange={set("pickup_date")} className="input" />
            </Field>
            <Field label="Uhrzeit Abholung">
              <input type="time" value={data.pickup_time} onChange={set("pickup_time")} className="input font-mono" />
            </Field>
            <Field label="Mietende *">
              <input type="date" required value={data.return_date} onChange={set("return_date")} className="input" />
            </Field>
            <Field label="Uhrzeit Rückgabe">
              <input type="time" value={data.return_time} onChange={set("return_time")} className="input font-mono" />
            </Field>
          </Section>

          <Section title="Kosten & Kilometer">
            <Field label="Tagespreis (€)">
              <input value={data.daily_rate} onChange={set("daily_rate")} className="input font-mono" />
            </Field>
            <Field label="Gesamtbetrag (€)">
              <input value={data.total_amount} onChange={set("total_amount")} className="input font-mono" />
            </Field>
            <Field label="Kaution (€)">
              <input value={data.deposit} onChange={set("deposit")} className="input font-mono" />
            </Field>
            <Field label="km bei Abholung">
              <input value={data.km_pickup} onChange={set("km_pickup")} className="input font-mono" />
            </Field>
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
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Vertrag speichern
            </button>
          </div>

          <style jsx>{`
            .input {
              width: 100%;
              padding: 0.5rem 0.75rem;
              font-size: 0.875rem;
              border-radius: 0.5rem;
              outline: none;
              box-shadow: inset 0 0 0 1px rgb(231 229 228);
            }
            .input:focus { box-shadow: inset 0 0 0 1px rgb(168 162 158); }
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

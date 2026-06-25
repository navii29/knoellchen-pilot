"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Check, FileSignature, FileText, Handshake, Loader2, Save, ScanText, Sparkles, TrendingUp, UserCheck, X } from "lucide-react";
import Link from "next/link";
import type {
  Customer,
  ParsedContractData,
  SpecialTermsCategory,
  SpecialTermsTemplate,
} from "@/lib/types";
import { SPECIAL_TERMS_CATEGORY_LABEL } from "@/lib/types";
import {
  PARTNER_TYPE_META,
  calculateCommission,
  contractDays,
  type SalesPartner,
} from "@/lib/partners";
import { fmtEur } from "@/lib/utils";
import { normalizeNumber } from "@/lib/csv-import";
import { customerDisplayName } from "@/lib/customer";
import { Button } from "@/components/ui/Button";
import { VehiclePicker } from "@/components/contract/VehiclePicker";

type Mode = "choose" | "ai" | "manual";
type FormState = {
  contract_nr: string;
  plate: string;
  vehicle_type: string;
  manufacturer: string;
  model: string;
  color: string;
  first_registration: string;
  fuel_type: string;
  vin: string;
  customer_id: string;
  renter_name: string;
  renter_email: string;
  renter_phone: string;
  renter_address: string;
  renter_birthday: string;
  renter_license_nr: string;
  renter_license_class: string;
  renter_license_expiry: string;
  renter_license_issued: string;
  renter_birthplace: string;
  renter_id_card_nr: string;
  renter_id_card_authority: string;
  renter_iban: string;
  renter_bank_holder: string;
  pickup_date: string;
  pickup_time: string;
  return_date: string;
  return_time: string;
  daily_rate: string;
  weekly_rate: string;
  monthly_rate: string;
  total_amount: string;
  deposit: string;
  km_pickup: string;
  km_limit: string;
  contract_pdf_path: string;
  notes: string;
  partner_id: string;
  partner_purchase_price: string;
  partner_selling_price: string;
  payment_method: string;
  insurance_type: string;
  insurance_deductible: string;
  special_terms: string;
  delivery_cost: string;
  pickup_cost: string;
  driver2_name: string;
  driver2_license: string;
  damages_at_handover: string;
  keys_count: string;
};

const empty: FormState = {
  contract_nr: "",
  plate: "",
  vehicle_type: "",
  manufacturer: "",
  model: "",
  color: "",
  first_registration: "",
  fuel_type: "",
  vin: "",
  customer_id: "",
  renter_name: "",
  renter_email: "",
  renter_phone: "",
  renter_address: "",
  renter_birthday: "",
  renter_license_nr: "",
  renter_license_class: "",
  renter_license_expiry: "",
  renter_license_issued: "",
  renter_birthplace: "",
  renter_id_card_nr: "",
  renter_id_card_authority: "",
  renter_iban: "",
  renter_bank_holder: "",
  pickup_date: "",
  pickup_time: "",
  return_date: "",
  return_time: "",
  daily_rate: "",
  weekly_rate: "",
  monthly_rate: "",
  total_amount: "",
  deposit: "",
  km_pickup: "",
  km_limit: "",
  contract_pdf_path: "",
  notes: "",
  partner_id: "",
  partner_purchase_price: "",
  partner_selling_price: "",
  payment_method: "bank_transfer",
  insurance_type: "full",
  insurance_deductible: "",
  special_terms: "",
  delivery_cost: "0",
  pickup_cost: "0",
  driver2_name: "",
  driver2_license: "",
  damages_at_handover: "Keine",
  keys_count: "1",
};

const customerLabel = (c: Customer) => {
  const name = customerDisplayName(c) || c.last_name;
  const ort = c.city ? ` · ${c.city}` : "";
  return `${name}${ort}`;
};

const fillFromCustomer = (prev: FormState, c: Customer): FormState => {
  const fullName = customerDisplayName(c) || c.last_name;
  const address = [
    [c.street, c.house_nr].filter(Boolean).join(" "),
    [c.zip, c.city].filter(Boolean).join(" "),
  ]
    .filter(Boolean)
    .join(", ");
  return {
    ...prev,
    customer_id: c.id,
    renter_name: fullName,
    renter_email: c.email || "",
    renter_phone: c.phone || "",
    renter_address: address,
    renter_birthday: c.birthday || "",
    renter_license_nr: c.license_nr || "",
    renter_license_class: c.license_class || "",
    renter_license_expiry: c.license_expiry || "",
    renter_license_issued: c.license_issued || "",
    renter_birthplace: c.birth_place || "",
    renter_id_card_nr: c.id_card_nr || "",
    renter_id_card_authority: c.id_card_authority || "",
    renter_iban: c.iban || "",
    renter_bank_holder: c.bank_holder || "",
  } as FormState;
};

const DEFAULT_SELECTED_TITLES = new Set([
  "Nichtraucherfahrzeug",
  "Versicherungsschutz Diebstahl",
  "Reifenpflicht",
  "Fahrzeug gereinigt zurückgeben",
  "Keine Drittvermietung",
  "Fahrtauglichkeit",
  "Fahrzeugtausch",
  "Maut nicht inkludiert",
]);

export const NewContractClient = ({
  customers,
  partners,
  specialTerms,
  initialCustomerId,
  prefill = null,
}: {
  customers: Customer[];
  partners: SalesPartner[];
  specialTerms: SpecialTermsTemplate[];
  initialCustomerId: string | null;
  prefill?: { plate: string; pickup_date: string; return_date: string } | null;
}) => {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const initialCustomer = useMemo(
    () => (initialCustomerId ? customers.find((c) => c.id === initialCustomerId) ?? null : null),
    [customers, initialCustomerId]
  );
  // Vorbelegung aus dem Kalender (Klick auf freie Fläche): Fahrzeug + Datum.
  const [mode, setMode] = useState<Mode>(
    initialCustomer || prefill?.plate ? "manual" : "choose"
  );
  const [data, setData] = useState<FormState>(() => {
    const base = initialCustomer ? fillFromCustomer(empty, initialCustomer) : empty;
    if (!prefill) return base;
    return {
      ...base,
      plate: prefill.plate || base.plate,
      pickup_date: prefill.pickup_date || base.pickup_date,
      return_date: prefill.return_date || base.return_date,
    };
  });
  const [parsing, setParsing] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [parsedFromAI, setParsedFromAI] = useState(false);
  const [aiConfidence, setAiConfidence] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [createdId, setCreatedId] = useState<string | null>(null);
  const [selectedTerms, setSelectedTerms] = useState<Set<string>>(() => {
    const set = new Set<string>();
    for (const t of specialTerms) {
      if (DEFAULT_SELECTED_TITLES.has(t.title)) set.add(t.id);
    }
    return set;
  });
  const toggleTerm = (id: string) => {
    setSelectedTerms((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };
  const groupedTerms = useMemo(() => {
    const groups = new Map<SpecialTermsCategory, SpecialTermsTemplate[]>();
    for (const t of specialTerms) {
      const arr = groups.get(t.category) ?? [];
      arr.push(t);
      groups.set(t.category, arr);
    }
    return Array.from(groups.entries()).sort((a, b) => {
      const order = ["general", "international", "sportscars", "damage", "longterm"];
      return order.indexOf(a[0]) - order.indexOf(b[0]);
    });
  }, [specialTerms]);

  const set = (k: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setData((d) => ({ ...d, [k]: e.target.value }));

  const pickCustomer = (id: string) => {
    if (!id) {
      setData((prev) => ({ ...prev, customer_id: "" }));
      return;
    }
    const c = customers.find((x) => x.id === id);
    if (!c) return;
    setData((prev) => fillFromCustomer(prev, c));
  };

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
      manufacturer: d.manufacturer || "",
      model: d.model || "",
      color: d.color || "",
      first_registration: d.first_registration || "",
      fuel_type: d.fuel_type || "",
      vin: d.vin || "",
      customer_id: "",
      renter_name: d.renter_name || "",
      renter_email: d.renter_email || "",
      renter_phone: d.renter_phone || "",
      renter_address: d.renter_address || "",
      renter_birthday: d.renter_birthday || "",
      renter_license_nr: d.renter_license_nr || "",
      renter_license_class: d.renter_license_class || "",
      renter_license_expiry: "",
      renter_license_issued: d.renter_license_issued || "",
      renter_birthplace: d.renter_birthplace || "",
      renter_id_card_nr: d.renter_id_card_nr || "",
      renter_id_card_authority: d.renter_id_card_authority || "",
      renter_iban: d.renter_iban || "",
      renter_bank_holder: d.renter_bank_holder || "",
      pickup_date: d.pickup_date || "",
      pickup_time: d.pickup_time || "",
      return_date: d.return_date || "",
      return_time: d.return_time || "",
      daily_rate: d.daily_rate ? String(d.daily_rate) : "",
      weekly_rate: d.weekly_rate ? String(d.weekly_rate) : "",
      monthly_rate: d.monthly_rate ? String(d.monthly_rate) : "",
      total_amount: d.total_amount ? String(d.total_amount) : "",
      deposit: d.deposit ? String(d.deposit) : "",
      km_pickup: d.km_pickup != null ? String(d.km_pickup) : "",
      km_limit: d.km_limit != null ? String(d.km_limit) : "",
      contract_pdf_path: j.pdf_path || "",
      notes: "",
      partner_id: "",
      partner_purchase_price: "",
      partner_selling_price: "",
      payment_method: "bank_transfer",
      insurance_type: "full",
      insurance_deductible: "",
      special_terms: "",
      delivery_cost: "0",
      pickup_cost: "0",
      driver2_name: "",
      driver2_license: "",
      damages_at_handover: "Keine",
      keys_count: "1",
    });
    setAiConfidence(j.confidence);
    setParsedFromAI(true);
    setMode("manual");
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSaving(true);
    // Deutsch-toleranter Parser (1.099,00 / 99,50) statt rohem Number(), das
    // deutsche Beträge still zu NaN→null verwarf (Review #3).
    const numeric = (v: string) => normalizeNumber(v);
    const partner = partners.find((p) => p.id === data.partner_id) ?? null;
    const purchasePerDay = numeric(data.partner_purchase_price);
    const sellingPerDay = numeric(data.partner_selling_price);
    let partnerCommission: number | null = null;
    if (partner && data.pickup_date && data.return_date) {
      const days = contractDays({
        pickup_date: data.pickup_date,
        return_date: data.return_date,
        actual_return_date: null,
      });
      partnerCommission = calculateCommission({
        partner,
        purchase_price_per_day: purchasePerDay,
        selling_price_per_day: sellingPerDay,
        days,
      }).commission_eur;
    }

    const payload = {
      ...data,
      // Fahrzeug-Anreicherung aus dem Vertrags-OCR (leer -> null, damit die
      // API nie Leerstrings ueber bestehende Fahrzeugdaten schreibt).
      manufacturer: data.manufacturer.trim() || null,
      model: data.model.trim() || null,
      color: data.color.trim() || null,
      first_registration: data.first_registration.trim() || null,
      fuel_type: data.fuel_type.trim() || null,
      vin: data.vin.trim() || null,
      // Fahrzeug-Stammdaten fürs Backfill (Vertragsspalten vehicle_color/_fin).
      vehicle_color: data.color.trim() || null,
      vehicle_fin: data.vin.trim() || null,
      daily_rate: numeric(data.daily_rate),
      weekly_rate: numeric(data.weekly_rate),
      monthly_rate: numeric(data.monthly_rate),
      total_amount: numeric(data.total_amount),
      deposit: numeric(data.deposit),
      km_pickup: numeric(data.km_pickup),
      km_limit: numeric(data.km_limit),
      partner_id: data.partner_id || null,
      partner_purchase_price: purchasePerDay,
      partner_selling_price: sellingPerDay,
      partner_commission: partnerCommission,
      payment_method: data.payment_method || null,
      insurance_type: data.insurance_type || null,
      insurance_deductible: numeric(data.insurance_deductible),
      special_terms: data.special_terms || null,
      custom_special_terms: data.special_terms || null,
      selected_special_terms: Array.from(selectedTerms),
      delivery_cost: numeric(data.delivery_cost),
      pickup_cost: numeric(data.pickup_cost),
      driver2_name: data.driver2_name || null,
      driver2_license: data.driver2_license || null,
      damages_at_handover: data.damages_at_handover || null,
      keys_count: numeric(data.keys_count),
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
    setCreatedId(j.contract.id);
  };

  // Gemeinsamer Pfad fuer Datei-Auswahl (Klick) und Drag&Drop.
  const acceptPdfFile = (f: File | undefined | null) => {
    if (f) {
      setMode("ai");
      handlePdfUpload(f);
    }
  };

  const goToSign = () => {
    if (createdId) router.push(`/dashboard/contracts/${createdId}/sign`);
  };
  const goToDetail = () => {
    if (createdId) router.push(`/dashboard/contracts/${createdId}`);
  };

  return (
    <>
      <Link
        href="/dashboard/contracts"
        className="inline-flex items-center gap-1.5 text-[13px] text-ink-muted hover:text-ink mb-5"
      >
        <ArrowLeft size={14} /> Zurück zu Verträgen
      </Link>

      <div className="font-display font-extrabold text-ink text-[26px] sm:text-[30px] leading-[1.05] tracking-tightest">
        Neuer Vertrag
      </div>
      <p className="text-[13px] text-ink-muted mt-1">
        Vertrag-PDF hochladen — KI füllt das Formular automatisch — oder manuell anlegen.
      </p>

      {mode === "choose" && (
        <div className="mt-8 grid sm:grid-cols-2 gap-4">
          <button
            onClick={() => fileRef.current?.click()}
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragOver(false);
              acceptPdfFile(e.dataTransfer.files?.[0]);
            }}
            className={`panel p-6 text-left hover:border-ink/20 hover:shadow-md transition ${
              dragOver ? "border-signal bg-signal/5" : ""
            }`}
          >
            <div className="w-12 h-12 rounded-panel border border-hairline bg-[#FFEDE4] text-signal flex items-center justify-center">
              <Sparkles size={22} />
            </div>
            <div className="font-display font-bold text-[17px] tracking-tight text-ink mt-4">PDF hochladen</div>
            <div className="text-[13px] text-ink-muted mt-1">
              Unterschriebenen Mietvertrag als PDF — Claude liest die Daten aus.
            </div>
            <div className="text-[12px] text-ink-muted mt-2">oder Datei hierher ziehen</div>
          </button>
          <button
            onClick={() => setMode("manual")}
            className="panel p-6 text-left hover:border-ink/20 hover:shadow-md transition"
          >
            <div className="w-12 h-12 rounded-panel border border-hairline bg-canvas text-ink-soft flex items-center justify-center">
              <FileText size={22} />
            </div>
            <div className="font-display font-bold text-[17px] tracking-tight text-ink mt-4">Manuell anlegen</div>
            <div className="text-[13px] text-ink-muted mt-1">Alle Felder direkt in das Formular eintragen.</div>
          </button>

          <input
            ref={fileRef}
            type="file"
            accept="application/pdf,image/png,image/jpeg,image/webp"
            className="hidden"
            onChange={(e) => {
              acceptPdfFile(e.target.files?.[0]);
              if (fileRef.current) fileRef.current.value = "";
            }}
          />
        </div>
      )}

      {mode === "ai" && parsing && (
        <div className="mt-8 panel p-8 flex items-center gap-4">
          <div className="w-12 h-12 rounded-panel border border-hairline bg-[#FFEDE4] text-signal flex items-center justify-center">
            <ScanText size={22} className="animate-pulse" />
          </div>
          <div>
            <div className="font-display font-bold text-[15px] text-ink">Claude liest den Vertrag aus…</div>
            <div className="text-[12px] text-ink-muted mt-1">Das dauert meist 5–15 Sekunden.</div>
          </div>
        </div>
      )}

      {mode === "ai" && error && (
        <div className="mt-8 text-[13px] text-red-700 bg-red-50 border border-red-200 rounded-panel px-3 py-2">
          {error}
          <button onClick={() => setMode("choose")} className="ml-2 underline">Zurück</button>
        </div>
      )}

      {mode === "manual" && (
        <form onSubmit={submit} className="mt-6 panel p-6 space-y-6">
          {parsedFromAI && (
            <div className="flex items-center gap-3 p-3 rounded-panel border border-[#FF5A1F]/20 bg-[#FFEDE4]">
              <Sparkles size={16} className="text-signal shrink-0" />
              <div className="flex-1 text-[13px] text-ink">
                <span className="font-medium">Vorgefüllt von KI</span>
                {aiConfidence != null && (
                  <span className="text-[12px] text-ink-muted ml-2">
                    Confidence {Math.round(aiConfidence * 100)} % — bitte prüfen
                  </span>
                )}
              </div>
            </div>
          )}

          {customers.length > 0 && (
            <div className="rounded-panel border border-hairline bg-canvas p-4">
              <label className="block">
                <div className="flex items-center gap-1.5 data-label text-ink-muted mb-2">
                  <UserCheck size={12} /> Bestehender Kunde
                </div>
                <select
                  value={data.customer_id}
                  onChange={(e) => pickCustomer(e.target.value)}
                  className="field"
                >
                  <option value="">— Neuer Mieter (Daten unten eintragen) —</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {customerLabel(c)}
                    </option>
                  ))}
                </select>
                {data.customer_id && (
                  <div className="mt-2 text-[12px] text-ink-muted">
                    Mieterdaten unten wurden automatisch übernommen — du kannst sie für diesen Vertrag noch anpassen.{" "}
                    <Link
                      href={`/dashboard/customers/${data.customer_id}`}
                      className="text-ink hover:underline"
                    >
                      Kundendaten dauerhaft ändern →
                    </Link>
                  </div>
                )}
                {!data.customer_id && (
                  <div className="mt-2 text-[12px] text-ink-muted">
                    Noch nicht angelegt?{" "}
                    <Link href="/dashboard/customers/new" className="text-ink hover:underline">
                      Kunden zuerst anlegen →
                    </Link>
                  </div>
                )}
              </label>
            </div>
          )}

          <FormSection title="Vertrag">
            <Field label="Vertrags-Nr">
              <input
                value={data.contract_nr}
                onChange={set("contract_nr")}
                placeholder="MV-2026-0042 (leer = automatisch)"
                className="field font-mono tnum"
              />
            </Field>
            <Field label="Notizen">
              <input value={data.notes} onChange={set("notes")} className="field" />
            </Field>
          </FormSection>

          <FormSection title="Fahrzeug">
            {/* div statt <label>: Klicks im Dropdown duerfen nicht auf das Input zurueckspringen */}
            <div className="block">
              <div className="data-label text-ink-muted mb-1">Kennzeichen *</div>
              <VehiclePicker
                plate={data.plate}
                vehicleType={data.vehicle_type}
                pickupDate={data.pickup_date}
                returnDate={data.return_date}
                required
                onSelect={(v) =>
                  setData((d) => ({
                    ...d,
                    plate: v.plate,
                    vehicle_type: v.vehicle_type || d.vehicle_type,
                    // Echte Stammdaten des gewählten Fahrzeugs übernehmen — sonst
                    // bleiben Hersteller/Modell/Farbe/Kraftstoff/FIN leer und die
                    // Platzhalter wirken wie (falsche) Daten.
                    manufacturer: v.manufacturer ?? "",
                    model: v.model ?? "",
                    color: v.color ?? "",
                    first_registration: v.first_registration ?? "",
                    fuel_type: v.fuel_type ?? "",
                    // FIN landet im vin-Feld (FormState hat kein fin_number) —
                    // das sichtbare FIN-Input und das Submit-Payload lesen data.vin.
                    vin: v.fin_number ?? "",
                    // Preise nur befüllen, wenn noch leer (eine bereits gesetzte
                    // Partner-/KI-Rate bzw. Kaution nicht überschreiben).
                    daily_rate: d.daily_rate || (v.daily_rate != null ? String(v.daily_rate) : ""),
                    deposit: d.deposit || (v.deposit != null ? String(v.deposit) : ""),
                  }))
                }
                onPlateChange={(plate) => setData((d) => ({ ...d, plate }))}
              />
            </div>
            <Field label="Fahrzeugtyp">
              <input value={data.vehicle_type} onChange={set("vehicle_type")} placeholder="VW Golf VIII" className="field" />
            </Field>
            <Field label="Hersteller">
              <input value={data.manufacturer} onChange={set("manufacturer")} placeholder="VW" className="field" />
            </Field>
            <Field label="Modell">
              <input value={data.model} onChange={set("model")} placeholder="Golf VIII" className="field" />
            </Field>
            <Field label="Farbe">
              <input value={data.color} onChange={set("color")} placeholder="Schwarz" className="field" />
            </Field>
            <Field label="Erstzulassung">
              <input type="date" value={data.first_registration} onChange={set("first_registration")} className="field font-mono tnum" />
            </Field>
            <Field label="Kraftstoff">
              <input value={data.fuel_type} onChange={set("fuel_type")} placeholder="Benzin" className="field" />
            </Field>
            <Field label="FIN">
              <input value={data.vin} onChange={set("vin")} placeholder="17-stellig" className="field font-mono tnum" />
            </Field>
          </FormSection>

          <FormSection title="Mieter">
            <Field label="Name *">
              <input required value={data.renter_name} onChange={set("renter_name")} className="field" />
            </Field>
            <Field label="Geburtsdatum">
              <input value={data.renter_birthday} onChange={set("renter_birthday")} placeholder="YYYY-MM-DD" className="field font-mono tnum" />
            </Field>
            <Field label="Geburtsort">
              <input value={data.renter_birthplace} onChange={set("renter_birthplace")} className="field" />
            </Field>
            <Field label="Adresse">
              <input value={data.renter_address} onChange={set("renter_address")} className="field" />
            </Field>
            <Field label="Führerschein-Nr.">
              <input value={data.renter_license_nr} onChange={set("renter_license_nr")} className="field font-mono tnum" />
            </Field>
            <Field label="FS-Klasse">
              <input value={data.renter_license_class} onChange={set("renter_license_class")} className="field font-mono tnum" />
            </Field>
            <Field label="FS-Ausstellungsdatum">
              <input value={data.renter_license_issued} onChange={set("renter_license_issued")} placeholder="YYYY-MM-DD" className="field font-mono tnum" />
            </Field>
            <Field label="Ausweisnummer">
              <input value={data.renter_id_card_nr} onChange={set("renter_id_card_nr")} className="field font-mono tnum" />
            </Field>
            <Field label="Ausweis-Behörde">
              <input value={data.renter_id_card_authority} onChange={set("renter_id_card_authority")} className="field" />
            </Field>
            <Field label="E-Mail">
              <input type="email" value={data.renter_email} onChange={set("renter_email")} className="field" />
            </Field>
            <Field label="Telefon">
              <input value={data.renter_phone} onChange={set("renter_phone")} className="field font-mono tnum" />
            </Field>
            <Field label="IBAN">
              <input value={data.renter_iban} onChange={set("renter_iban")} className="field font-mono tnum" />
            </Field>
            <Field label="Kontoinhaber">
              <input value={data.renter_bank_holder} onChange={set("renter_bank_holder")} className="field" />
            </Field>
          </FormSection>

          <FormSection title="Zeitraum">
            <Field label="Mietbeginn *">
              <input type="date" required value={data.pickup_date} onChange={set("pickup_date")} className="field font-mono tnum" />
            </Field>
            <Field label="Uhrzeit Abholung">
              <input type="time" value={data.pickup_time} onChange={set("pickup_time")} className="field font-mono tnum" />
            </Field>
            <Field label="Mietende *">
              <input type="date" required value={data.return_date} onChange={set("return_date")} className="field font-mono tnum" />
            </Field>
            <Field label="Uhrzeit Rückgabe">
              <input type="time" value={data.return_time} onChange={set("return_time")} className="field font-mono tnum" />
            </Field>
          </FormSection>

          <FormSection title="Vertriebspartner (optional)">
            <div className="sm:col-span-2">
              <PartnerPicker
                partners={partners}
                plate={data.plate}
                partnerId={data.partner_id}
                purchasePerDay={data.partner_purchase_price}
                sellingPerDay={data.partner_selling_price}
                pickupDate={data.pickup_date}
                returnDate={data.return_date}
                onPartnerChange={(id, pricing) =>
                  setData((d) => ({
                    ...d,
                    partner_id: id,
                    partner_purchase_price:
                      pricing?.purchase_price != null ? String(pricing.purchase_price) : "",
                    partner_selling_price:
                      pricing?.selling_price != null ? String(pricing.selling_price) : "",
                    daily_rate:
                      pricing?.selling_price != null
                        ? String(pricing.selling_price)
                        : d.daily_rate,
                  }))
                }
                onPurchaseChange={(v) =>
                  setData((d) => ({ ...d, partner_purchase_price: v }))
                }
                onSellingChange={(v) =>
                  setData((d) => ({
                    ...d,
                    partner_selling_price: v,
                    daily_rate: v,
                  }))
                }
              />
            </div>
          </FormSection>

          <FormSection title="Kosten & Kilometer">
            <div className="sm:col-span-2">
              <PriceRecommendation
                plate={data.plate}
                pickupDate={data.pickup_date}
                returnDate={data.return_date}
                onApply={(price) =>
                  setData((d) => ({ ...d, daily_rate: price.toFixed(2) }))
                }
              />
            </div>
            <Field label="Tagespreis (€)">
              <input value={data.daily_rate} onChange={set("daily_rate")} className="field font-mono tnum" />
            </Field>
            <Field label="Wochenmiete (€)">
              <input value={data.weekly_rate} onChange={set("weekly_rate")} className="field font-mono tnum" />
            </Field>
            <Field label="Monatsmiete (€)">
              <input value={data.monthly_rate} onChange={set("monthly_rate")} className="field font-mono tnum" />
            </Field>
            <Field label="Gesamtbetrag (€)">
              <input value={data.total_amount} onChange={set("total_amount")} className="field font-mono tnum" />
            </Field>
            <Field label="Kaution (€)">
              <input value={data.deposit} onChange={set("deposit")} className="field font-mono tnum" />
            </Field>
            <Field label="km bei Abholung">
              <input value={data.km_pickup} onChange={set("km_pickup")} className="field font-mono tnum" />
            </Field>
            <Field label="Freikilometer">
              <input
                value={data.km_limit}
                onChange={set("km_limit")}
                placeholder="z.B. 1500 (leer = unbegrenzt)"
                className="field font-mono tnum"
              />
            </Field>
          </FormSection>

          <FormSection title="Zahlung & Versicherung">
            <Field label="Zahlungsart">
              <select value={data.payment_method} onChange={set("payment_method")} className="field">
                <option value="bank_transfer">Vorabüberweisung</option>
                <option value="cash">Bar</option>
                <option value="credit_card">Kreditkarte</option>
                <option value="paypal">PayPal</option>
                <option value="invoice">Rechnung</option>
              </select>
            </Field>
            <Field label="Versicherung">
              <select value={data.insurance_type} onChange={set("insurance_type")} className="field">
                <option value="full">Haftpflicht, TK + VK</option>
                <option value="basic">Haftpflicht</option>
                <option value="none">Keine</option>
              </select>
            </Field>
            <Field label="Selbstbeteiligung (€)">
              <input
                value={data.insurance_deductible}
                onChange={set("insurance_deductible")}
                placeholder="z.B. 1000"
                className="field font-mono tnum"
              />
            </Field>
          </FormSection>

          <FormSection title="Sondervereinbarungen">
            <div className="sm:col-span-2 space-y-4">
              <p className="text-[12px] text-ink-muted leading-relaxed">
                Wähle die Textbausteine, die auf Seite 3 des Mietvertrags erscheinen sollen.
                Eigene Vereinbarungen kannst du unten als Freitext ergänzen.{" "}
                <Link href="/dashboard/settings/special-terms" className="text-ink hover:underline">
                  Textbausteine verwalten →
                </Link>
              </p>
              {groupedTerms.length === 0 && (
                <div className="text-[12px] text-ink-muted border border-hairline bg-canvas rounded-panel p-3">
                  Noch keine Textbausteine angelegt — lege sie in den Einstellungen an.
                </div>
              )}
              {groupedTerms.map(([cat, items]) => (
                <div key={cat}>
                  <div className="data-label text-ink-muted mb-2">
                    {SPECIAL_TERMS_CATEGORY_LABEL[cat]}
                  </div>
                  <div className="rounded-panel border border-hairline bg-paper divide-y divide-hairline">
                    {items.map((t) => {
                      const checked = selectedTerms.has(t.id);
                      return (
                        <label
                          key={t.id}
                          className="flex items-start gap-3 p-2.5 cursor-pointer hover:bg-canvas"
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleTerm(t.id)}
                            className="mt-0.5 w-4 h-4 accent-ink shrink-0"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="text-[13px] font-medium text-ink">{t.title}</div>
                            <div className="text-[11px] text-ink-muted mt-0.5 leading-snug">{t.text}</div>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                </div>
              ))}
              <Field label="Zusätzliche Vereinbarungen (Freitext)">
                <textarea
                  value={data.special_terms}
                  onChange={set("special_terms")}
                  rows={3}
                  placeholder="Ein Eintrag pro Zeile — wird als zusätzlicher Punkt auf Seite 3 nummeriert."
                  className="field"
                />
              </Field>
            </div>
          </FormSection>

          <FormSection title="Übergabe-Details">
            <Field label="Lieferkosten (€)">
              <input value={data.delivery_cost} onChange={set("delivery_cost")} className="field font-mono tnum" />
            </Field>
            <Field label="Abholkosten (€)">
              <input value={data.pickup_cost} onChange={set("pickup_cost")} className="field font-mono tnum" />
            </Field>
            <Field label="Anzahl Schlüssel">
              <input value={data.keys_count} onChange={set("keys_count")} className="field font-mono tnum" />
            </Field>
            <Field label="Schäden bei Übergabe">
              <input
                value={data.damages_at_handover}
                onChange={set("damages_at_handover")}
                placeholder="Keine / Neuwagen"
                className="field"
              />
            </Field>
          </FormSection>

          <FormSection title="Zweiter Fahrer (optional)">
            <Field label="Name Fahrer 2">
              <input value={data.driver2_name} onChange={set("driver2_name")} className="field" />
            </Field>
            <Field label="Führerschein-Nr. Fahrer 2">
              <input value={data.driver2_license} onChange={set("driver2_license")} className="field font-mono tnum" />
            </Field>
          </FormSection>

          {error && (
            <div className="text-[13px] text-red-700 bg-red-50 border border-red-200 rounded-panel px-3 py-2">
              {error}
            </div>
          )}

          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => setMode("choose")}
              className="text-[13px] text-ink-muted hover:text-ink transition-colors"
            >
              Eingabe abbrechen
            </button>
            <Button type="submit" disabled={saving} variant="signal" size="sm">
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
              Vertrag speichern
            </Button>
          </div>
        </form>
      )}

      {createdId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <button
            type="button"
            onClick={goToDetail}
            className="absolute inset-0 bg-ink/40 backdrop-blur-sm"
            aria-label="Schließen"
          />
          <div className="relative w-full max-w-md bg-paper rounded-card border border-hairline shadow-panel overflow-hidden">
            <div className="px-6 pt-6 pb-2 flex items-start justify-between gap-3">
              <div>
                <div className="w-10 h-10 rounded-panel border border-hairline bg-[#E6F4EA] flex items-center justify-center mb-3">
                  <Check size={18} className="text-[#15803D]" />
                </div>
                <h2 className="font-display font-bold text-[20px] tracking-tight text-ink">
                  Vertrag erstellt
                </h2>
                <p className="text-[13px] text-ink-muted mt-1 leading-snug">
                  Möchtest du den Vertrag jetzt direkt vom Kunden unterschreiben lassen? Funktioniert auf Tablet oder Handy.
                </p>
              </div>
              <button
                type="button"
                onClick={goToDetail}
                className="w-8 h-8 rounded-btn inline-flex items-center justify-center text-ink-muted hover:bg-canvas -mt-1 -mr-1"
              >
                <X size={15} />
              </button>
            </div>
            <div className="px-6 pb-6 pt-4 flex items-center justify-end gap-2 flex-wrap">
              <button
                type="button"
                onClick={goToDetail}
                className="text-[13px] text-ink-muted hover:text-ink px-3 py-2"
              >
                Später
              </button>
              <Button type="button" onClick={goToSign} variant="ink" size="sm">
                <FileSignature size={14} /> Jetzt unterschreiben
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

/* ── Form sub-components ── */

const FormSection = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div>
    <div className="data-label text-ink-muted mb-3">{title}</div>
    <div className="grid sm:grid-cols-2 gap-4">{children}</div>
  </div>
);

const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <label className="block">
    <div className="data-label text-ink-muted mb-1">{label}</div>
    {children}
  </label>
);

/* ── Price recommendation widget ── */

type CalcResponse =
  | {
      ok: true;
      mode: "day";
      recommendation: { final_price: number; total_percent: number; explanation: string };
    }
  | {
      ok: true;
      mode: "period";
      period: { average_daily_price: number; total_price: number; days: number; explanation: string };
    }
  | { ok?: false; error?: string };

const PriceRecommendation = ({
  plate,
  pickupDate,
  returnDate,
  onApply,
}: {
  plate: string;
  pickupDate: string;
  returnDate: string;
  onApply: (price: number) => void;
}) => {
  const [data, setData] = useState<CalcResponse | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!plate.trim() || !pickupDate || !returnDate) {
      setData(null);
      return;
    }
    let cancelled = false;
    const handle = setTimeout(async () => {
      setLoading(true);
      try {
        const url = `/api/pricing/calculate?plate=${encodeURIComponent(plate)}&pickup_date=${pickupDate}&return_date=${returnDate}`;
        const res = await fetch(url);
        const j = (await res.json().catch(() => ({}))) as CalcResponse;
        if (!cancelled) setData(j);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 350);
    return () => {
      cancelled = true;
      clearTimeout(handle);
    };
  }, [plate, pickupDate, returnDate]);

  if (!plate.trim() || !pickupDate || !returnDate) return null;
  if (loading && !data) {
    return (
      <div className="rounded-panel border border-hairline bg-canvas px-4 py-3 text-[12.5px] text-ink-muted flex items-center gap-2">
        <Loader2 size={13} className="animate-spin" />
        Berechne Preisempfehlung…
      </div>
    );
  }
  if (!data) return null;
  if (!data.ok) {
    return (
      <div className="rounded-panel border border-[#F59E0B]/40 bg-[#FFFBEB] px-4 py-3 text-[12.5px] text-[#92400E]">
        Keine Empfehlung verfügbar{"error" in data && data.error ? `: ${data.error}` : "."}
      </div>
    );
  }

  const price =
    data.mode === "day" ? data.recommendation.final_price : data.period.average_daily_price;
  const explanation =
    data.mode === "day" ? data.recommendation.explanation : data.period.explanation;
  const totalPct = data.mode === "day" ? data.recommendation.total_percent : null;
  const periodTotal = data.mode === "period" ? data.period.total_price : null;
  const days = data.mode === "period" ? data.period.days : 1;

  const bgColor =
    totalPct == null || totalPct === 0 ? "#F0FDF4"
    : totalPct > 15 ? "#FEF2F2"
    : "#FEFCE8";
  const borderColor =
    totalPct == null || totalPct === 0 ? "#BBF7D0"
    : totalPct > 15 ? "#FECACA"
    : "#FDE68A";

  return (
    <div
      className="rounded-panel px-4 py-3"
      style={{ background: bgColor, boxShadow: `inset 0 0 0 1px ${borderColor}` }}
    >
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2.5 min-w-0">
          <TrendingUp size={14} className="text-ink shrink-0" />
          <div className="min-w-0">
            <div className="data-label text-ink-muted">KI-Empfehlung</div>
            <div className="font-display font-bold text-[18px] tracking-tight text-ink leading-tight">
              {price.toLocaleString("de-DE", { style: "currency", currency: "EUR", minimumFractionDigits: 2 })}
              <span className="font-mono text-[12px] text-ink-muted ml-1">/ Tag</span>
            </div>
            {periodTotal != null && (
              <div className="font-mono tnum text-[11.5px] text-ink-muted mt-0.5">
                ≈ {periodTotal.toFixed(2).replace(".", ",")} € gesamt ({days} Tage)
              </div>
            )}
          </div>
        </div>
        <button
          type="button"
          onClick={() => onApply(price)}
          className="inline-flex items-center gap-1 text-[12.5px] px-3 h-8 rounded-btn bg-ink text-white font-medium hover:bg-ink-soft transition-colors"
        >
          <Check size={12} /> Übernehmen
        </button>
      </div>
      <div className="mt-2 text-[11.5px] text-ink-soft leading-snug">{explanation}</div>
    </div>
  );
};

/* ── Partner picker ── */

const PartnerPicker = ({
  partners,
  plate,
  partnerId,
  purchasePerDay,
  sellingPerDay,
  pickupDate,
  returnDate,
  onPartnerChange,
  onPurchaseChange,
  onSellingChange,
}: {
  partners: SalesPartner[];
  plate: string;
  partnerId: string;
  purchasePerDay: string;
  sellingPerDay: string;
  pickupDate: string;
  returnDate: string;
  onPartnerChange: (
    id: string,
    pricing: { purchase_price: number; selling_price: number } | null
  ) => void;
  onPurchaseChange: (v: string) => void;
  onSellingChange: (v: string) => void;
}) => {
  const partner = useMemo(
    () => partners.find((p) => p.id === partnerId) ?? null,
    [partners, partnerId]
  );
  const [loadingPricing, setLoadingPricing] = useState(false);
  const [pricingHint, setPricingHint] = useState<string | null>(null);

  useEffect(() => {
    if (!partnerId || !plate.trim()) return;
    setLoadingPricing(true);
    setPricingHint(null);
    let cancelled = false;
    (async () => {
      try {
        const url = `/api/vehicles/partner-pricing-lookup?plate=${encodeURIComponent(plate)}&partner_id=${partnerId}`;
        const res = await fetch(url);
        const j = (await res.json().catch(() => ({}))) as {
          ok?: boolean;
          vehicle_known?: boolean;
          pricing?: { purchase_price: number; selling_price: number } | null;
        };
        if (cancelled) return;
        if (!j.vehicle_known) {
          setPricingHint("Fahrzeug noch nicht im System — Preise manuell eintragen.");
          return;
        }
        if (j.pricing) {
          onPartnerChange(partnerId, j.pricing);
          setPricingHint("Preise aus Fahrzeug-Stammdaten übernommen.");
        } else {
          setPricingHint("Kein Partner-Preis für dieses Fahrzeug hinterlegt — bitte manuell eintragen.");
        }
      } finally {
        if (!cancelled) setLoadingPricing(false);
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [partnerId, plate]);

  const days = useMemo(() => {
    if (!pickupDate || !returnDate) return 0;
    const ms = new Date(returnDate).getTime() - new Date(pickupDate).getTime();
    return Math.max(1, Math.ceil(ms / 86_400_000));
  }, [pickupDate, returnDate]);

  const commission = useMemo(() => {
    if (!partner) return null;
    const purchase = Number(purchasePerDay.replace(",", "."));
    const selling = Number(sellingPerDay.replace(",", "."));
    if (!Number.isFinite(purchase) || !Number.isFinite(selling)) return null;
    return calculateCommission({
      partner,
      purchase_price_per_day: purchase,
      selling_price_per_day: selling,
      days,
    });
  }, [partner, purchasePerDay, sellingPerDay, days]);

  return (
    <div>
      <Field label="Partner">
        <select
          value={partnerId}
          onChange={(e) => {
            const id = e.target.value;
            if (!id) {
              onPartnerChange("", null);
              setPricingHint(null);
              return;
            }
            onPartnerChange(id, null);
          }}
          className="field"
        >
          <option value="">— ohne Partner —</option>
          {partners.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name} ({PARTNER_TYPE_META[p.type].short})
            </option>
          ))}
        </select>
      </Field>

      {partner && (
        <div className="mt-3 grid grid-cols-2 gap-3">
          <Field label="Einstandspreis / Tag (€)">
            <input
              value={purchasePerDay}
              onChange={(e) => onPurchaseChange(e.target.value)}
              inputMode="decimal"
              placeholder="z. B. 45,00"
              className="field font-mono tnum"
            />
          </Field>
          <Field label="VK-Preis / Tag (€)">
            <input
              value={sellingPerDay}
              onChange={(e) => onSellingChange(e.target.value)}
              inputMode="decimal"
              placeholder="z. B. 65,00"
              className="field font-mono tnum"
            />
          </Field>
        </div>
      )}

      {(loadingPricing || pricingHint) && partner && (
        <div className="mt-2 font-mono text-[11.5px] text-ink-muted inline-flex items-center gap-1.5">
          {loadingPricing && <Loader2 size={11} className="animate-spin" />}
          {loadingPricing ? "Lade Partner-Preise…" : pricingHint}
        </div>
      )}

      {commission && days > 0 && (
        <div className="mt-3 rounded-panel bg-ink text-white px-4 py-3">
          <div className="flex items-center gap-2 data-label text-white/50 mb-1.5">
            <Handshake size={12} />
            Provisionsberechnung · {days} {days === 1 ? "Tag" : "Tage"}
          </div>
          <div className="grid grid-cols-3 gap-3 text-[12.5px]">
            <div>
              <div className="text-white/50">Einstand</div>
              <div className="font-mono tnum text-white">{fmtEur(commission.total_purchase)}</div>
            </div>
            <div>
              <div className="text-white/50">VK</div>
              <div className="font-mono tnum text-white">{fmtEur(commission.total_selling)}</div>
            </div>
            <div>
              <div className="text-white/50">Provision</div>
              <div className="font-display font-bold text-[18px] tracking-tight text-signal tnum leading-none mt-0.5">
                {fmtEur(commission.commission_eur)}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

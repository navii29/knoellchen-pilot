"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Check, FileSignature, FileText, Handshake, Loader2, Save, ScanText, Sparkles, TrendingUp, UserCheck, X } from "lucide-react";
import Link from "next/link";
import { THEME } from "@/lib/theme";
import type { Customer, ParsedContractData } from "@/lib/types";
import {
  PARTNER_TYPE_META,
  calculateCommission,
  contractDays,
  type SalesPartner,
} from "@/lib/partners";
import { fmtEur } from "@/lib/utils";

type Mode = "choose" | "ai" | "manual";
type FormState = {
  contract_nr: string;
  plate: string;
  vehicle_type: string;
  customer_id: string;
  renter_name: string;
  renter_email: string;
  renter_phone: string;
  renter_address: string;
  renter_birthday: string;
  renter_license_nr: string;
  renter_license_class: string;
  renter_license_expiry: string;
  pickup_date: string;
  pickup_time: string;
  return_date: string;
  return_time: string;
  daily_rate: string;
  total_amount: string;
  deposit: string;
  km_pickup: string;
  km_limit: string;
  contract_pdf_path: string;
  notes: string;
  partner_id: string;
  partner_purchase_price: string;
  partner_selling_price: string;
};

const empty: FormState = {
  contract_nr: "",
  plate: "",
  vehicle_type: "",
  customer_id: "",
  renter_name: "",
  renter_email: "",
  renter_phone: "",
  renter_address: "",
  renter_birthday: "",
  renter_license_nr: "",
  renter_license_class: "",
  renter_license_expiry: "",
  pickup_date: "",
  pickup_time: "",
  return_date: "",
  return_time: "",
  daily_rate: "",
  total_amount: "",
  deposit: "",
  km_pickup: "",
  km_limit: "",
  contract_pdf_path: "",
  notes: "",
  partner_id: "",
  partner_purchase_price: "",
  partner_selling_price: "",
};

const customerLabel = (c: Customer) => {
  const name = [c.title, c.first_name, c.last_name].filter(Boolean).join(" ") || c.last_name;
  const ort = c.city ? ` · ${c.city}` : "";
  return `${name}${ort}`;
};

const fillFromCustomer = (prev: FormState, c: Customer): FormState => {
  const fullName =
    [c.title, c.first_name, c.last_name].filter(Boolean).join(" ") || c.last_name;
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
  } as FormState;
};

export const NewContractClient = ({
  customers,
  partners,
  initialCustomerId,
}: {
  customers: Customer[];
  partners: SalesPartner[];
  initialCustomerId: string | null;
}) => {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const initialCustomer = useMemo(
    () => (initialCustomerId ? customers.find((c) => c.id === initialCustomerId) ?? null : null),
    [customers, initialCustomerId]
  );
  const [mode, setMode] = useState<Mode>(initialCustomer ? "manual" : "choose");
  const [data, setData] = useState<FormState>(() =>
    initialCustomer ? fillFromCustomer(empty, initialCustomer) : empty
  );
  const [parsing, setParsing] = useState(false);
  const [parsedFromAI, setParsedFromAI] = useState(false);
  const [aiConfidence, setAiConfidence] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [createdId, setCreatedId] = useState<string | null>(null);

  const set = (k: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setData((d) => ({ ...d, [k]: e.target.value }));

  const pickCustomer = (id: string) => {
    if (!id) {
      setData((prev) => ({
        ...prev,
        customer_id: "",
      }));
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
      customer_id: "",
      renter_name: d.renter_name || "",
      renter_email: d.renter_email || "",
      renter_phone: d.renter_phone || "",
      renter_address: d.renter_address || "",
      renter_birthday: d.renter_birthday || "",
      renter_license_nr: d.renter_license_nr || "",
      renter_license_class: "",
      renter_license_expiry: "",
      pickup_date: d.pickup_date || "",
      pickup_time: d.pickup_time || "",
      return_date: d.return_date || "",
      return_time: d.return_time || "",
      daily_rate: d.daily_rate ? String(d.daily_rate) : "",
      total_amount: d.total_amount ? String(d.total_amount) : "",
      deposit: d.deposit ? String(d.deposit) : "",
      km_pickup: "",
      km_limit: "",
      contract_pdf_path: j.pdf_path || "",
      notes: "",
      partner_id: "",
      partner_purchase_price: "",
      partner_selling_price: "",
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
    // Provision live berechnen, falls Partner zugeordnet
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
      daily_rate: numeric(data.daily_rate),
      total_amount: numeric(data.total_amount),
      deposit: numeric(data.deposit),
      km_pickup: numeric(data.km_pickup),
      km_limit: numeric(data.km_limit),
      partner_id: data.partner_id || null,
      partner_purchase_price: purchasePerDay,
      partner_selling_price: sellingPerDay,
      partner_commission: partnerCommission,
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

          {customers.length > 0 && (
            <div className="rounded-lg bg-stone-50 ring-1 ring-stone-200 p-4">
              <label className="block">
                <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-stone-500 font-semibold mb-2">
                  <UserCheck size={12} /> Bestehender Kunde
                </div>
                <select
                  value={data.customer_id}
                  onChange={(e) => pickCustomer(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg bg-white outline-none ring-1 ring-stone-200 focus:ring-stone-400"
                >
                  <option value="">— Neuer Mieter (Daten unten eintragen) —</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {customerLabel(c)}
                    </option>
                  ))}
                </select>
                {data.customer_id && (
                  <div className="mt-2 text-xs text-stone-500">
                    Mieterdaten unten wurden automatisch übernommen — du kannst sie für diesen Vertrag noch anpassen.{" "}
                    <Link
                      href={`/dashboard/customers/${data.customer_id}`}
                      className="text-teal-700 hover:underline"
                    >
                      Kundendaten dauerhaft ändern →
                    </Link>
                  </div>
                )}
                {!data.customer_id && (
                  <div className="mt-2 text-xs text-stone-500">
                    Noch nicht angelegt?{" "}
                    <Link href="/dashboard/customers/new" className="text-teal-700 hover:underline">
                      Kunden zuerst anlegen →
                    </Link>
                  </div>
                )}
              </label>
            </div>
          )}

          <Section title="Vertrag">
            <Field label="Vertrags-Nr">
              <input
                value={data.contract_nr}
                onChange={set("contract_nr")}
                placeholder="MV-2026-0042 (leer = automatisch)"
                className="input tabular-nums"
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
              <input value={data.renter_birthday} onChange={set("renter_birthday")} placeholder="YYYY-MM-DD" className="input tabular-nums" />
            </Field>
            <Field label="Adresse">
              <input value={data.renter_address} onChange={set("renter_address")} className="input" />
            </Field>
            <Field label="Führerschein-Nr.">
              <input value={data.renter_license_nr} onChange={set("renter_license_nr")} className="input tabular-nums" />
            </Field>
            <Field label="E-Mail">
              <input type="email" value={data.renter_email} onChange={set("renter_email")} className="input" />
            </Field>
            <Field label="Telefon">
              <input value={data.renter_phone} onChange={set("renter_phone")} className="input tabular-nums" />
            </Field>
          </Section>

          <Section title="Zeitraum">
            <Field label="Mietbeginn *">
              <input type="date" required value={data.pickup_date} onChange={set("pickup_date")} className="input" />
            </Field>
            <Field label="Uhrzeit Abholung">
              <input type="time" value={data.pickup_time} onChange={set("pickup_time")} className="input tabular-nums" />
            </Field>
            <Field label="Mietende *">
              <input type="date" required value={data.return_date} onChange={set("return_date")} className="input" />
            </Field>
            <Field label="Uhrzeit Rückgabe">
              <input type="time" value={data.return_time} onChange={set("return_time")} className="input tabular-nums" />
            </Field>
          </Section>

          <Section title="Vertriebspartner (optional)">
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
          </Section>

          <Section title="Kosten & Kilometer">
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
              <input value={data.daily_rate} onChange={set("daily_rate")} className="input tabular-nums" />
            </Field>
            <Field label="Gesamtbetrag (€)">
              <input value={data.total_amount} onChange={set("total_amount")} className="input tabular-nums" />
            </Field>
            <Field label="Kaution (€)">
              <input value={data.deposit} onChange={set("deposit")} className="input tabular-nums" />
            </Field>
            <Field label="km bei Abholung">
              <input value={data.km_pickup} onChange={set("km_pickup")} className="input tabular-nums" />
            </Field>
            <Field label="Freikilometer">
              <input
                value={data.km_limit}
                onChange={set("km_limit")}
                placeholder="z.B. 1500 (leer = unbegrenzt)"
                className="input tabular-nums"
              />
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

      {createdId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <button
            type="button"
            onClick={goToDetail}
            className="absolute inset-0 bg-stone-900/40 backdrop-blur-sm"
            aria-label="Schließen"
          />
          <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl ring-1 ring-stone-200 overflow-hidden">
            <div className="px-6 pt-6 pb-2 flex items-start justify-between gap-3">
              <div>
                <div className="w-10 h-10 rounded-full bg-emerald-50 ring-1 ring-emerald-200 flex items-center justify-center mb-3">
                  <Check size={18} className="text-emerald-700" />
                </div>
                <h2 className="font-display text-[22px] tracking-tight font-medium">
                  Vertrag erstellt
                </h2>
                <p className="text-sm text-stone-500 mt-1 leading-snug">
                  Möchtest du den Vertrag jetzt direkt vom Kunden unterschreiben lassen? Funktioniert auf Tablet oder Handy.
                </p>
              </div>
              <button
                type="button"
                onClick={goToDetail}
                className="w-8 h-8 rounded-full inline-flex items-center justify-center text-stone-500 hover:bg-stone-100 -mt-1 -mr-1"
              >
                <X size={15} />
              </button>
            </div>
            <div className="px-6 pb-6 pt-4 flex items-center justify-end gap-2 flex-wrap">
              <button
                type="button"
                onClick={goToDetail}
                className="text-sm text-stone-600 hover:text-stone-900 px-3 py-2"
              >
                Später
              </button>
              <button
                type="button"
                onClick={goToSign}
                className="inline-flex items-center gap-1.5 h-10 px-5 rounded-full bg-stone-900 text-white text-sm font-medium hover:bg-stone-800"
              >
                <FileSignature size={14} /> Jetzt unterschreiben
              </button>
            </div>
          </div>
        </div>
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
        const url = `/api/pricing/calculate?plate=${encodeURIComponent(
          plate
        )}&pickup_date=${pickupDate}&return_date=${returnDate}`;
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
      <div className="rounded-lg ring-1 ring-stone-200 bg-stone-50 px-4 py-3 text-[12.5px] text-stone-500 flex items-center gap-2">
        <Loader2 size={13} className="animate-spin" />
        Berechne Preisempfehlung…
      </div>
    );
  }
  if (!data) return null;
  if (!data.ok) {
    return (
      <div className="rounded-lg ring-1 ring-amber-200 bg-amber-50 px-4 py-3 text-[12.5px] text-amber-800">
        Keine Empfehlung verfügbar
        {"error" in data && data.error ? `: ${data.error}` : "."}
      </div>
    );
  }

  const price =
    data.mode === "day" ? data.recommendation.final_price : data.period.average_daily_price;
  const explanation =
    data.mode === "day" ? data.recommendation.explanation : data.period.explanation;
  const totalPct =
    data.mode === "day" ? data.recommendation.total_percent : null;
  const periodTotal = data.mode === "period" ? data.period.total_price : null;
  const days = data.mode === "period" ? data.period.days : 1;

  return (
    <div
      className="rounded-lg ring-1 px-4 py-3"
      style={{
        background:
          totalPct == null || totalPct === 0
            ? "#f0fdf4"
            : totalPct > 15
            ? "#fef2f2"
            : "#fefce8",
        boxShadow: `inset 0 0 0 1px ${
          totalPct == null || totalPct === 0
            ? "#bbf7d0"
            : totalPct > 15
            ? "#fecaca"
            : "#fde68a"
        }`,
      }}
    >
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2.5 min-w-0">
          <TrendingUp size={14} className="text-stone-700 shrink-0" />
          <div className="min-w-0">
            <div className="text-[12px] uppercase tracking-[0.06em] font-semibold text-stone-700">
              KI-Empfehlung
            </div>
            <div className="font-display text-[20px] tracking-tight font-medium text-stone-900 leading-tight">
              {price.toLocaleString("de-DE", {
                style: "currency",
                currency: "EUR",
                minimumFractionDigits: 2,
              })}
              <span className="text-[12px] text-stone-500 ml-1">/ Tag</span>
            </div>
            {periodTotal != null && (
              <div className="text-[11.5px] text-stone-500 tabular-nums mt-0.5">
                ≈ {periodTotal.toFixed(2).replace(".", ",")} € gesamt ({days} Tage)
              </div>
            )}
          </div>
        </div>
        <button
          type="button"
          onClick={() => onApply(price)}
          className="inline-flex items-center gap-1 text-[12.5px] px-3 py-1.5 rounded-md bg-stone-900 text-white font-medium hover:bg-stone-800"
        >
          <Check size={12} /> Übernehmen
        </button>
      </div>
      <div className="mt-2 text-[11.5px] text-stone-600 leading-snug">
        {explanation}
      </div>
    </div>
  );
};

// =====================================================
// PartnerPicker — Auswahl + Auto-Pricing
// =====================================================
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

  // Pricing automatisch laden, wenn Partner + Kennzeichen wechseln
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
          setPricingHint(
            "Kein Partner-Preis für dieses Fahrzeug hinterlegt — bitte manuell eintragen."
          );
        }
      } finally {
        if (!cancelled) setLoadingPricing(false);
      }
    })();
    return () => {
      cancelled = true;
    };
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
            // Selecting a partner triggers the effect above — no immediate pricing
            onPartnerChange(id, null);
          }}
          className="input"
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
              className="input tabular-nums"
            />
          </Field>
          <Field label="VK-Preis / Tag (€)">
            <input
              value={sellingPerDay}
              onChange={(e) => onSellingChange(e.target.value)}
              inputMode="decimal"
              placeholder="z. B. 65,00"
              className="input tabular-nums"
            />
          </Field>
        </div>
      )}

      {(loadingPricing || pricingHint) && partner && (
        <div className="mt-2 text-[11.5px] text-stone-500 inline-flex items-center gap-1.5">
          {loadingPricing && <Loader2 size={11} className="animate-spin" />}
          {loadingPricing ? "Lade Partner-Preise…" : pricingHint}
        </div>
      )}

      {commission && days > 0 && (
        <div className="mt-3 rounded-lg bg-stone-900 text-white px-4 py-3">
          <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.06em] font-semibold text-teal-300 mb-1.5">
            <Handshake size={12} />
            Provisionsberechnung · {days} {days === 1 ? "Tag" : "Tage"}
          </div>
          <div className="grid grid-cols-3 gap-3 text-[12.5px]">
            <div>
              <div className="text-white/50">Einstand</div>
              <div className="font-mono tabular-nums text-white">
                {fmtEur(commission.total_purchase)}
              </div>
            </div>
            <div>
              <div className="text-white/50">VK</div>
              <div className="font-mono tabular-nums text-white">
                {fmtEur(commission.total_selling)}
              </div>
            </div>
            <div>
              <div className="text-white/50">Provision</div>
              <div className="font-display text-[18px] tracking-tight font-medium text-emerald-300 tabular-nums leading-none mt-0.5">
                {fmtEur(commission.commission_eur)}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  ExternalLink,
  FileText,
  Loader2,
  Save,
  Sparkles,
  X,
} from "lucide-react";
import { fmtDate } from "@/lib/utils";
import { Panel, PanelHeader } from "@/components/ui/Panel";
import { Button } from "@/components/ui/Button";
import { Plate } from "@/components/ui/Plate";
import { FileDrop } from "@/components/ui/FileDrop";
import {
  BODY_TYPES,
  CATEGORIES,
  DOORS,
  FUEL_TYPES,
  MANUFACTURERS,
  TRANSMISSIONS,
  VEHICLE_STATUS_META,
  VEHICLE_STATUSES,
  buildVehicleType,
} from "@/lib/vehicle";
import type { Vehicle, VehicleStatus } from "@/lib/types";

type Mode = "create" | "edit";

export type VehicleFormState = {
  // Stammdaten
  manufacturer: string;
  model: string;
  plate: string;
  fin_number: string;
  power_ps: string;
  fuel_type: string;
  transmission: string;
  doors: string;
  seats: string;
  luggage: string;
  body_type: string;
  color: string;
  category: string;

  // Fahrzeugschein (technisch)
  hsn: string;
  tsn: string;
  displacement_ccm: string;
  co2_combined: string;
  emission_class: string;
  weight_empty: string;
  weight_max: string;
  zb2_number: string;
  next_hu: string;

  // Verfügbarkeit
  available_from: string;
  km_at_intake: string;
  first_registration: string;
  max_km_total: string;
  inclusive_km_month: string;
  extra_km_price: string;

  // Preise
  daily_rate: string;
  weekly_rate: string;
  monthly_rate: string;
  deposit: string;

  // Margenrechnung
  cost_monthly: string;
  target_daily_rate: string;

  // Logistik & Intern
  pickup_location: string;
  return_location: string;
  internal_return_at: string;
  internal_return_note: string;

  // Sonstiges
  accessories: string;
  status: VehicleStatus;
  decommission_date: string;

  // GPS-Tracking
  echoes_device_id: string;
};

const empty: VehicleFormState = {
  manufacturer: "",
  model: "",
  plate: "",
  fin_number: "",
  power_ps: "",
  fuel_type: "",
  transmission: "",
  doors: "",
  seats: "",
  luggage: "",
  body_type: "",
  color: "",
  category: "",
  hsn: "",
  tsn: "",
  displacement_ccm: "",
  co2_combined: "",
  emission_class: "",
  weight_empty: "",
  weight_max: "",
  zb2_number: "",
  next_hu: "",
  available_from: new Date().toISOString().slice(0, 10),
  km_at_intake: "",
  first_registration: "",
  max_km_total: "",
  inclusive_km_month: "",
  extra_km_price: "0.29",
  daily_rate: "",
  weekly_rate: "",
  monthly_rate: "",
  deposit: "",
  cost_monthly: "",
  target_daily_rate: "",
  pickup_location: "",
  return_location: "",
  internal_return_at: "",
  internal_return_note: "",
  accessories: "",
  status: "aktiv",
  decommission_date: "",
  echoes_device_id: "",
};

/** TIMESTAMPTZ-ISO -> Wert für <input type="datetime-local"> (lokale Zeit). */
const toDatetimeLocal = (iso: string | null | undefined): string => {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours()
  )}:${pad(d.getMinutes())}`;
};

const fromVehicle = (v: Vehicle): VehicleFormState => ({
  manufacturer: v.manufacturer || "",
  model: v.model || "",
  plate: v.plate || "",
  fin_number: v.fin_number || "",
  power_ps: v.power_ps != null ? String(v.power_ps) : "",
  fuel_type: v.fuel_type || "",
  transmission: v.transmission || "",
  doors: v.doors || "",
  seats: v.seats != null ? String(v.seats) : "",
  luggage: v.luggage != null ? String(v.luggage) : "",
  body_type: v.body_type || "",
  color: v.color || "",
  category: v.category || "",
  hsn: v.hsn || "",
  tsn: v.tsn || "",
  displacement_ccm: v.displacement_ccm != null ? String(v.displacement_ccm) : "",
  co2_combined: v.co2_combined != null ? String(v.co2_combined) : "",
  emission_class: v.emission_class || "",
  weight_empty: v.weight_empty != null ? String(v.weight_empty) : "",
  weight_max: v.weight_max != null ? String(v.weight_max) : "",
  zb2_number: v.zb2_number || "",
  next_hu: v.next_hu || "",
  available_from: v.available_from || "",
  km_at_intake: v.km_at_intake != null ? String(v.km_at_intake) : "",
  first_registration: v.first_registration || "",
  max_km_total: v.max_km_total != null ? String(v.max_km_total) : "",
  inclusive_km_month: v.inclusive_km_month != null ? String(v.inclusive_km_month) : "",
  extra_km_price: v.extra_km_price != null ? String(v.extra_km_price) : "",
  daily_rate: v.daily_rate != null ? String(v.daily_rate) : "",
  weekly_rate: v.weekly_rate != null ? String(v.weekly_rate) : "",
  monthly_rate: v.monthly_rate != null ? String(v.monthly_rate) : "",
  deposit: v.deposit != null ? String(v.deposit) : "",
  cost_monthly: v.cost_monthly != null ? String(v.cost_monthly) : "",
  target_daily_rate:
    v.target_daily_rate != null ? String(v.target_daily_rate) : "",
  pickup_location: v.pickup_location || "",
  return_location: v.return_location || "",
  internal_return_at: toDatetimeLocal(v.internal_return_at),
  internal_return_note: v.internal_return_note || "",
  accessories: v.accessories || "",
  status: v.status || "aktiv",
  decommission_date: v.decommission_date || "",
  echoes_device_id: v.echoes_device_id || "",
});

const addDays = (iso: string, days: number): string => {
  if (!iso) return "";
  const d = new Date(iso);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
};

/**
 * Optionsliste, die einen (z. B. per KI gefüllten oder Alt-)Wert sichtbar hält,
 * auch wenn er nicht in der vordefinierten Liste steht — sonst zeigt ein
 * controlled <select> fälschlich „leer", behält den Wert aber im State.
 */
const withValue = (list: ReadonlyArray<string>, value: string): string[] =>
  value && !list.includes(value) ? [value, ...list] : [...list];

export const VehicleForm = ({
  mode,
  initial,
  onCancel,
  onDone,
}: {
  mode: Mode;
  initial?: Vehicle;
  onCancel?: () => void;
  onDone?: () => void;
}) => {
  const router = useRouter();
  const [data, setData] = useState<VehicleFormState>(
    initial ? fromVehicle(initial) : empty
  );
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ── Fahrzeugschein-Auslesen (Zulassungsbescheinigung Teil I) ──
  const [regFile, setRegFile] = useState<File | null>(null);
  const [parsing, setParsing] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);
  const [parseConfidence, setParseConfidence] = useState<number | null>(null);
  const regDataRef = useRef<Record<string, unknown> | null>(null);
  // Gegenprüfung: Kennzeichen aus dem Schein existiert bereits als Fahrzeug.
  const [existing, setExisting] = useState<{
    id: string;
    label: string;
    plate: string;
    current: Record<string, string | number | null>;
  } | null>(null);

  const clearReg = () => {
    setRegFile(null);
    setParseConfidence(null);
    setParseError(null);
    setExisting(null);
    regDataRef.current = null;
  };

  const runRegistrationParse = async (file: File) => {
    setRegFile(file);
    setParsing(true);
    setParseError(null);
    setParseConfidence(null);
    setExisting(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/vehicles/parse-registration", {
        method: "POST",
        body: fd,
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) {
        setParseError(j.error || "Auslesen fehlgeschlagen");
        return;
      }
      const fields = (j.fields ?? {}) as Record<string, string>;
      regDataRef.current = (j.registration_data ?? null) as Record<string, unknown> | null;
      setParseConfidence(typeof j.confidence === "number" ? j.confidence : null);
      // Gegenprüfung-Treffer nur im Anlegen-Modus relevant (im Edit ist man schon
      // beim Fahrzeug; ein Selbsttreffer würde nur verwirren).
      if (mode === "create" && j.existing?.id) {
        setExisting(j.existing as NonNullable<typeof existing>);
      }
      setData((d) => {
        const next: VehicleFormState = { ...d };
        for (const [k, v] of Object.entries(fields)) {
          // nur nicht-leere Werte einsetzen, und nur bekannte Formularfelder
          if (v && k in next) (next as unknown as Record<string, string>)[k] = v;
        }
        return next;
      });
    } catch (e) {
      setParseError(e instanceof Error ? e.message : "Auslesen fehlgeschlagen");
    } finally {
      setParsing(false);
    }
  };

  // Schein-Datei am Fahrzeug hinterlegen (best-effort — der Datensatz ist
  // bereits via registration_data gespeichert; die Datei kann notfalls später
  // auf der Detailseite erneut hochgeladen werden).
  const uploadRegDoc = async (vehicleId: string) => {
    if (!regFile) return;
    try {
      const fd = new FormData();
      fd.append("file", regFile);
      await fetch(`/api/vehicles/${vehicleId}/registration-doc`, {
        method: "POST",
        body: fd,
      });
    } catch {
      /* still */
    }
  };

  // Gegenprüfung-Aktion: nur die im vorhandenen Fahrzeug LEEREN Felder aus den
  // ausgelesenen Schein-Daten ergänzen (nichts überschreiben) + Schein hinterlegen.
  const mergeIntoExisting = async () => {
    if (!existing) return;
    setSaving(true);
    setError(null);
    const patch: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(data)) {
      if (!(k in existing.current)) continue; // nur die Schein-Spalten
      const cur = existing.current[k];
      const curEmpty = cur === null || cur === undefined || cur === "";
      if (curEmpty && typeof v === "string" && v.trim() !== "") patch[k] = v;
    }
    if (regDataRef.current) patch.registration_data = regDataRef.current;
    const res = await fetch(`/api/vehicles/${existing.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    if (!res.ok) {
      setSaving(false);
      const j = await res.json().catch(() => ({}));
      setError(j.error || "Ergänzen fehlgeschlagen");
      return;
    }
    await uploadRegDoc(existing.id); // Schein am vorhandenen Fahrzeug hinterlegen
    setSaving(false);
    router.push(`/dashboard/vehicles/${existing.id}`);
    router.refresh();
  };

  const set = (k: keyof VehicleFormState) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
      const v = e.target.value;
      setData((d) => ({ ...d, [k]: v }));
    };

  const previewType = useMemo(
    () => buildVehicleType(data.manufacturer, data.model),
    [data.manufacturer, data.model]
  );

  const decommissionPreview = data.first_registration
    ? addDays(data.first_registration, 180)
    : "";

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!data.plate.trim()) {
      setError("Kennzeichen ist Pflichtfeld");
      return;
    }
    setSaving(true);
    setSaved(false);

    const payload = {
      ...data,
      // datetime-local liefert lokale Zeit ohne Zone -> als ISO (UTC) speichern
      internal_return_at: data.internal_return_at
        ? new Date(data.internal_return_at).toISOString()
        : "",
      // Vollständigen Fahrzeugschein-Datensatz mitspeichern, wenn ausgelesen.
      ...(regDataRef.current ? { registration_data: regDataRef.current } : {}),
    };
    const url = mode === "create" ? "/api/vehicles" : `/api/vehicles/${initial!.id}`;
    const method = mode === "create" ? "POST" : "PATCH";
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      setSaving(false);
      const j = await res.json().catch(() => ({}));
      setError(j.error || "Speichern fehlgeschlagen");
      return;
    }
    if (mode === "create") {
      const j = (await res.json()) as { vehicle: { id: string } };
      await uploadRegDoc(j.vehicle.id); // Fahrzeugschein hinterlegen
      setSaving(false);
      setSaved(true);
      router.push(`/dashboard/vehicles/${j.vehicle.id}`);
      router.refresh();
    } else {
      await uploadRegDoc(initial!.id); // ggf. neu hochgeladenen Schein hinterlegen
      setSaving(false);
      setSaved(true);
      // Inline-Edit: das Panel übernimmt refresh + Zurückschalten in einer
      // Transition, damit die Ansicht erst mit frischen Daten erscheint.
      onDone?.();
    }
  };

  return (
    <>
      {mode === "create" && (
        <Link
          href="/dashboard/vehicles"
          className="inline-flex items-center gap-1.5 text-sm text-ink-muted hover:text-ink mb-4"
        >
          <ArrowLeft size={14} /> Zurück zu Fahrzeugen
        </Link>
      )}

      {mode === "create" && (
        <>
          <div className="font-display font-bold text-2xl tracking-tight text-ink">Neues Fahrzeug</div>
          <p className="text-sm text-ink-soft mt-1">
            Vollstandige Stammdaten — kannst auch jederzeit spater ergänzen.
          </p>
        </>
      )}

      <form onSubmit={submit} className="mt-6 space-y-6">
        <Panel flush>
          <PanelHeader title="Fahrzeugschein auslesen (KI)" />
          <div className="p-5 space-y-3">
            <p className="text-[13px] text-ink-soft">
              Lade die <strong>Zulassungsbescheinigung Teil I</strong> (Fahrzeugschein) als PDF
              oder Foto hoch. Die KI liest Marke, Modell, FIN, Erstzulassung, Leistung,
              HSN/TSN u. v. m. automatisch aus und füllt die Felder unten. Die{" "}
              <strong>Erstzulassung</strong> steuert zugleich die 180-Tage-Aussteuerung.
            </p>
            <FileDrop
              onFiles={(files) => files[0] && runRegistrationParse(files[0])}
              accept="application/pdf,image/jpeg,image/png,image/webp"
              disabled={parsing}
              label="Fahrzeugschein hierher ziehen oder klicken"
              hint="PDF, JPG, PNG oder WebP · max 12 MB"
            >
              {parsing ? (
                <div className="flex flex-col items-center gap-1.5">
                  <Loader2 size={20} className="animate-spin text-signal" />
                  <div className="text-[13.5px] font-medium text-ink">
                    Fahrzeugschein wird ausgelesen…
                  </div>
                  <div className="text-[12px] text-ink-muted">
                    Das dauert ein paar Sekunden.
                  </div>
                </div>
              ) : undefined}
            </FileDrop>

            {regFile && !parsing && (
              <div className="flex items-center gap-2 text-[13px] bg-canvas border border-hairline rounded-frame px-3 py-2">
                <FileText size={15} className="text-ink-muted shrink-0" />
                <span className="truncate flex-1">{regFile.name}</span>
                <button
                  type="button"
                  onClick={clearReg}
                  className="text-ink-muted hover:text-ink shrink-0"
                  aria-label="Datei entfernen"
                >
                  <X size={15} />
                </button>
              </div>
            )}

            {parseConfidence !== null && !parsing && !existing && (
              <div className="flex items-center gap-2 text-[13px] text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-frame px-3 py-2">
                <Sparkles size={15} className="shrink-0" />
                <span>Ausgelesen — Felder unten vorausgefüllt. Bitte kurz prüfen.</span>
                <span className="ml-auto font-mono text-[11px] text-emerald-700/80 shrink-0">
                  {Math.round((parseConfidence ?? 0) * 100)}% sicher
                </span>
              </div>
            )}

            {existing && !parsing && (
              <div className="rounded-frame border border-amber-300 bg-amber-50 px-3 py-2.5 text-[13px] text-amber-900 space-y-2.5">
                <div className="flex items-start gap-2">
                  <AlertTriangle size={15} className="mt-0.5 shrink-0 text-amber-600" />
                  <div>
                    Kennzeichen <strong>{existing.plate}</strong> ist bereits angelegt
                    {existing.label ? (
                      <>
                        {" "}
                        (<strong>{existing.label}</strong>)
                      </>
                    ) : null}
                    . Statt ein Duplikat anzulegen, ergänze ich nur die im
                    vorhandenen Fahrzeug noch <strong>fehlenden</strong> Felder und
                    hinterlege dort den Schein.
                  </div>
                </div>
                <div className="pl-6">
                  <Button
                    type="button"
                    variant="signal"
                    size="sm"
                    disabled={saving}
                    onClick={mergeIntoExisting}
                  >
                    {saving ? <Loader2 size={14} className="animate-spin" /> : null}
                    Fehlende Daten im vorhandenen Fahrzeug ergänzen
                  </Button>
                </div>
              </div>
            )}

            {parseError && (
              <div className="text-[13px] text-red-700 bg-red-50 border border-red-200 rounded-frame px-3 py-2">
                {parseError}
              </div>
            )}

            {mode === "edit" && initial?.registration_doc_path && !regFile && (
              <a
                href={`/api/vehicles/${initial.id}/registration-doc`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 text-[13px] text-signal hover:underline"
              >
                <ExternalLink size={14} /> Hinterlegten Fahrzeugschein ansehen
              </a>
            )}
          </div>
        </Panel>

        <FormSection title="Fahrzeugdaten">
          <Field label="Hersteller">
            <select value={data.manufacturer} onChange={set("manufacturer")} className="field">
              <option value="">—</option>
              {withValue(MANUFACTURERS, data.manufacturer).map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </Field>
          <Field label="Modell">
            <input value={data.model} onChange={set("model")} placeholder="X3 20d" className="field" />
          </Field>
          <Field label="Kennzeichen *">
            <input
              required
              value={data.plate}
              onChange={set("plate")}
              placeholder="M-KP 2847"
              className="field font-mono uppercase"
            />
            {data.plate && (
              <div className="mt-2">
                <Plate value={data.plate.toUpperCase()} size="sm" />
              </div>
            )}
          </Field>
          <Field label="FIN (Fahrgestellnummer)">
            <input
              value={data.fin_number}
              onChange={set("fin_number")}
              placeholder="WBA8E91040K123456"
              className="field font-mono tabular-nums"
            />
          </Field>
          <Field label="Leistung (PS)">
            <input
              value={data.power_ps}
              onChange={set("power_ps")}
              placeholder="190"
              className="field font-mono tabular-nums"
            />
          </Field>
          <Field label="Kraftstoff">
            <select value={data.fuel_type} onChange={set("fuel_type")} className="field">
              <option value="">—</option>
              {withValue(FUEL_TYPES, data.fuel_type).map((f) => (
                <option key={f} value={f}>{f}</option>
              ))}
            </select>
          </Field>
          <Field label="Getriebe">
            <select value={data.transmission} onChange={set("transmission")} className="field">
              <option value="">—</option>
              {TRANSMISSIONS.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </Field>
          <Field label="Türen">
            <select value={data.doors} onChange={set("doors")} className="field">
              <option value="">—</option>
              {DOORS.map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </Field>
          <Field label="Sitzplatze">
            <input
              value={data.seats}
              onChange={set("seats")}
              placeholder="5"
              className="field font-mono tabular-nums"
            />
          </Field>
          <Field label="Gepäckstücke">
            <input
              value={data.luggage}
              onChange={set("luggage")}
              placeholder="2"
              className="field font-mono tabular-nums"
            />
          </Field>
          <Field label="Karosserieform">
            <select value={data.body_type} onChange={set("body_type")} className="field">
              <option value="">—</option>
              {withValue(BODY_TYPES, data.body_type).map((b) => (
                <option key={b} value={b}>{b}</option>
              ))}
            </select>
          </Field>
          <Field label="Farbe">
            <input
              value={data.color}
              onChange={set("color")}
              placeholder="weiss"
              className="field"
            />
          </Field>
          <Field label="Kategorie">
            <select value={data.category} onChange={set("category")} className="field">
              <option value="">—</option>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </Field>
          <Field label="Anzeige-Name (auto)">
            <div className="field bg-canvas text-ink-muted font-mono tabular-nums">
              {previewType || "wird aus Hersteller + Modell erstellt"}
            </div>
          </Field>
        </FormSection>

        <FormSection title="Fahrzeugschein-Daten">
          <Field label="HSN (2.1)">
            <input
              value={data.hsn}
              onChange={set("hsn")}
              placeholder="0588"
              className="field font-mono tabular-nums"
            />
          </Field>
          <Field label="TSN (2.2)">
            <input
              value={data.tsn}
              onChange={set("tsn")}
              placeholder="BQU063114"
              className="field font-mono tabular-nums"
            />
          </Field>
          <Field label="Hubraum (cm³)">
            <input
              value={data.displacement_ccm}
              onChange={set("displacement_ccm")}
              placeholder="1968"
              className="field font-mono tabular-nums"
              inputMode="numeric"
            />
          </Field>
          <Field label="CO₂ (g/km)">
            <input
              value={data.co2_combined}
              onChange={set("co2_combined")}
              placeholder="152"
              className="field font-mono tabular-nums"
              inputMode="numeric"
            />
          </Field>
          <Field label="Emissionsklasse">
            <input
              value={data.emission_class}
              onChange={set("emission_class")}
              placeholder="EURO6"
              className="field"
            />
          </Field>
          <Field label="Leergewicht (kg)">
            <input
              value={data.weight_empty}
              onChange={set("weight_empty")}
              placeholder="1655"
              className="field font-mono tabular-nums"
              inputMode="numeric"
            />
          </Field>
          <Field label="Zul. Gesamtgewicht (kg)">
            <input
              value={data.weight_max}
              onChange={set("weight_max")}
              placeholder="2155"
              className="field font-mono tabular-nums"
              inputMode="numeric"
            />
          </Field>
          <Field label="ZB Teil II-Nr">
            <input
              value={data.zb2_number}
              onChange={set("zb2_number")}
              placeholder="HX349005"
              className="field font-mono tabular-nums"
            />
          </Field>
          <Field label="Nächste HU / TÜV">
            <input
              type="month"
              value={data.next_hu ? data.next_hu.slice(0, 7) : ""}
              onChange={(e) =>
                setData((d) => ({
                  ...d,
                  next_hu: e.target.value ? `${e.target.value}-01` : "",
                }))
              }
              className="field font-mono tabular-nums"
            />
          </Field>
        </FormSection>

        <FormSection title="Verfügbarkeit & Kilometer">
          <Field label="Verfügbar ab">
            <input
              type="date"
              value={data.available_from}
              onChange={set("available_from")}
              className="field font-mono tabular-nums"
            />
          </Field>
          <Field label="Km-Stand bei Einflottung">
            <input
              value={data.km_at_intake}
              onChange={set("km_at_intake")}
              placeholder="12500"
              className="field font-mono tabular-nums"
            />
          </Field>
          <Field label="Erstzulassung">
            <input
              type="date"
              value={data.first_registration}
              onChange={set("first_registration")}
              className="field font-mono tabular-nums"
            />
          </Field>
          <Field label="Aussteuerung (auto)">
            <div className="field bg-canvas text-ink-muted font-mono tabular-nums">
              {decommissionPreview ? fmtDate(decommissionPreview) + " (+ 180 Tage)" : "—"}
            </div>
          </Field>
          <Field label="Maximalkilometer gesamt">
            <input
              value={data.max_km_total}
              onChange={set("max_km_total")}
              placeholder="80000"
              className="field font-mono tabular-nums"
            />
          </Field>
          <Field label="Inklusivkilometer / Monat">
            <input
              value={data.inclusive_km_month}
              onChange={set("inclusive_km_month")}
              placeholder="2000"
              className="field font-mono tabular-nums"
            />
          </Field>
          <Field label="Mehrkilometer-Preis (EUR/km)">
            <div className="relative">
              <input
                value={data.extra_km_price}
                onChange={set("extra_km_price")}
                placeholder="0.29"
                className="field pr-10 font-mono tabular-nums"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-ink-muted">
                EUR/km
              </span>
            </div>
          </Field>
        </FormSection>

        <FormSection title="Preise (Brutto)">
          <Field label="Tagesmiete (EUR)">
            <div className="relative">
              <input
                value={data.daily_rate}
                onChange={set("daily_rate")}
                placeholder="49.00"
                className="field pr-8 font-mono tabular-nums"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-ink-muted">EUR</span>
            </div>
          </Field>
          <Field label="Wochenmiete (EUR)">
            <div className="relative">
              <input
                value={data.weekly_rate}
                onChange={set("weekly_rate")}
                placeholder="299.00"
                className="field pr-8 font-mono tabular-nums"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-ink-muted">EUR</span>
            </div>
          </Field>
          <Field label="Monatsmiete (EUR)">
            <div className="relative">
              <input
                value={data.monthly_rate}
                onChange={set("monthly_rate")}
                placeholder="999.00"
                className="field pr-8 font-mono tabular-nums"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-ink-muted">EUR</span>
            </div>
          </Field>
          <Field label="Kaution (EUR)">
            <div className="relative">
              <input
                value={data.deposit}
                onChange={set("deposit")}
                placeholder="500.00"
                className="field pr-8 font-mono tabular-nums"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-ink-muted">EUR</span>
            </div>
          </Field>
        </FormSection>

        <FormSection title="Kostenrechnung">
          <Field label="Monatliche Kosten (EK)">
            <div className="relative">
              <input
                value={data.cost_monthly}
                onChange={set("cost_monthly")}
                placeholder="z. B. 720,00"
                className="field pr-8 font-mono tabular-nums"
                inputMode="decimal"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-ink-muted">EUR</span>
            </div>
            <div className="text-[11px] text-ink-muted mt-1">
              Leasing + Versicherung + Wartung etc. — was das Auto pro Monat kostet, egal ob vermietet oder nicht.
            </div>
          </Field>
          <Field label="Tagliche Kosten (auto-berechnet)">
            <div className="relative">
              <input
                value={
                  Number.isFinite(Number(data.cost_monthly.replace(",", ".")))
                    ? (Number(data.cost_monthly.replace(",", ".")) / 30)
                        .toFixed(2)
                        .replace(".", ",")
                    : ""
                }
                readOnly
                className="field pr-8 font-mono tabular-nums bg-canvas"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-ink-muted">EUR/Tag</span>
            </div>
            <div className="text-[11px] text-ink-muted mt-1">
              Monatliche Kosten ÷ 30. Wird für die Margenrechnung pro Tag verwendet.
            </div>
          </Field>
          <Field label="Soll-Tagespreis (VK)">
            <div className="relative">
              <input
                value={data.target_daily_rate}
                onChange={set("target_daily_rate")}
                placeholder="z. B. 65,00"
                className="field pr-8 font-mono tabular-nums"
                inputMode="decimal"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-ink-muted">EUR/Tag</span>
            </div>
            <div className="text-[11px] text-ink-muted mt-1">
              Was Sie pro Tag mindestens verlangen mochten.
            </div>
          </Field>
          <Field label="Soll-Marge pro Tag">
            {(() => {
              const cm = Number(data.cost_monthly.replace(",", "."));
              const tg = Number(data.target_daily_rate.replace(",", "."));
              if (!Number.isFinite(cm) || !Number.isFinite(tg))
                return (
                  <div className="field bg-canvas text-ink-muted font-mono tabular-nums text-sm">
                    —
                  </div>
                );
              const margin = tg - cm / 30;
              return (
                <div
                  className={`field bg-canvas font-mono tabular-nums text-sm font-semibold ${
                    margin >= 0 ? "text-emerald-700" : "text-red-700"
                  }`}
                >
                  {margin
                    .toFixed(2)
                    .replace(".", ",")} EUR/Tag ·{" "}
                  {tg > 0
                    ? ((margin / tg) * 100).toFixed(1).replace(".", ",") + " %"
                    : "—"}
                </div>
              );
            })()}
            <div className="text-[11px] text-ink-muted mt-1">
              VK minus tagliche Kosten. So sehen Sie sofort, ob der Preis stimmt.
            </div>
          </Field>
        </FormSection>

        <FormSection title="Logistik & Intern">
          <Field label="Abhollager">
            <input
              value={data.pickup_location}
              onChange={set("pickup_location")}
              placeholder="z. B. Lager Nord, Halle 2"
              className="field"
            />
          </Field>
          <Field label="Rückgabeort">
            <input
              value={data.return_location}
              onChange={set("return_location")}
              placeholder="z. B. Hauptstandort München"
              className="field"
            />
          </Field>
          <Field label="Rückgabe erfolgt am/um">
            <input
              type="datetime-local"
              value={data.internal_return_at}
              onChange={set("internal_return_at")}
              className="field font-mono tabular-nums"
            />
            <div className="text-[11px] text-ink-muted mt-1">
              Nur intern — erscheint nicht im Vertrag.
            </div>
          </Field>
          <div className="sm:col-span-2">
            <Field label="Interne Notiz">
              <textarea
                value={data.internal_return_note}
                onChange={set("internal_return_note")}
                rows={3}
                placeholder="z. B. Schlüssel im Tresor, Rückgabe ohne Kunde…"
                className="field resize-none"
              />
            </Field>
          </div>
        </FormSection>

        <FormSection title="Sonstiges">
          <div className="sm:col-span-2">
            <Field label="Zubehör">
              <textarea
                value={data.accessories}
                onChange={set("accessories")}
                rows={3}
                placeholder="Navi, Kindersitz, Dachbox, Anhangerkupplung…"
                className="field resize-none"
              />
            </Field>
          </div>
          <Field label="Status">
            <select
              value={data.status}
              onChange={(e) => {
                const next = e.target.value as VehicleStatus;
                setData((d) => ({
                  ...d,
                  status: next,
                  decommission_date:
                    next === "ausgesteuert" && !d.decommission_date
                      ? new Date().toISOString().slice(0, 10)
                      : d.decommission_date,
                }));
              }}
              className="field"
            >
              {VEHICLE_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {VEHICLE_STATUS_META[s].label}
                </option>
              ))}
            </select>
          </Field>
          {data.status === "ausgesteuert" && (
            <Field label="Ausgeflottet zum">
              <input
                type="date"
                value={data.decommission_date}
                onChange={set("decommission_date")}
                className="field font-mono tabular-nums"
              />
              <div className="text-[11px] text-ink-muted mt-1">
                Ab diesem Datum erscheint das Fahrzeug nicht mehr in aktiven Listen,
                bleibt aber im Archiv einsehbar.
              </div>
            </Field>
          )}
          <Field label="GPS-Tracker ID (Echoes)">
            <input
              value={data.echoes_device_id}
              onChange={set("echoes_device_id")}
              placeholder="z. B. ECHO-12345"
              className="field font-mono tabular-nums"
            />
          </Field>
        </FormSection>

        {error && (
          <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-frame px-3 py-2">
            {error}
          </div>
        )}

        <div className="flex items-center justify-end gap-3 sticky bottom-0 bg-canvas py-3 -mx-4 md:-mx-0 md:py-0 md:bg-transparent px-4 md:px-0">
          {saved && (
            <span className="inline-flex items-center gap-1 text-xs text-emerald-700">
              <CheckCircle2 size={13} /> Gespeichert
            </span>
          )}
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              disabled={saving}
              className="text-[13px] text-ink-muted hover:text-ink px-2 disabled:opacity-40"
            >
              Abbrechen
            </button>
          )}
          <Button type="submit" variant="signal" disabled={saving || parsing}>
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            {mode === "create" ? "Fahrzeug anlegen" : "Speichern"}
          </Button>
        </div>
      </form>
    </>
  );
};

const FormSection = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <Panel flush>
    <PanelHeader title={title} />
    <div className="grid sm:grid-cols-2 gap-4 p-5">{children}</div>
  </Panel>
);

const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <label className="block">
    <div className="data-label mb-1">{label}</div>
    {children}
  </label>
);

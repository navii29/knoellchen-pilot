"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { X, Upload } from "lucide-react";
import { EVENT_TYPE_META, type VehicleEventType } from "@/lib/vehicle-events";

const inputCls =
  "w-full h-10 px-3 rounded-lg bg-white ring-1 ring-stone-200 text-sm text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-teal-500/40 focus:border-teal-500 transition-shadow";

const TYPE_ORDER: VehicleEventType[] = [
  "service",
  "tires",
  "tuev",
  "repair",
  "insurance",
  "other",
];

export const AddEventModal = ({
  vehicleId,
  open,
  onClose,
}: {
  vehicleId: string;
  open: boolean;
  onClose: () => void;
}) => {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);

  const [type, setType] = useState<VehicleEventType>("service");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [km, setKm] = useState("");
  const [description, setDescription] = useState("");
  const [cost, setCost] = useState("");
  const [provider, setProvider] = useState("");
  const [nextDate, setNextDate] = useState("");
  const [nextKm, setNextKm] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const reset = () => {
    setType("service");
    setDate(new Date().toISOString().slice(0, 10));
    setKm("");
    setDescription("");
    setCost("");
    setProvider("");
    setNextDate("");
    setNextKm("");
    setFile(null);
    setError(null);
    setLoading(false);
    if (fileRef.current) fileRef.current.value = "";
  };

  const submit = async () => {
    if (!date) {
      setError("Bitte ein Datum angeben.");
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const fd = new FormData();
      fd.append("type", type);
      fd.append("date", date);
      if (km) fd.append("km_at_event", km);
      if (description) fd.append("description", description);
      if (cost) fd.append("cost", cost);
      if (provider) fd.append("provider", provider);
      if (nextDate) fd.append("next_due_date", nextDate);
      if (nextKm) fd.append("next_due_km", nextKm);
      if (file) fd.append("file", file);

      const res = await fetch(`/api/vehicles/${vehicleId}/events`, {
        method: "POST",
        body: fd,
      });
      const j = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string };
      if (!res.ok || !j.ok) {
        setError(j.error ?? "Speichern fehlgeschlagen.");
        setLoading(false);
        return;
      }
      reset();
      onClose();
      router.refresh();
    } catch {
      setError("Netzwerkfehler.");
      setLoading(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <button
        className="absolute inset-0 bg-stone-900/40 backdrop-blur-sm"
        onClick={onClose}
        aria-label="Schließen"
      />
      <div className="relative w-full sm:max-w-2xl max-h-[90vh] flex flex-col bg-white sm:rounded-2xl rounded-t-2xl shadow-2xl ring-1 ring-stone-200 overflow-hidden">
        <div className="px-6 py-4 flex items-center justify-between border-b border-stone-100 shrink-0">
          <div>
            <div className="text-[11px] uppercase tracking-[0.08em] font-semibold text-teal-700">
              Historie
            </div>
            <h2 className="font-display text-xl tracking-tight font-medium mt-0.5">
              Eintrag hinzufügen
            </h2>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full inline-flex items-center justify-center text-stone-500 hover:bg-stone-100"
          >
            <X size={16} />
          </button>
        </div>

        <div className="px-6 py-5 overflow-auto scroll-thin grow">
          <div className="text-[11px] uppercase tracking-wider font-semibold text-stone-500 mb-2">
            Typ
          </div>
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 mb-5">
            {TYPE_ORDER.map((t) => {
              const meta = EVENT_TYPE_META[t];
              const active = type === t;
              return (
                <button
                  key={t}
                  type="button"
                  onClick={() => setType(t)}
                  className={`px-2 py-2 rounded-lg text-[12px] font-medium transition-all ${
                    active
                      ? "ring-1 shadow-sm"
                      : "ring-1 ring-stone-200 bg-white text-stone-600 hover:ring-stone-300"
                  }`}
                  style={
                    active
                      ? {
                          background: meta.bg,
                          color: meta.text,
                          boxShadow: `inset 0 0 0 1px ${meta.ring}`,
                        }
                      : undefined
                  }
                >
                  {meta.short}
                </button>
              );
            })}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Datum" required>
              <input
                type="date"
                className={inputCls}
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </Field>
            <Field label="Km-Stand">
              <input
                className={inputCls}
                value={km}
                onChange={(e) => setKm(e.target.value)}
                inputMode="numeric"
                placeholder="z. B. 45 000"
              />
            </Field>

            <div className="col-span-2">
              <Field label="Beschreibung">
                <textarea
                  className={`${inputCls} h-20 py-2 leading-snug`}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="z. B. Inspektion 60.000 km, Ölwechsel, Bremsbeläge"
                />
              </Field>
            </div>

            <Field label="Kosten" hint="brutto in €">
              <input
                className={inputCls}
                value={cost}
                onChange={(e) => setCost(e.target.value)}
                inputMode="decimal"
                placeholder="0,00"
              />
            </Field>
            <Field label="Anbieter / Werkstatt">
              <input
                className={inputCls}
                value={provider}
                onChange={(e) => setProvider(e.target.value)}
                placeholder="z. B. ATU Augsburg"
              />
            </Field>

            <Field label="Nächster Termin">
              <input
                type="date"
                className={inputCls}
                value={nextDate}
                onChange={(e) => setNextDate(e.target.value)}
              />
            </Field>
            <Field label="Nächster Km-Stand">
              <input
                className={inputCls}
                value={nextKm}
                onChange={(e) => setNextKm(e.target.value)}
                inputMode="numeric"
                placeholder="z. B. 60 000"
              />
            </Field>
          </div>

          <div className="mt-5">
            <div className="text-[11px] uppercase tracking-wider font-semibold text-stone-500 mb-2">
              Beleg / Rechnung
            </div>
            <label className="flex items-center gap-3 px-3 py-2.5 rounded-lg ring-1 ring-stone-200 hover:ring-stone-300 cursor-pointer text-sm text-stone-700">
              <Upload size={14} className="text-stone-400" />
              <span className="truncate">
                {file ? file.name : "PDF oder Foto auswählen (max 12 MB)"}
              </span>
              <input
                ref={fileRef}
                type="file"
                accept="image/*,application/pdf"
                className="hidden"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              />
            </label>
          </div>

          {error && (
            <div className="mt-4 px-3 py-2 rounded-lg bg-rose-50 ring-1 ring-rose-200 text-[13px] text-rose-700">
              {error}
            </div>
          )}
        </div>

        <div className="px-6 py-4 flex items-center justify-end gap-3 border-t border-stone-100 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="text-sm text-stone-500 hover:text-stone-800 px-3"
          >
            Abbrechen
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={loading}
            className="inline-flex items-center justify-center h-10 px-5 rounded-full bg-stone-900 text-white text-sm font-medium hover:bg-stone-800 disabled:opacity-40"
          >
            {loading ? "Speichern…" : "Eintrag speichern"}
          </button>
        </div>
      </div>
    </div>
  );
};

const Field = ({
  label,
  hint,
  required,
  children,
}: {
  label: string;
  hint?: string;
  required?: boolean;
  children: React.ReactNode;
}) => (
  <label className="block">
    <div className="flex items-baseline justify-between mb-1">
      <span className="text-[12px] font-medium text-stone-700">
        {label}
        {required && <span className="text-rose-500 ml-0.5">*</span>}
      </span>
      {hint && <span className="text-[11px] text-stone-400">{hint}</span>}
    </div>
    {children}
  </label>
);

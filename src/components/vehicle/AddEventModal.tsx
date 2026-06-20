"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { X, Upload } from "lucide-react";
import { EVENT_TYPE_META, type VehicleEventType } from "@/lib/vehicle-events";
import { Button } from "@/components/ui/Button";
import { FileDrop } from "@/components/ui/FileDrop";

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
        className="absolute inset-0 bg-void/60 backdrop-blur-sm"
        onClick={onClose}
        aria-label="Schliessen"
      />
      <div className="relative w-full sm:max-w-2xl max-h-[90vh] flex flex-col rounded-card border border-hairline bg-paper shadow-raised overflow-hidden">
        <div className="px-6 py-4 flex items-center justify-between border-b border-hairline shrink-0">
          <div>
            <div className="kicker text-ink-muted mb-1">Historie</div>
            <h2 className="font-display text-xl tracking-tight font-bold text-ink mt-0.5">
              Eintrag hinzufügen
            </h2>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full inline-flex items-center justify-center text-ink-muted hover:bg-canvas"
          >
            <X size={16} />
          </button>
        </div>

        <div className="px-6 py-5 overflow-auto scroll-thin grow">
          <div className="data-label mb-2">Typ</div>
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 mb-5">
            {TYPE_ORDER.map((t) => {
              const meta = EVENT_TYPE_META[t];
              const active = type === t;
              return (
                <button
                  key={t}
                  type="button"
                  onClick={() => setType(t)}
                  className={`px-2 py-2 rounded-btn text-[12px] font-medium transition-all border ${
                    active
                      ? "border-transparent shadow-sm"
                      : "border-hairline bg-paper text-ink-soft hover:bg-canvas"
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
                className="field"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </Field>
            <Field label="Km-Stand">
              <input
                className="field"
                value={km}
                onChange={(e) => setKm(e.target.value)}
                inputMode="numeric"
                placeholder="z. B. 45 000"
              />
            </Field>

            <div className="col-span-2">
              <Field label="Beschreibung">
                <textarea
                  className="field h-20 py-2 leading-snug resize-none"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="z. B. Inspektion 60.000 km, Olwechsel, Bremsbelage"
                />
              </Field>
            </div>

            <Field label="Kosten" hint="brutto in EUR">
              <input
                className="field"
                value={cost}
                onChange={(e) => setCost(e.target.value)}
                inputMode="decimal"
                placeholder="0,00"
              />
            </Field>
            <Field label="Anbieter / Werkstatt">
              <input
                className="field"
                value={provider}
                onChange={(e) => setProvider(e.target.value)}
                placeholder="z. B. ATU Augsburg"
              />
            </Field>

            <Field label="Nächster Termin">
              <input
                type="date"
                className="field"
                value={nextDate}
                onChange={(e) => setNextDate(e.target.value)}
              />
            </Field>
            <Field label="Nächster Km-Stand">
              <input
                className="field"
                value={nextKm}
                onChange={(e) => setNextKm(e.target.value)}
                inputMode="numeric"
                placeholder="z. B. 60 000"
              />
            </Field>
          </div>

          <div className="mt-5">
            <div className="data-label mb-2">Beleg / Rechnung</div>
            <FileDrop
              accept="image/*,application/pdf"
              onFiles={(files) => setFile(files[0] ?? null)}
              className="px-3 py-2.5 text-left"
            >
              <div className="flex items-center gap-3 text-sm text-ink-soft">
                <Upload size={14} className="text-ink-muted" />
                <span className="truncate">
                  {file
                    ? file.name
                    : "PDF oder Foto auswählen — oder hierher ziehen (max 12 MB)"}
                </span>
              </div>
            </FileDrop>
          </div>

          {error && (
            <div className="mt-4 px-3 py-2 rounded-frame bg-red-50 border border-red-200 text-[13px] text-red-700">
              {error}
            </div>
          )}
        </div>

        <div className="px-6 py-4 flex items-center justify-end gap-3 border-t border-hairline shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="text-sm text-ink-muted hover:text-ink px-3"
          >
            Abbrechen
          </button>
          <Button variant="signal" onClick={submit} disabled={loading}>
            {loading ? "Speichern…" : "Eintrag speichern"}
          </Button>
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
      <span className="data-label">
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </span>
      {hint && <span className="text-[11px] text-ink-muted">{hint}</span>}
    </div>
    {children}
  </label>
);

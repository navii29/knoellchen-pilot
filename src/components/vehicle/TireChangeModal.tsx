"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  Camera,
  Check,
  Loader2,
  Upload,
  X,
} from "lucide-react";
import {
  TIRE_PHOTO_POSITIONS,
  TIRE_TYPE_META,
  type TireCondition,
  type TirePhotoPosition,
  type TireType,
  type VehicleTire,
} from "@/lib/tires";
import { Button } from "@/components/ui/Button";

const TIRE_TYPES: TireType[] = ["summer", "winter", "allseason"];
const CONDITIONS: TireCondition[] = ["new", "good", "worn", "replace"];
const COND_LABEL: Record<TireCondition, string> = {
  new: "Neu",
  good: "Gut",
  worn: "Abgenutzt",
  replace: "Wechseln",
};

export const TireChangeModal = ({
  vehicleId,
  currentTire,
  onClose,
}: {
  vehicleId: string;
  currentTire: VehicleTire | null;
  onClose: () => void;
}) => {
  const router = useRouter();
  const [type, setType] = useState<TireType>("summer");
  const [brand, setBrand] = useState("");
  const [model, setModel] = useState("");
  const [size, setSize] = useState("");
  const [dot, setDot] = useState("");
  const [fl, setFl] = useState("");
  const [fr, setFr] = useState("");
  const [rl, setRl] = useState("");
  const [rr, setRr] = useState("");
  const [km, setKm] = useState("");
  const [mountedAt, setMountedAt] = useState(() =>
    new Date().toISOString().slice(0, 10)
  );
  const [storageLocation, setStorageLocation] = useState("");
  const [condition, setCondition] = useState<TireCondition>("good");
  const [notes, setNotes] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdTireId, setCreatedTireId] = useState<string | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const submit = async () => {
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch(`/api/vehicles/${vehicleId}/tires`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type,
          brand: brand || null,
          model: model || null,
          size: size || null,
          dot_number: dot || null,
          tread_depth_fl: fl || null,
          tread_depth_fr: fr || null,
          tread_depth_rl: rl || null,
          tread_depth_rr: rr || null,
          km_at_mount: km || null,
          mounted_at: mountedAt || null,
          storage_location: storageLocation || null,
          condition,
          notes: notes || null,
          is_current: true,
        }),
      });
      const j = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        tire?: { id: string };
        error?: string;
      };
      if (!res.ok || !j.ok || !j.tire) {
        setError(j.error ?? "Speichern fehlgeschlagen");
        setSubmitting(false);
        return;
      }
      setCreatedTireId(j.tire.id);
    } catch {
      setError("Netzwerkfehler");
      setSubmitting(false);
    }
  };

  const finish = () => {
    onClose();
    router.refresh();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center px-0 sm:px-4">
      <button
        type="button"
        className="absolute inset-0 bg-void/60 backdrop-blur-sm"
        onClick={onClose}
        aria-label="Schliessen"
      />
      <div className="relative w-full sm:max-w-2xl max-h-[92vh] flex flex-col rounded-card border border-hairline bg-paper shadow-raised overflow-hidden">
        <div className="px-6 py-4 flex items-center justify-between border-b border-hairline shrink-0">
          <div>
            <div className="kicker text-ink-muted mb-1">Reifen</div>
            <h2 className="font-display text-xl tracking-tight font-bold text-ink mt-0.5">
              {createdTireId
                ? "Fotos hochladen"
                : currentTire
                ? "Reifenwechsel durchfuhren"
                : "Reifensatz anlegen"}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full inline-flex items-center justify-center text-ink-muted hover:bg-canvas"
          >
            <X size={16} />
          </button>
        </div>

        <div className="px-6 py-5 overflow-auto scroll-thin grow space-y-4">
          {!createdTireId ? (
            <>
              {currentTire && (
                <div className="rounded-frame border border-amber-200 bg-amber-50 px-4 py-2.5 text-[12.5px] text-amber-900">
                  Der aktuelle Satz ({TIRE_TYPE_META[currentTire.type].label}) wird
                  beim Speichern als demontiert markiert.
                </div>
              )}

              <div>
                <Label>Typ</Label>
                <div className="grid grid-cols-3 gap-2">
                  {TIRE_TYPES.map((t) => {
                    const meta = TIRE_TYPE_META[t];
                    const active = type === t;
                    return (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setType(t)}
                        className={`h-12 rounded-btn text-[13px] font-medium flex items-center justify-center gap-1.5 transition-all border ${
                          active
                            ? "border-transparent"
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
                        <span>{meta.emoji}</span>
                        {meta.short}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Field label="Marke">
                  <input
                    className="field"
                    value={brand}
                    onChange={(e) => setBrand(e.target.value)}
                    placeholder="Continental"
                  />
                </Field>
                <Field label="Modell">
                  <input
                    className="field"
                    value={model}
                    onChange={(e) => setModel(e.target.value)}
                    placeholder="PremiumContact 6"
                  />
                </Field>
                <Field label="Grosse">
                  <input
                    className="field"
                    value={size}
                    onChange={(e) => setSize(e.target.value)}
                    placeholder="225/45 R17"
                  />
                </Field>
                <Field label="DOT-Nummer">
                  <input
                    className="field font-mono"
                    value={dot}
                    onChange={(e) => setDot(e.target.value)}
                    placeholder="3624"
                  />
                </Field>
              </div>

              <div>
                <Label>Profiltiefe (mm)</Label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { label: "Vorne links", v: fl, setV: setFl },
                    { label: "Vorne rechts", v: fr, setV: setFr },
                    { label: "Hinten links", v: rl, setV: setRl },
                    { label: "Hinten rechts", v: rr, setV: setRr },
                  ].map((f) => (
                    <label key={f.label} className="block">
                      <div className="text-[11.5px] text-ink-muted mb-1">{f.label}</div>
                      <div className="relative">
                        <input
                          className="field pr-8"
                          value={f.v}
                          onChange={(e) => f.setV(e.target.value)}
                          inputMode="decimal"
                          placeholder="0,0"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[12px] text-ink-muted">
                          mm
                        </span>
                      </div>
                    </label>
                  ))}
                </div>
                <div className="mt-1.5 text-[11px] text-ink-muted">
                  Grun &ge; 4 mm · Gelb 3–4 mm · Rot &lt; 3 mm (Wechsel empfohlen)
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Field label="Km bei Montage">
                  <input
                    className="field font-mono"
                    value={km}
                    onChange={(e) => setKm(e.target.value)}
                    inputMode="numeric"
                    placeholder="z. B. 45 000"
                  />
                </Field>
                <Field label="Datum">
                  <input
                    type="date"
                    className="field"
                    value={mountedAt}
                    onChange={(e) => setMountedAt(e.target.value)}
                  />
                </Field>
                <Field label="Lagerort der alten Reifen">
                  <input
                    className="field"
                    value={storageLocation}
                    onChange={(e) => setStorageLocation(e.target.value)}
                    placeholder="z. B. Lager Regal 3"
                  />
                </Field>
                <Field label="Zustand der neuen Reifen">
                  <select
                    className="field"
                    value={condition}
                    onChange={(e) => setCondition(e.target.value as TireCondition)}
                  >
                    {CONDITIONS.map((c) => (
                      <option key={c} value={c}>
                        {COND_LABEL[c]}
                      </option>
                    ))}
                  </select>
                </Field>
              </div>

              <Field label="Notizen">
                <textarea
                  className="field h-20 py-2 leading-snug resize-none"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Optional"
                />
              </Field>

              {error && (
                <div className="flex items-center gap-2 text-sm rounded-frame px-3 py-2 bg-red-50 border border-red-200 text-red-700">
                  <AlertTriangle size={14} /> {error}
                </div>
              )}
            </>
          ) : (
            <PhotoUploadStep vehicleId={vehicleId} tireId={createdTireId} />
          )}
        </div>

        <div className="px-6 py-4 flex items-center justify-end gap-3 border-t border-hairline shrink-0">
          {!createdTireId ? (
            <>
              <button
                type="button"
                onClick={onClose}
                className="text-sm text-ink-muted hover:text-ink px-3"
              >
                Abbrechen
              </button>
              <Button variant="signal" onClick={submit} disabled={submitting}>
                {submitting ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <Check size={14} />
                )}
                Wechsel speichern
              </Button>
            </>
          ) : (
            <Button variant="signal" onClick={finish}>
              Fertig
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

const PhotoUploadStep = ({
  vehicleId,
  tireId,
}: {
  vehicleId: string;
  tireId: string;
}) => {
  const [uploaded, setUploaded] = useState<Record<TirePhotoPosition, boolean>>(
    {} as Record<TirePhotoPosition, boolean>
  );
  const [busy, setBusy] = useState<TirePhotoPosition | null>(null);
  const [errors, setErrors] = useState<Record<TirePhotoPosition, string>>(
    {} as Record<TirePhotoPosition, string>
  );
  const refs = useRef<Record<TirePhotoPosition, HTMLInputElement | null>>(
    {} as Record<TirePhotoPosition, HTMLInputElement | null>
  );

  const upload = async (position: TirePhotoPosition, file: File) => {
    setBusy(position);
    setErrors((e) => ({ ...e, [position]: "" }));
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("position", position);
      const res = await fetch(
        `/api/vehicles/${vehicleId}/tires/${tireId}/photos`,
        { method: "POST", body: fd }
      );
      const j = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        error?: string;
      };
      if (!res.ok || !j.ok) {
        setErrors((e) => ({
          ...e,
          [position]: j.error ?? "Upload fehlgeschlagen",
        }));
        return;
      }
      setUploaded((u) => ({ ...u, [position]: true }));
    } finally {
      setBusy(null);
    }
  };

  return (
    <div>
      <div className="rounded-frame border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-[12.5px] text-emerald-800 mb-4 flex items-center gap-2">
        <Check size={13} /> Reifensatz gespeichert. Optional Fotos hochladen.
      </div>
      <div className="grid grid-cols-2 gap-2.5">
        {TIRE_PHOTO_POSITIONS.map((p) => {
          const isUploaded = uploaded[p.key];
          const isBusy = busy === p.key;
          const err = errors[p.key];
          return (
            <button
              key={p.key}
              type="button"
              onClick={() => refs.current[p.key]?.click()}
              disabled={isBusy}
              className={`rounded-card border px-3 py-3 text-left ${
                isUploaded
                  ? "bg-emerald-50 border-emerald-200"
                  : err
                  ? "bg-red-50 border-red-200"
                  : "bg-paper border-hairline hover:bg-canvas"
              } disabled:opacity-60`}
            >
              <input
                ref={(el) => {
                  refs.current[p.key] = el;
                }}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) void upload(p.key, f);
                }}
              />
              <div className="flex items-center gap-2.5">
                <div
                  className={`w-9 h-9 rounded-frame flex items-center justify-center shrink-0 ${
                    isUploaded
                      ? "bg-emerald-100 text-emerald-700"
                      : err
                      ? "bg-red-100 text-red-700"
                      : "bg-canvas text-ink-muted"
                  }`}
                >
                  {isBusy ? (
                    <Loader2 size={15} className="animate-spin" />
                  ) : isUploaded ? (
                    <Check size={15} />
                  ) : (
                    <Camera size={15} />
                  )}
                </div>
                <div className="min-w-0">
                  <div className="text-[13.5px] font-medium text-ink leading-tight">
                    {p.label}
                  </div>
                  <div
                    className={`text-[11px] mt-0.5 leading-tight truncate ${
                      err ? "text-red-700" : "text-ink-muted"
                    }`}
                  >
                    {err
                      ? err
                      : isUploaded
                      ? "Hochgeladen"
                      : isBusy
                      ? "Wird hochgeladen…"
                      : p.hint}
                  </div>
                </div>
              </div>
            </button>
          );
        })}
      </div>
      <div className="mt-3 text-[11.5px] text-ink-muted flex items-center gap-1.5">
        <Upload size={11} />
        Fotos konnen auch spater ergänzt werden.
      </div>
    </div>
  );
};

const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <label className="block">
    <Label>{label}</Label>
    {children}
  </label>
);

const Label = ({ children }: { children: React.ReactNode }) => (
  <div className="data-label mb-1.5">
    {children}
  </div>
);

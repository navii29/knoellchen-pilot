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

const inputCls =
  "w-full h-10 px-3 rounded-lg bg-white ring-1 ring-zinc-200 text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500 transition-shadow";

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
        className="absolute inset-0 bg-zinc-900/40 backdrop-blur-sm"
        onClick={onClose}
        aria-label="Schließen"
      />
      <div className="relative w-full sm:max-w-2xl max-h-[92vh] flex flex-col bg-white sm:rounded-2xl rounded-t-2xl shadow-2xl ring-1 ring-zinc-200 overflow-hidden">
        <div className="px-6 py-4 flex items-center justify-between border-b border-zinc-100 shrink-0">
          <div>
            <div className="text-[11px] uppercase tracking-[0.08em] font-semibold text-indigo-700">
              Reifen
            </div>
            <h2 className="font-display text-xl tracking-tight font-medium mt-0.5">
              {createdTireId
                ? "Fotos hochladen"
                : currentTire
                ? "Reifenwechsel durchführen"
                : "Reifensatz anlegen"}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full inline-flex items-center justify-center text-zinc-500 hover:bg-zinc-100"
          >
            <X size={16} />
          </button>
        </div>

        <div className="px-6 py-5 overflow-auto scroll-thin grow space-y-4">
          {!createdTireId ? (
            <>
              {currentTire && (
                <div className="rounded-lg ring-1 ring-amber-200 bg-amber-50 px-4 py-2.5 text-[12.5px] text-amber-900">
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
                        className={`h-12 rounded-lg text-[13px] font-medium flex items-center justify-center gap-1.5 transition-all ${
                          active
                            ? "ring-1"
                            : "ring-1 ring-zinc-200 bg-white text-zinc-600 hover:ring-zinc-300"
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
                    className={inputCls}
                    value={brand}
                    onChange={(e) => setBrand(e.target.value)}
                    placeholder="Continental"
                  />
                </Field>
                <Field label="Modell">
                  <input
                    className={inputCls}
                    value={model}
                    onChange={(e) => setModel(e.target.value)}
                    placeholder="PremiumContact 6"
                  />
                </Field>
                <Field label="Größe">
                  <input
                    className={inputCls}
                    value={size}
                    onChange={(e) => setSize(e.target.value)}
                    placeholder="225/45 R17"
                  />
                </Field>
                <Field label="DOT-Nummer">
                  <input
                    className={inputCls}
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
                      <div className="text-[11.5px] text-zinc-500 mb-1">{f.label}</div>
                      <div className="relative">
                        <input
                          className={`${inputCls} pr-8`}
                          value={f.v}
                          onChange={(e) => f.setV(e.target.value)}
                          inputMode="decimal"
                          placeholder="0,0"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[12px] text-zinc-400">
                          mm
                        </span>
                      </div>
                    </label>
                  ))}
                </div>
                <div className="mt-1.5 text-[11px] text-zinc-500">
                  Grün ≥ 4 mm · Gelb 3–4 mm · Rot &lt; 3 mm (Wechsel empfohlen)
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Field label="Km bei Montage">
                  <input
                    className={inputCls}
                    value={km}
                    onChange={(e) => setKm(e.target.value)}
                    inputMode="numeric"
                    placeholder="z. B. 45 000"
                  />
                </Field>
                <Field label="Datum">
                  <input
                    type="date"
                    className={inputCls}
                    value={mountedAt}
                    onChange={(e) => setMountedAt(e.target.value)}
                  />
                </Field>
                <Field label="Lagerort der alten Reifen">
                  <input
                    className={inputCls}
                    value={storageLocation}
                    onChange={(e) => setStorageLocation(e.target.value)}
                    placeholder="z. B. Lager Regal 3"
                  />
                </Field>
                <Field label="Zustand der neuen Reifen">
                  <select
                    className={inputCls}
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
                  className={`${inputCls} h-20 py-2 leading-snug`}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Optional"
                />
              </Field>

              {error && (
                <div className="flex items-center gap-2 text-sm rounded-lg px-3 py-2 bg-rose-50 ring-1 ring-rose-200 text-rose-700">
                  <AlertTriangle size={14} /> {error}
                </div>
              )}
            </>
          ) : (
            <PhotoUploadStep vehicleId={vehicleId} tireId={createdTireId} />
          )}
        </div>

        <div className="px-6 py-4 flex items-center justify-end gap-3 border-t border-zinc-100 shrink-0">
          {!createdTireId ? (
            <>
              <button
                type="button"
                onClick={onClose}
                className="text-sm text-zinc-500 hover:text-zinc-800 px-3"
              >
                Abbrechen
              </button>
              <button
                type="button"
                onClick={submit}
                disabled={submitting}
                className="inline-flex items-center justify-center gap-1.5 h-10 px-5 rounded-full bg-zinc-900 text-white text-sm font-medium hover:bg-zinc-800 disabled:opacity-40"
              >
                {submitting ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <Check size={14} />
                )}
                Wechsel speichern
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={finish}
              className="inline-flex items-center justify-center gap-1.5 h-10 px-5 rounded-full bg-zinc-900 text-white text-sm font-medium hover:bg-zinc-800"
            >
              Fertig
            </button>
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
      <div className="rounded-lg ring-1 ring-emerald-200 bg-emerald-50 px-4 py-2.5 text-[12.5px] text-emerald-800 mb-4 flex items-center gap-2">
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
              className={`rounded-2xl ring-1 px-3 py-3 text-left ${
                isUploaded
                  ? "bg-emerald-50 ring-emerald-200"
                  : err
                  ? "bg-rose-50 ring-rose-200"
                  : "bg-white ring-zinc-200 hover:ring-zinc-300"
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
                  className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                    isUploaded
                      ? "bg-emerald-100 text-emerald-700"
                      : err
                      ? "bg-rose-100 text-rose-700"
                      : "bg-zinc-100 text-zinc-600"
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
                  <div className="text-[13.5px] font-medium text-zinc-900 leading-tight">
                    {p.label}
                  </div>
                  <div
                    className={`text-[11px] mt-0.5 leading-tight truncate ${
                      err ? "text-rose-700" : "text-zinc-500"
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
      <div className="mt-3 text-[11.5px] text-zinc-500 flex items-center gap-1.5">
        <Upload size={11} />
        Fotos können auch später ergänzt werden.
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
  <div className="text-[11.5px] uppercase tracking-wider text-zinc-500 font-medium mb-1.5">
    {children}
  </div>
);

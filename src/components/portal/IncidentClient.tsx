"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Camera, Loader2, X } from "lucide-react";
import { Plate } from "@/components/ui/Plate";

export const IncidentClient = ({
  contractId,
  plate,
  vehicleType,
}: {
  contractId: string;
  plate: string;
  vehicleType: string | null;
}) => {
  const router = useRouter();
  const today = new Date().toISOString().slice(0, 10);
  const [form, setForm] = useState({
    date: today,
    time: "",
    location: "",
    description: "",
    op_name: "",
    op_plate: "",
    op_insurance: "",
  });
  const [photos, setPhotos] = useState<string[]>([]);
  const [uploading, setUploading] = useState(0);
  const [showOther, setShowOther] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const set =
    (k: keyof typeof form) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm((f) => ({ ...f, [k]: e.target.value }));

  const onFiles = async (files: FileList | null) => {
    if (!files) return;
    setError(null);
    for (const file of Array.from(files)) {
      setUploading((n) => n + 1);
      try {
        const fd = new FormData();
        fd.append("file", file);
        const r = await fetch(`/api/portal/contracts/${contractId}/incident/photos`, {
          method: "POST",
          body: fd,
        });
        const j = (await r.json().catch(() => ({}))) as { path?: string; error?: string };
        if (r.ok && j.path) setPhotos((p) => [...p, j.path as string]);
        else setError(j.error ?? "Upload fehlgeschlagen");
      } finally {
        setUploading((n) => n - 1);
      }
    }
    if (fileRef.current) fileRef.current.value = "";
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.description.trim() && photos.length === 0) {
      setError("Bitte eine Beschreibung oder ein Foto angeben.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const r = await fetch(`/api/portal/contracts/${contractId}/incident`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: form.date,
          time: form.time,
          location: form.location,
          description: form.description,
          other_party_name: form.op_name,
          other_party_plate: form.op_plate,
          other_party_insurance: form.op_insurance,
          photos,
        }),
      });
      const j = (await r.json().catch(() => ({}))) as { error?: string };
      if (!r.ok) {
        setError(j.error ?? "Fehler");
        setSaving(false);
        return;
      }
      router.replace(`/portal/contracts/${contractId}?gemeldet=1`);
      router.refresh();
    } catch {
      setError("Netzwerkfehler");
      setSaving(false);
    }
  };

  return (
    <div className="px-5 py-4 space-y-4">
      <Link
        href={`/portal/contracts/${contractId}`}
        className="inline-flex items-center gap-1.5 text-[13px] text-ink-muted hover:text-ink transition-colors"
      >
        <ArrowLeft size={13} /> Zurück zum Vertrag
      </Link>

      <div className="flex items-center gap-2">
        <Plate value={plate} size="sm" />
        <span className="text-[13px] text-ink-soft">{vehicleType || "Fahrzeug"}</span>
      </div>
      <h1 className="font-display text-[22px] tracking-tightest font-bold text-ink px-0">
        Schaden melden
      </h1>

      <form onSubmit={submit} className="glass-card glass-sheen rounded-card p-5 space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Datum">
            <input type="date" className="field" value={form.date} onChange={set("date")} />
          </Field>
          <Field label="Uhrzeit">
            <input
              type="time"
              className="field"
              value={form.time}
              onChange={set("time")}
            />
          </Field>
        </div>

        <Field label="Ort">
          <input
            className="field"
            placeholder="Wo ist es passiert?"
            value={form.location}
            onChange={set("location")}
          />
        </Field>

        <Field label="Was ist passiert?">
          <textarea
            className="field"
            rows={4}
            placeholder="Beschreibe den Schaden / Unfall…"
            value={form.description}
            onChange={set("description")}
          />
        </Field>

        {/* Fotos */}
        <div>
          <div className="data-label mb-1">Fotos</div>
          <div className="flex items-center gap-2 flex-wrap">
            {photos.map((p, i) => (
              <span
                key={p}
                className="inline-flex items-center gap-1 text-[11px] bg-signal-soft text-signal-ink rounded-full pl-2.5 pr-1 py-1"
              >
                Foto {i + 1}
                <button
                  type="button"
                  onClick={() => setPhotos((arr) => arr.filter((x) => x !== p))}
                  className="hover:text-ink"
                >
                  <X size={12} />
                </button>
              </span>
            ))}
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="inline-flex items-center gap-1.5 text-[12px] font-medium bg-paper border border-hairline rounded-full px-3 py-1.5 text-ink-soft hover:text-ink"
            >
              {uploading > 0 ? <Loader2 size={13} className="animate-spin" /> : <Camera size={13} />}
              Foto hinzufügen
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              capture="environment"
              multiple
              className="hidden"
              onChange={(e) => onFiles(e.target.files)}
            />
          </div>
        </div>

        {/* Unfallgegner (optional) */}
        {!showOther ? (
          <button
            type="button"
            onClick={() => setShowOther(true)}
            className="text-[12px] text-signal font-medium"
          >
            + Unfallgegner angeben
          </button>
        ) : (
          <div className="space-y-2 border-t border-hairline pt-3">
            <div className="data-label">Unfallgegner (optional)</div>
            <input
              className="field"
              placeholder="Name"
              value={form.op_name}
              onChange={set("op_name")}
            />
            <div className="grid grid-cols-2 gap-2">
              <input
                className="field"
                placeholder="Kennzeichen"
                value={form.op_plate}
                onChange={set("op_plate")}
              />
              <input
                className="field"
                placeholder="Versicherung"
                value={form.op_insurance}
                onChange={set("op_insurance")}
              />
            </div>
          </div>
        )}

        {error && (
          <div className="text-[13px] rounded-input px-3 py-2 bg-rose-50 border border-rose-200 text-rose-700">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={saving || uploading > 0}
          className="w-full rounded-btn bg-signal text-white py-3 text-[14px] font-semibold inline-flex items-center justify-center gap-2 active:scale-[.99] disabled:opacity-60"
        >
          {saving && <Loader2 size={15} className="animate-spin" />}
          Schaden melden
        </button>
      </form>
    </div>
  );
};

const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <label className="block">
    <div className="data-label mb-1">{label}</div>
    {children}
  </label>
);

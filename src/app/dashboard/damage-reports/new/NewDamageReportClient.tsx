"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Camera, Loader2, Save, Trash2 } from "lucide-react";
import { THEME } from "@/lib/theme";
import type { Contract, Vehicle } from "@/lib/types";

type ContractLite = Pick<
  Contract,
  "id" | "contract_nr" | "plate" | "renter_name" | "vehicle_id" | "pickup_date" | "return_date"
>;

type FormState = {
  contract_id: string;
  vehicle_id: string;
  date: string;
  time: string;
  location: string;
  description: string;
  police_reference_nr: string;
  insurance_claim_nr: string;
  other_party_name: string;
  other_party_plate: string;
  other_party_insurance: string;
};

const todayIso = () => new Date().toISOString().slice(0, 10);

export const NewDamageReportClient = ({
  vehicles,
  contracts,
  initialContractId,
  initialVehicleId,
}: {
  vehicles: Vehicle[];
  contracts: ContractLite[];
  initialContractId: string | null;
  initialVehicleId: string | null;
}) => {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);

  const initial: FormState = {
    contract_id: initialContractId || "",
    vehicle_id:
      initialVehicleId ||
      (initialContractId
        ? contracts.find((c) => c.id === initialContractId)?.vehicle_id || ""
        : ""),
    date: todayIso(),
    time: "",
    location: "",
    description: "",
    police_reference_nr: "",
    insurance_claim_nr: "",
    other_party_name: "",
    other_party_plate: "",
    other_party_insurance: "",
  };

  const [data, setData] = useState<FormState>(initial);
  const [stagedPhotos, setStagedPhotos] = useState<File[]>([]);
  const [stagedPreviews, setStagedPreviews] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = (k: keyof FormState) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setData((d) => ({ ...d, [k]: e.target.value }));

  const vehicleLabel = (v: Vehicle) =>
    `${v.plate}${v.vehicle_type ? " · " + v.vehicle_type : ""}`;

  const contractLabel = (c: ContractLite) =>
    `${c.contract_nr} · ${c.plate} · ${c.renter_name}`;

  const pickContract = (id: string) => {
    setData((d) => {
      if (!id) return { ...d, contract_id: "" };
      const c = contracts.find((x) => x.id === id);
      return {
        ...d,
        contract_id: id,
        vehicle_id: d.vehicle_id || c?.vehicle_id || "",
      };
    });
  };

  const addPhotos = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const arr = Array.from(files);
    setStagedPhotos((prev) => [...prev, ...arr]);
    setStagedPreviews((prev) => [...prev, ...arr.map((f) => URL.createObjectURL(f))]);
    if (fileRef.current) fileRef.current.value = "";
  };

  const removeStaged = (idx: number) => {
    setStagedPhotos((prev) => prev.filter((_, i) => i !== idx));
    setStagedPreviews((prev) => {
      URL.revokeObjectURL(prev[idx]);
      return prev.filter((_, i) => i !== idx);
    });
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!data.date) {
      setError("Datum ist Pflichtfeld");
      return;
    }
    setSaving(true);

    const res = await fetch("/api/damage-reports", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      setSaving(false);
      const j = await res.json().catch(() => ({}));
      setError(j.error || "Speichern fehlgeschlagen");
      return;
    }
    const j = (await res.json()) as { damage_report: { id: string } };
    const reportId = j.damage_report.id;

    // Fotos sequenziell hochladen
    for (const file of stagedPhotos) {
      const fd = new FormData();
      fd.append("file", file);
      const up = await fetch(`/api/damage-reports/${reportId}/photos`, {
        method: "POST",
        body: fd,
      });
      if (!up.ok) {
        // Soft-Fail: Bericht ist trotzdem da, User kann später erneut hochladen
        setError("Mindestens ein Foto konnte nicht hochgeladen werden — Bericht wurde trotzdem gespeichert.");
      }
    }

    setSaving(false);
    router.push(`/dashboard/damage-reports/${reportId}`);
    router.refresh();
  };

  const sortedContracts = useMemo(
    () => [...contracts].slice(0, 200),
    [contracts]
  );

  return (
    <>
      <Link
        href="/dashboard/damage-reports"
        className="inline-flex items-center gap-1.5 text-sm text-stone-500 hover:text-stone-900 mb-4"
      >
        <ArrowLeft size={14} /> Zurück zur Liste
      </Link>

      <div className="font-display font-bold text-2xl tracking-tight">Neuer Schadensbericht</div>
      <p className="text-sm text-stone-500 mt-1">
        Datum, Ort, Beschreibung und Fotos. Optional: Vertrag/Fahrzeug zuordnen + Gegnerdaten.
      </p>

      <form onSubmit={submit} className="mt-6 rounded-2xl bg-white ring-1 ring-stone-200 p-6 space-y-6">
        <Section title="Zuordnung">
          <Field label="Vertrag (optional)">
            <select value={data.contract_id} onChange={(e) => pickContract(e.target.value)} className="input">
              <option value="">— kein Vertrag —</option>
              {sortedContracts.map((c) => (
                <option key={c.id} value={c.id}>
                  {contractLabel(c)}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Fahrzeug">
            <select value={data.vehicle_id} onChange={set("vehicle_id")} className="input">
              <option value="">— kein Fahrzeug —</option>
              {vehicles.map((v) => (
                <option key={v.id} value={v.id}>
                  {vehicleLabel(v)}
                </option>
              ))}
            </select>
          </Field>
        </Section>

        <Section title="Wann & Wo">
          <Field label="Datum *">
            <input
              type="date"
              required
              value={data.date}
              onChange={set("date")}
              className="input tabular-nums"
            />
          </Field>
          <Field label="Uhrzeit">
            <input
              type="time"
              value={data.time}
              onChange={set("time")}
              className="input tabular-nums"
            />
          </Field>
          <div className="sm:col-span-2">
            <Field label="Ort">
              <input
                value={data.location}
                onChange={set("location")}
                placeholder="Straße, PLZ, Ort"
                className="input"
              />
            </Field>
          </div>
          <div className="sm:col-span-2">
            <Field label="Beschreibung">
              <textarea
                value={data.description}
                onChange={set("description")}
                rows={3}
                placeholder="Hergang, betroffene Fahrzeugteile, Zeugen…"
                className="input resize-none"
              />
            </Field>
          </div>
        </Section>

        <Section title="Aktenzeichen">
          <Field label="Polizei-Aktenzeichen">
            <input
              value={data.police_reference_nr}
              onChange={set("police_reference_nr")}
              className="input tabular-nums"
            />
          </Field>
          <Field label="Versicherungs-Schadennr.">
            <input
              value={data.insurance_claim_nr}
              onChange={set("insurance_claim_nr")}
              className="input tabular-nums"
            />
          </Field>
        </Section>

        <Section title="Unfallgegner (optional)">
          <Field label="Name">
            <input
              value={data.other_party_name}
              onChange={set("other_party_name")}
              className="input"
            />
          </Field>
          <Field label="Kennzeichen">
            <input
              value={data.other_party_plate}
              onChange={set("other_party_plate")}
              className="input font-mono uppercase"
            />
          </Field>
          <div className="sm:col-span-2">
            <Field label="Versicherung">
              <input
                value={data.other_party_insurance}
                onChange={set("other_party_insurance")}
                placeholder="HUK Coburg, AZ-12345…"
                className="input"
              />
            </Field>
          </div>
        </Section>

        <Section title="Fotos">
          <div className="sm:col-span-2">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {stagedPreviews.map((src, i) => (
                <div
                  key={i}
                  className="relative aspect-square rounded-lg overflow-hidden bg-stone-100"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={src} alt={`Foto ${i + 1}`} className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => removeStaged(i)}
                    className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-white/90 backdrop-blur text-stone-700 hover:text-red-600 flex items-center justify-center shadow"
                  >
                    <Trash2 size={11} />
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="aspect-square rounded-lg border-2 border-dashed border-stone-200 flex flex-col items-center justify-center gap-1.5 text-stone-400 hover:text-teal-700 hover:border-teal-300 hover:bg-teal-50/40 transition"
              >
                <Camera size={20} />
                <span className="text-[11px] font-medium">Foto hinzufügen</span>
              </button>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={(e) => addPhotos(e.target.files)}
              />
            </div>
            {stagedPhotos.length === 0 && (
              <div className="text-xs text-stone-500 mt-2">
                Du kannst auch nach dem Speichern noch Fotos im Detail hinzufügen.
              </div>
            )}
          </div>
        </Section>

        {error && (
          <div className="text-sm text-red-700 bg-red-50 ring-1 ring-red-200 rounded-lg px-3 py-2">{error}</div>
        )}

        <div className="flex items-center justify-end">
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-1.5 text-white text-sm px-4 py-2 rounded-lg font-medium disabled:opacity-50"
            style={{ background: THEME.primary }}
          >
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            Bericht speichern
          </button>
        </div>

        <style jsx>{`
          .input {
            width: 100%;
            padding: 0.5rem 0.75rem;
            font-size: 0.875rem;
            border-radius: 0.5rem;
            outline: none;
            background: white;
            box-shadow: inset 0 0 0 1px rgb(231 229 228);
          }
          .input:focus {
            box-shadow: inset 0 0 0 1px rgb(168 162 158);
          }
        `}</style>
      </form>
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

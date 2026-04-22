"use client";

import { useState } from "react";
import { Loader2, Save } from "lucide-react";
import { THEME } from "@/lib/theme";
import type { Organization } from "@/lib/types";

export const SettingsClient = ({ org }: { org: Organization }) => {
  const [data, setData] = useState({
    name: org?.name || "",
    street: org?.street || "",
    zip: org?.zip || "",
    city: org?.city || "",
    phone: org?.phone || "",
    email: org?.email || "",
    tax_number: org?.tax_number || "",
    processing_fee: String(org?.processing_fee ?? 25),
  });
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const set = (k: keyof typeof data) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setData((d) => ({ ...d, [k]: e.target.value }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    setMsg(null);
    const res = await fetch("/api/org", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...data, processing_fee: Number(data.processing_fee) }),
    });
    setBusy(false);
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setErr(j.error || "Fehler beim Speichern");
      return;
    }
    setMsg("Gespeichert.");
  };

  return (
    <>
      <div className="font-display font-bold text-2xl tracking-tight">Einstellungen</div>
      <p className="text-sm text-stone-500 mt-1">
        Diese Daten erscheinen auf allen erstellten PDFs (Briefkopf, Rechnung, Anschreiben).
      </p>

      <form onSubmit={submit} className="mt-6 rounded-xl bg-white ring-1 ring-stone-200 p-6 space-y-5">
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="Firmenname *">
            <input required value={data.name} onChange={set("name")} className="input" />
          </Field>
          <Field label="Bearbeitungsgebühr (EUR)">
            <input
              type="number"
              step="0.01"
              min="0"
              value={data.processing_fee}
              onChange={set("processing_fee")}
              className="input font-mono"
            />
          </Field>
          <Field label="Straße">
            <input value={data.street} onChange={set("street")} className="input" />
          </Field>
          <div className="grid grid-cols-[100px_1fr] gap-3">
            <Field label="PLZ">
              <input value={data.zip} onChange={set("zip")} className="input font-mono" />
            </Field>
            <Field label="Ort">
              <input value={data.city} onChange={set("city")} className="input" />
            </Field>
          </div>
          <Field label="Telefon">
            <input value={data.phone} onChange={set("phone")} className="input font-mono" />
          </Field>
          <Field label="E-Mail">
            <input type="email" value={data.email} onChange={set("email")} className="input" />
          </Field>
          <Field label="USt-IdNr.">
            <input value={data.tax_number} onChange={set("tax_number")} className="input font-mono" />
          </Field>
        </div>

        {err && <div className="text-sm text-red-700 bg-red-50 ring-1 ring-red-200 rounded-lg px-3 py-2">{err}</div>}
        {msg && <div className="text-sm text-emerald-700 bg-emerald-50 ring-1 ring-emerald-200 rounded-lg px-3 py-2">{msg}</div>}

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={busy}
            className="inline-flex items-center gap-1.5 text-white text-sm px-4 py-2 rounded-lg font-medium"
            style={{ background: THEME.primary }}
          >
            {busy ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Speichern
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
    </>
  );
};

const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <label className="block">
    <div className="text-[11px] uppercase tracking-wider text-stone-500 font-medium mb-1">{label}</div>
    {children}
  </label>
);

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2, Save } from "lucide-react";
import type { Customer } from "@/lib/types";

const inputCls =
  "w-full h-11 px-3.5 rounded-xl bg-white ring-1 ring-zinc-200 text-[14.5px] text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500 transition-shadow";

export const ProfileClient = ({ initial }: { initial: Customer }) => {
  const router = useRouter();
  const [data, setData] = useState({
    first_name: initial.first_name ?? "",
    last_name: initial.last_name ?? "",
    email: initial.email ?? "",
    phone: initial.phone ?? "",
    street: initial.street ?? "",
    house_nr: initial.house_nr ?? "",
    zip: initial.zip ?? "",
    city: initial.city ?? "",
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = (k: keyof typeof data) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setData((d) => ({ ...d, [k]: e.target.value }));
    setSaved(false);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      const res = await fetch("/api/portal/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const j = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string };
      if (!res.ok || !j.ok) {
        setError(j.error ?? "Speichern fehlgeschlagen");
        setSaving(false);
        return;
      }
      setSaved(true);
      router.refresh();
    } catch {
      setError("Netzwerkfehler");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="px-5 py-3">
      <h1 className="font-display text-[22px] tracking-tight font-medium text-zinc-900 mb-3">
        Profil
      </h1>

      <form onSubmit={submit} className="rounded-2xl bg-white ring-1 ring-zinc-200 p-5 space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Vorname">
            <input className={inputCls} value={data.first_name} onChange={set("first_name")} />
          </Field>
          <Field label="Nachname">
            <input className={inputCls} value={data.last_name} onChange={set("last_name")} required />
          </Field>
        </div>

        <Field label="E-Mail">
          <input
            type="email"
            className={inputCls}
            value={data.email}
            onChange={set("email")}
          />
        </Field>

        <Field label="Telefon">
          <input
            type="tel"
            className={inputCls}
            value={data.phone}
            onChange={set("phone")}
            inputMode="tel"
          />
        </Field>

        <div className="grid grid-cols-[1fr_100px] gap-3">
          <Field label="Straße">
            <input className={inputCls} value={data.street} onChange={set("street")} />
          </Field>
          <Field label="Hausnr.">
            <input className={inputCls} value={data.house_nr} onChange={set("house_nr")} />
          </Field>
        </div>

        <div className="grid grid-cols-[100px_1fr] gap-3">
          <Field label="PLZ">
            <input className={inputCls} value={data.zip} onChange={set("zip")} inputMode="numeric" />
          </Field>
          <Field label="Ort">
            <input className={inputCls} value={data.city} onChange={set("city")} />
          </Field>
        </div>

        {error && (
          <div className="text-sm rounded-lg px-3 py-2 bg-rose-50 ring-1 ring-rose-200 text-rose-700">
            {error}
          </div>
        )}

        <div className="flex items-center justify-end gap-3 pt-1">
          {saved && (
            <span className="inline-flex items-center gap-1 text-xs text-emerald-700">
              <Check size={13} /> Gespeichert
            </span>
          )}
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-1.5 h-10 px-5 rounded-full bg-zinc-900 text-white text-[14px] font-medium hover:bg-zinc-800 disabled:opacity-40"
          >
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            Speichern
          </button>
        </div>
      </form>
    </div>
  );
};

const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <label className="block">
    <div className="text-[11.5px] uppercase tracking-wider text-zinc-500 font-medium mb-1">
      {label}
    </div>
    {children}
  </label>
);

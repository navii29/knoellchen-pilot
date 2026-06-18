"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2, Save } from "lucide-react";
import type { Customer } from "@/lib/types";
import { Button } from "@/components/ui/Button";

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
    <div className="px-5 py-4 space-y-4">
      <h1 className="font-display text-[22px] tracking-tightest font-bold text-ink px-1">
        Profil
      </h1>

      <form onSubmit={submit} className="glass-card glass-sheen rounded-card p-5 space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Vorname">
            <input className="field" value={data.first_name} onChange={set("first_name")} />
          </Field>
          <Field label="Nachname">
            <input className="field" value={data.last_name} onChange={set("last_name")} required />
          </Field>
        </div>

        <Field label="E-Mail">
          <input
            type="email"
            className="field"
            value={data.email}
            onChange={set("email")}
          />
        </Field>

        <Field label="Telefon">
          <input
            type="tel"
            className="field"
            value={data.phone}
            onChange={set("phone")}
            inputMode="tel"
          />
        </Field>

        <div className="grid grid-cols-[1fr_100px] gap-3">
          <Field label="Straße">
            <input className="field" value={data.street} onChange={set("street")} />
          </Field>
          <Field label="Hausnr.">
            <input className="field" value={data.house_nr} onChange={set("house_nr")} />
          </Field>
        </div>

        <div className="grid grid-cols-[100px_1fr] gap-3">
          <Field label="PLZ">
            <input className="field" value={data.zip} onChange={set("zip")} inputMode="numeric" />
          </Field>
          <Field label="Ort">
            <input className="field" value={data.city} onChange={set("city")} />
          </Field>
        </div>

        {error && (
          <div className="text-[13px] rounded-input px-3 py-2 bg-rose-50 border border-rose-200 text-rose-700">
            {error}
          </div>
        )}

        <div className="flex items-center justify-end gap-3 pt-1">
          {saved && (
            <span className="inline-flex items-center gap-1 text-[12px] text-ink-soft">
              <Check size={13} /> Gespeichert
            </span>
          )}
          <Button type="submit" variant="signal" size="md" disabled={saving}>
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            Speichern
          </Button>
        </div>
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

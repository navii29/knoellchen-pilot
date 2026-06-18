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
    birthday: initial.birthday ?? "",
    license_nr: initial.license_nr ?? "",
    license_class: initial.license_class ?? "",
    license_expiry: initial.license_expiry ?? "",
  });
  const [marketing, setMarketing] = useState(!!initial.marketing_opt_in);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set =
    (k: keyof typeof data) =>
    (e: React.ChangeEvent<HTMLInputElement>) => {
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
        body: JSON.stringify({ ...data, marketing_opt_in: marketing }),
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
      <h1 className="font-display text-[22px] tracking-tightest font-bold text-ink px-1">Profil</h1>

      <form onSubmit={submit} className="glass-card glass-sheen rounded-card p-5 space-y-3">
        <div className="kicker text-ink-muted">Persönliche Daten</div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Vorname">
            <input className="field" value={data.first_name} onChange={set("first_name")} />
          </Field>
          <Field label="Nachname">
            <input className="field" value={data.last_name} onChange={set("last_name")} required />
          </Field>
        </div>
        <Field label="E-Mail">
          <input type="email" className="field" value={data.email} onChange={set("email")} />
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
        <Field label="Geburtsdatum">
          <input type="date" className="field" value={data.birthday} onChange={set("birthday")} />
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

        <div className="kicker text-ink-muted pt-2">Führerschein</div>
        <div className="grid grid-cols-[1fr_90px] gap-3">
          <Field label="Nummer">
            <input className="field" value={data.license_nr} onChange={set("license_nr")} />
          </Field>
          <Field label="Klasse">
            <input className="field" value={data.license_class} onChange={set("license_class")} />
          </Field>
        </div>
        <Field label="Gültig bis">
          <input
            type="date"
            className="field"
            value={data.license_expiry}
            onChange={set("license_expiry")}
          />
        </Field>

        <label className="flex items-start gap-2.5 pt-2 cursor-pointer">
          <input
            type="checkbox"
            checked={marketing}
            onChange={(e) => {
              setMarketing(e.target.checked);
              setSaved(false);
            }}
            className="mt-0.5 w-4 h-4 accent-signal"
          />
          <span className="text-[12px] text-ink-soft leading-snug">
            Ich möchte Angebote &amp; Neuigkeiten der Vermietung per E-Mail erhalten (jederzeit
            widerrufbar).
          </span>
        </label>

        {error && (
          <div className="text-[13px] rounded-input px-3 py-2 bg-rose-50 border border-rose-200 text-rose-700">
            {error}
          </div>
        )}

        <div className="flex items-center justify-end gap-3 pt-1">
          {saved && (
            <span className="inline-flex items-center gap-1 text-[12px] text-emerald-700">
              <Check size={13} /> Gespeichert
            </span>
          )}
          <Button type="submit" variant="signal" size="md" disabled={saving}>
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            Speichern
          </Button>
        </div>
      </form>

      <PasswordSection />
    </div>
  );
};

const PasswordSection = () => {
  const [oldPw, setOldPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const res = await fetch("/api/portal/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ old_password: oldPw, new_password: newPw }),
      });
      const j = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string };
      if (!res.ok || !j.ok) {
        setError(j.error ?? "Fehlgeschlagen");
        return;
      }
      setDone(true);
      setOldPw("");
      setNewPw("");
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="glass-card rounded-card p-5 space-y-3">
      <div className="kicker text-ink-muted">Passwort ändern</div>
      <Field label="Aktuelles Passwort">
        <input
          type="password"
          className="field"
          value={oldPw}
          onChange={(e) => {
            setOldPw(e.target.value);
            setDone(false);
          }}
          autoComplete="current-password"
        />
      </Field>
      <Field label="Neues Passwort (min. 8 Zeichen)">
        <input
          type="password"
          className="field"
          value={newPw}
          onChange={(e) => {
            setNewPw(e.target.value);
            setDone(false);
          }}
          autoComplete="new-password"
          minLength={8}
        />
      </Field>
      {error && (
        <div className="text-[13px] rounded-input px-3 py-2 bg-rose-50 border border-rose-200 text-rose-700">
          {error}
        </div>
      )}
      <div className="flex items-center justify-end gap-3">
        {done && (
          <span className="inline-flex items-center gap-1 text-[12px] text-emerald-700">
            <Check size={13} /> Geändert
          </span>
        )}
        <Button type="submit" variant="ghost" size="md" disabled={busy || newPw.length < 8}>
          {busy && <Loader2 size={14} className="animate-spin" />}
          Passwort ändern
        </Button>
      </div>
    </form>
  );
};

const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <label className="block">
    <div className="data-label mb-1">{label}</div>
    {children}
  </label>
);

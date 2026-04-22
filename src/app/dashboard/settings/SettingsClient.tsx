"use client";

import { useState } from "react";
import { Check, ChevronDown, Copy, Loader2, Save, Send } from "lucide-react";
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
    sender_name: org?.sender_name || "",
    sender_email: org?.sender_email || "",
    email_automation_enabled: org?.email_automation_enabled || false,
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
        Diese Daten erscheinen auf allen erstellten PDFs und gesendeten E-Mails.
      </p>

      <form onSubmit={submit} className="mt-6 space-y-6">
        <Section title="Stammdaten" subtitle="Briefkopf für PDFs und E-Mails">
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
        </Section>

        <Section title="E-Mail-Automation" subtitle="Strafzettel automatisch empfangen + Dokumente versenden">
          <InboundCard inboundEmail={org.inbound_email} />

          <div className="grid sm:grid-cols-2 gap-4 mt-5">
            <Field label="Absender-Name">
              <input
                value={data.sender_name}
                onChange={set("sender_name")}
                placeholder={data.name || "Stadtflotte München"}
                className="input"
              />
            </Field>
            <Field label="Absender-E-Mail">
              <input
                type="email"
                value={data.sender_email}
                onChange={set("sender_email")}
                placeholder="info@ihre-firma.de"
                className="input font-mono"
              />
            </Field>
          </div>

          <p className="mt-3 text-xs text-stone-500">
            E-Mails an Mieter und Behörden werden von dieser Adresse gesendet.
          </p>

          <label className="mt-5 flex items-start gap-3 p-3 rounded-lg ring-1 ring-stone-200 cursor-pointer">
            <input
              type="checkbox"
              checked={data.email_automation_enabled}
              onChange={(e) =>
                setData((d) => ({ ...d, email_automation_enabled: e.target.checked }))
              }
              className="mt-0.5 w-4 h-4 accent-teal-600"
            />
            <div className="flex-1">
              <div className="font-medium text-sm flex items-center gap-1.5">
                <Send size={13} /> E-Mail-Automation aktivieren
              </div>
              <div className="text-xs text-stone-500 mt-1">
                Wenn aktiviert: Nach erfolgreicher Auslesung + Match werden Mails als Draft vorbereitet.
                Versand erfolgt nach manuellem Klick auf &bdquo;An Mieter senden&ldquo; / &bdquo;An Behörde senden&ldquo; auf der Detailseite.
              </div>
            </div>
          </label>
        </Section>

        {err && <div className="text-sm text-red-700 bg-red-50 ring-1 ring-red-200 rounded-lg px-3 py-2">{err}</div>}
        {msg && (
          <div className="text-sm text-emerald-700 bg-emerald-50 ring-1 ring-emerald-200 rounded-lg px-3 py-2">
            {msg}
          </div>
        )}

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

const Section = ({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) => (
  <div className="rounded-xl bg-white ring-1 ring-stone-200 p-6">
    <div className="font-display font-semibold">{title}</div>
    {subtitle && <p className="text-xs text-stone-500 mt-0.5">{subtitle}</p>}
    <div className="mt-5">{children}</div>
  </div>
);

const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <label className="block">
    <div className="text-[11px] uppercase tracking-wider text-stone-500 font-medium mb-1">{label}</div>
    {children}
  </label>
);

const InboundCard = ({ inboundEmail }: { inboundEmail: string | null }) => {
  const [copied, setCopied] = useState(false);
  const [showHelp, setShowHelp] = useState(false);

  const copy = async () => {
    if (!inboundEmail) return;
    await navigator.clipboard.writeText(inboundEmail);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!inboundEmail) {
    return (
      <div className="rounded-lg ring-1 ring-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
        Diese Organisation hat noch keine Inbound-Adresse. Bitte Migration{" "}
        <span className="font-mono">002_email_automation.sql</span> einspielen und Org neu speichern.
      </div>
    );
  }

  return (
    <div className="rounded-lg ring-1 ring-stone-200 bg-stone-50 p-4">
      <div className="text-[11px] uppercase tracking-wider text-stone-500 font-medium mb-2">
        Ihre Strafzettel-Adresse
      </div>
      <div className="flex items-center gap-2">
        <code className="flex-1 px-3 py-2 rounded-md bg-white ring-1 ring-stone-200 font-mono text-sm">
          {inboundEmail}
        </code>
        <button
          type="button"
          onClick={copy}
          className="inline-flex items-center gap-1.5 text-sm px-3 py-2 rounded-md ring-1 ring-stone-200 bg-white hover:bg-stone-50"
        >
          {copied ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
          {copied ? "Kopiert" : "Kopieren"}
        </button>
      </div>
      <button
        type="button"
        onClick={() => setShowHelp((v) => !v)}
        className="mt-3 inline-flex items-center gap-1 text-xs text-stone-600 hover:text-stone-900"
      >
        <ChevronDown
          size={12}
          className="transition-transform"
          style={{ transform: showHelp ? "rotate(180deg)" : "" }}
        />
        So richten Sie die Weiterleitung ein
      </button>
      {showHelp && (
        <div className="mt-3 text-xs text-stone-600 leading-relaxed space-y-2 bg-white rounded-md p-3 ring-1 ring-stone-200">
          <div>
            <strong>Gmail:</strong> Einstellungen → Weiterleitung und POP/IMAP → Weiterleitungsadresse
            hinzufügen → <span className="font-mono">{inboundEmail}</span> → bestätigen → Filter erstellen
            der alle Mails von Behörden weiterleitet.
          </div>
          <div>
            <strong>Outlook:</strong> Einstellungen → Mail → Weiterleitung → Weiterleiten an{" "}
            <span className="font-mono">{inboundEmail}</span>.
          </div>
          <div className="text-stone-500">
            Tipp: Nutzen Sie eine separate Weiterleitungsregel nur für Behörden-Absender, damit private
            Mails nicht aus Versehen verarbeitet werden.
          </div>
        </div>
      )}
    </div>
  );
};

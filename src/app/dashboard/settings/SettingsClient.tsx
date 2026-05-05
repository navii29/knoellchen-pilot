"use client";

import { useState } from "react";
import {
  Calculator,
  Check,
  ChevronDown,
  Copy,
  Loader2,
  Lock,
  Save,
  Send,
  Wifi,
} from "lucide-react";
import { THEME } from "@/lib/theme";
import type { Organization } from "@/lib/types";

export const SettingsClient = ({
  org,
  lexofficeHasKey,
}: {
  org: Organization;
  lexofficeHasKey: boolean;
}) => {
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
    lexoffice_enabled: org?.lexoffice_enabled || false,
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
            <Field label="Bearbeitungsgebühr (netto)">
              <div className="relative">
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={data.processing_fee}
                  onChange={set("processing_fee")}
                  className="input tabular-nums pr-10"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-stone-400">
                  € netto
                </span>
              </div>
              <div className="text-[11px] text-stone-500 mt-1">
                Standardwert für neue Strafzettel. Im Strafzettel-Detail veränderbar — wird mit 19% MwSt versteuert.
              </div>
            </Field>
            <Field label="Straße">
              <input value={data.street} onChange={set("street")} className="input" />
            </Field>
            <div className="grid grid-cols-[100px_1fr] gap-3">
              <Field label="PLZ">
                <input value={data.zip} onChange={set("zip")} className="input tabular-nums" />
              </Field>
              <Field label="Ort">
                <input value={data.city} onChange={set("city")} className="input" />
              </Field>
            </div>
            <Field label="Telefon">
              <input value={data.phone} onChange={set("phone")} className="input tabular-nums" />
            </Field>
            <Field label="E-Mail">
              <input type="email" value={data.email} onChange={set("email")} className="input" />
            </Field>
            <Field label="USt-IdNr.">
              <input value={data.tax_number} onChange={set("tax_number")} className="input tabular-nums" />
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
                className="input tabular-nums"
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

        <Section
          title="Buchhaltung"
          subtitle="Mietverträge und Strafzettel-Rechnungen direkt in LexOffice anlegen."
        >
          <LexOfficeCard
            hasKey={lexofficeHasKey}
            enabled={data.lexoffice_enabled}
            onToggle={(v) => setData((d) => ({ ...d, lexoffice_enabled: v }))}
          />
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

const LexOfficeCard = ({
  hasKey,
  enabled,
  onToggle,
}: {
  hasKey: boolean;
  enabled: boolean;
  onToggle: (v: boolean) => void;
}) => {
  const [keyInput, setKeyInput] = useState("");
  const [savingKey, setSavingKey] = useState(false);
  const [keyMsg, setKeyMsg] = useState<string | null>(null);
  const [keyErr, setKeyErr] = useState<string | null>(null);
  const [hasKeyLocal, setHasKeyLocal] = useState(hasKey);

  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{
    company_name?: string;
    organization_id?: string;
    tax_number?: string | null;
    vat_id?: string | null;
  } | null>(null);
  const [testErr, setTestErr] = useState<string | null>(null);

  const saveKey = async () => {
    setKeyErr(null);
    setKeyMsg(null);
    setSavingKey(true);
    try {
      const res = await fetch("/api/org", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lexoffice_api_key: keyInput.trim() || null }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) {
        setKeyErr(j.error ?? "Speichern fehlgeschlagen.");
        return;
      }
      setKeyInput("");
      setHasKeyLocal(true);
      setKeyMsg("API-Key gespeichert.");
    } finally {
      setSavingKey(false);
    }
  };

  const removeKey = async () => {
    if (!confirm("API-Key wirklich entfernen?")) return;
    setSavingKey(true);
    try {
      const res = await fetch("/api/org", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lexoffice_api_key: null }),
      });
      if (res.ok) {
        setHasKeyLocal(false);
        setTestResult(null);
        setKeyMsg("API-Key entfernt.");
      }
    } finally {
      setSavingKey(false);
    }
  };

  const testConnection = async () => {
    setTestErr(null);
    setTestResult(null);
    setTesting(true);
    try {
      const res = await fetch("/api/org/lexoffice/test", { method: "POST" });
      const j = await res.json().catch(() => ({}));
      if (!res.ok || !j.ok) {
        setTestErr(j.error ?? "Verbindung fehlgeschlagen.");
        return;
      }
      setTestResult(j.profile);
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="rounded-lg ring-1 ring-stone-200 bg-stone-50 p-4">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2 text-sm font-medium text-stone-800">
            <Lock size={14} className="text-stone-500" />
            LexOffice API-Key
            {hasKeyLocal && (
              <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200">
                <Check size={11} /> Hinterlegt
              </span>
            )}
          </div>
          {hasKeyLocal && (
            <button
              type="button"
              onClick={removeKey}
              disabled={savingKey}
              className="text-xs text-stone-500 hover:text-rose-700"
            >
              Entfernen
            </button>
          )}
        </div>

        <div className="mt-3 flex items-center gap-2">
          <input
            type="password"
            value={keyInput}
            onChange={(e) => setKeyInput(e.target.value)}
            placeholder={hasKeyLocal ? "•••••••••••••••• (zum Ersetzen neuen Key eingeben)" : "API-Key aus LexOffice einfügen"}
            className="flex-1 px-3 py-2 rounded-md text-sm bg-white outline-none"
            style={{ boxShadow: "inset 0 0 0 1px rgb(231 229 228)" }}
            autoComplete="off"
          />
          <button
            type="button"
            onClick={saveKey}
            disabled={savingKey || keyInput.trim().length === 0}
            className="inline-flex items-center gap-1.5 text-sm px-3 py-2 rounded-md ring-1 ring-stone-200 bg-white hover:bg-stone-100 disabled:opacity-40"
          >
            {savingKey ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
            Speichern
          </button>
        </div>

        <div className="mt-2 text-[11px] text-stone-500">
          Den API-Key finden Sie in LexOffice unter Mein Konto → Öffentliche API → Schlüssel erstellen. Er wird nur serverseitig verwendet und niemals an den Browser gesendet.
        </div>

        {keyMsg && (
          <div className="mt-2 text-xs text-emerald-700">{keyMsg}</div>
        )}
        {keyErr && <div className="mt-2 text-xs text-rose-700">{keyErr}</div>}
      </div>

      <div className="rounded-lg ring-1 ring-stone-200 p-4">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2 text-sm font-medium text-stone-800">
            <Wifi size={14} className="text-stone-500" />
            Verbindung testen
          </div>
          <button
            type="button"
            onClick={testConnection}
            disabled={!hasKeyLocal || testing}
            className="inline-flex items-center gap-1.5 text-sm px-3 py-2 rounded-md ring-1 ring-stone-200 bg-white hover:bg-stone-50 disabled:opacity-40"
          >
            {testing ? <Loader2 size={13} className="animate-spin" /> : <Wifi size={13} />}
            Test
          </button>
        </div>
        {!hasKeyLocal && (
          <div className="mt-2 text-xs text-stone-500">
            Erst API-Key speichern, dann Verbindung prüfen.
          </div>
        )}
        {testErr && (
          <div className="mt-3 text-sm rounded-md px-3 py-2 bg-rose-50 ring-1 ring-rose-200 text-rose-700">
            {testErr}
          </div>
        )}
        {testResult && (
          <div className="mt-3 text-sm rounded-md px-3 py-2 bg-emerald-50 ring-1 ring-emerald-200 text-emerald-800">
            <div className="font-medium flex items-center gap-1.5">
              <Check size={14} /> Verbunden mit {testResult.company_name}
            </div>
            <div className="mt-1 text-xs opacity-90 space-y-0.5">
              {testResult.tax_number && <div>Steuernummer: {testResult.tax_number}</div>}
              {testResult.vat_id && <div>USt-IdNr.: {testResult.vat_id}</div>}
              <div className="font-mono text-[11px] opacity-70">
                Org-ID: {testResult.organization_id}
              </div>
            </div>
          </div>
        )}
      </div>

      <label className="flex items-start gap-3 p-3 rounded-lg ring-1 ring-stone-200 cursor-pointer">
        <input
          type="checkbox"
          checked={enabled}
          onChange={(e) => onToggle(e.target.checked)}
          disabled={!hasKeyLocal}
          className="mt-0.5 w-4 h-4 accent-teal-600 disabled:opacity-40"
        />
        <div className="flex-1">
          <div className="font-medium text-sm flex items-center gap-1.5">
            <Calculator size={13} /> LexOffice-Übertragung aktivieren
          </div>
          <div className="text-xs text-stone-500 mt-1">
            Wenn aktiviert: An Verträgen und Strafzetteln erscheint ein Button „An LexOffice übertragen“. Übertragene Dokumente werden in LexOffice als finalisierte Rechnungen angelegt und sind dort unveränderlich.
          </div>
        </div>
      </label>
    </div>
  );
};

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

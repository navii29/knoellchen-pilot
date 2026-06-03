"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Calculator,
  Check,
  ChevronDown,
  ChevronRight,
  Copy,
  FileSignature,
  Image as ImageIcon,
  Loader2,
  Lock,
  MapPin,
  RotateCcw,
  Save,
  Send,
  Trash2,
  TrendingUp,
  Upload,
  Wifi,
} from "lucide-react";
import { DEFAULT_RENTAL_TERMS } from "@/lib/rental-terms";
import { THEME } from "@/lib/theme";
import type { Organization } from "@/lib/types";

export const SettingsClient = ({
  org,
  lexofficeHasKey,
  echoesHasKey,
}: {
  org: Organization;
  lexofficeHasKey: boolean;
  echoesHasKey: boolean;
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
    echoes_account_id: org?.echoes_account_id || "",
    echoes_enabled: org?.echoes_enabled || false,
    rental_terms: org?.rental_terms || DEFAULT_RENTAL_TERMS,
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
      <p className="text-sm text-zinc-500 mt-1">
        Diese Daten erscheinen auf allen erstellten PDFs und gesendeten E-Mails.
      </p>

      <form onSubmit={submit} className="mt-6 space-y-6">
        <Section title="Branding" subtitle="Logo für PDFs, Briefkopf und Kundenportal">
          <BrandingCard initialLogoPath={org.logo_path} />
        </Section>

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
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-zinc-400">
                  € netto
                </span>
              </div>
              <div className="text-[11px] text-zinc-500 mt-1">
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

          <p className="mt-3 text-xs text-zinc-500">
            E-Mails an Mieter und Behörden werden von dieser Adresse gesendet.
          </p>

          <label className="mt-5 flex items-start gap-3 p-3 rounded-lg ring-1 ring-zinc-200 cursor-pointer">
            <input
              type="checkbox"
              checked={data.email_automation_enabled}
              onChange={(e) =>
                setData((d) => ({ ...d, email_automation_enabled: e.target.checked }))
              }
              className="mt-0.5 w-4 h-4 accent-indigo-600"
            />
            <div className="flex-1">
              <div className="font-medium text-sm flex items-center gap-1.5">
                <Send size={13} /> E-Mail-Automation aktivieren
              </div>
              <div className="text-xs text-zinc-500 mt-1">
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

        <Section
          title="GPS-Tracking"
          subtitle="Aktuelle Fahrzeugpositionen über Echoes.solutions abrufen."
        >
          <EchoesCard
            hasKey={echoesHasKey}
            accountId={data.echoes_account_id}
            enabled={data.echoes_enabled}
            onAccountChange={(v) =>
              setData((d) => ({ ...d, echoes_account_id: v }))
            }
            onToggle={(v) => setData((d) => ({ ...d, echoes_enabled: v }))}
          />
        </Section>

        <Link
          href="/dashboard/settings/pricing"
          className="rounded-xl bg-white ring-1 ring-zinc-200 p-6 hover:ring-zinc-300 transition flex items-center gap-4 group"
        >
          <div className="w-11 h-11 rounded-xl bg-indigo-50 ring-1 ring-indigo-200 flex items-center justify-center text-indigo-700 shrink-0">
            <TrendingUp size={18} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-display font-semibold text-zinc-900">
              Preisregeln & Revenue Management
            </div>
            <div className="text-xs text-zinc-500 mt-0.5 max-w-xl">
              Definiere Saison-, Wochentag- und Nachfrage-Aufschläge. Die App
              schlägt bei jedem Vertrag den optimalen Tagespreis vor.
            </div>
          </div>
          <ChevronRight
            size={16}
            className="text-zinc-400 group-hover:text-zinc-700 transition shrink-0"
          />
        </Link>

        <Link
          href="/dashboard/settings/special-terms"
          className="rounded-xl bg-white ring-1 ring-zinc-200 p-6 hover:ring-zinc-300 transition flex items-center gap-4 group"
        >
          <div className="w-11 h-11 rounded-xl bg-amber-50 ring-1 ring-amber-200 flex items-center justify-center text-amber-700 shrink-0">
            <FileSignature size={18} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-display font-semibold text-zinc-900">
              Sondervereinbarungen-Textbausteine
            </div>
            <div className="text-xs text-zinc-500 mt-0.5 max-w-xl">
              Vordefinierte Vereinbarungen, die bei der Vertragsanlage per
              Checkbox ausgewählt werden und auf Seite 3 des Mietvertrags
              erscheinen.
            </div>
          </div>
          <ChevronRight
            size={16}
            className="text-zinc-400 group-hover:text-zinc-700 transition shrink-0"
          />
        </Link>

        <Section
          title="Mietbedingungen (AGB)"
          subtitle="Diese Bedingungen erscheinen auf Seite 2 jedes generierten Mietvertrags."
        >
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-xs text-zinc-500">
                <FileSignature size={13} />
                {data.rental_terms.length.toLocaleString("de-DE")} Zeichen
              </div>
              <button
                type="button"
                onClick={() => {
                  if (
                    data.rental_terms !== DEFAULT_RENTAL_TERMS &&
                    !confirm(
                      "Aktuellen Text durch Standard-AGB ersetzen? Deine Änderungen gehen verloren."
                    )
                  )
                    return;
                  setData((d) => ({ ...d, rental_terms: DEFAULT_RENTAL_TERMS }));
                }}
                className="inline-flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-900"
              >
                <RotateCcw size={11} /> Standard wiederherstellen
              </button>
            </div>
            <textarea
              value={data.rental_terms}
              onChange={(e) =>
                setData((d) => ({ ...d, rental_terms: e.target.value }))
              }
              rows={18}
              className="input font-mono text-[12.5px] leading-[1.55] resize-y"
              spellCheck={false}
            />
            <div className="text-[11px] text-zinc-500">
              Diese Vorlage ist ein Standard-Entwurf — bitte vor Live-Gang einmal von einem Anwalt prüfen lassen.
            </div>
          </div>
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
  <div className="rounded-xl bg-white ring-1 ring-zinc-200 p-6">
    <div className="font-display font-semibold">{title}</div>
    {subtitle && <p className="text-xs text-zinc-500 mt-0.5">{subtitle}</p>}
    <div className="mt-5">{children}</div>
  </div>
);

const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <label className="block">
    <div className="text-[11px] uppercase tracking-wider text-zinc-500 font-medium mb-1">{label}</div>
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
      <div className="rounded-lg ring-1 ring-zinc-200 bg-zinc-50 p-4">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2 text-sm font-medium text-zinc-800">
            <Lock size={14} className="text-zinc-500" />
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
              className="text-xs text-zinc-500 hover:text-rose-700"
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
            className="inline-flex items-center gap-1.5 text-sm px-3 py-2 rounded-md ring-1 ring-zinc-200 bg-white hover:bg-zinc-100 disabled:opacity-40"
          >
            {savingKey ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
            Speichern
          </button>
        </div>

        <div className="mt-2 text-[11px] text-zinc-500">
          Den API-Key finden Sie in LexOffice unter Mein Konto → Öffentliche API → Schlüssel erstellen. Er wird nur serverseitig verwendet und niemals an den Browser gesendet.
        </div>

        {keyMsg && (
          <div className="mt-2 text-xs text-emerald-700">{keyMsg}</div>
        )}
        {keyErr && <div className="mt-2 text-xs text-rose-700">{keyErr}</div>}
      </div>

      <div className="rounded-lg ring-1 ring-zinc-200 p-4">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2 text-sm font-medium text-zinc-800">
            <Wifi size={14} className="text-zinc-500" />
            Verbindung testen
          </div>
          <button
            type="button"
            onClick={testConnection}
            disabled={!hasKeyLocal || testing}
            className="inline-flex items-center gap-1.5 text-sm px-3 py-2 rounded-md ring-1 ring-zinc-200 bg-white hover:bg-zinc-50 disabled:opacity-40"
          >
            {testing ? <Loader2 size={13} className="animate-spin" /> : <Wifi size={13} />}
            Test
          </button>
        </div>
        {!hasKeyLocal && (
          <div className="mt-2 text-xs text-zinc-500">
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

      <label className="flex items-start gap-3 p-3 rounded-lg ring-1 ring-zinc-200 cursor-pointer">
        <input
          type="checkbox"
          checked={enabled}
          onChange={(e) => onToggle(e.target.checked)}
          disabled={!hasKeyLocal}
          className="mt-0.5 w-4 h-4 accent-indigo-600 disabled:opacity-40"
        />
        <div className="flex-1">
          <div className="font-medium text-sm flex items-center gap-1.5">
            <Calculator size={13} /> LexOffice-Übertragung aktivieren
          </div>
          <div className="text-xs text-zinc-500 mt-1">
            Wenn aktiviert: An Verträgen und Strafzetteln erscheint ein Button „An LexOffice übertragen“. Übertragene Dokumente werden in LexOffice als finalisierte Rechnungen angelegt und sind dort unveränderlich. Neue Fahrzeuge werden automatisch als Artikel in LexOffice angelegt.
          </div>
        </div>
      </label>

      <VehicleBulkSync disabled={!hasKeyLocal || !enabled} />
    </div>
  );
};

const VehicleBulkSync = ({ disabled }: { disabled: boolean }) => {
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<
    | { total: number; synced: number; failed: number; failed_plates?: string[] }
    | null
  >(null);
  const [err, setErr] = useState<string | null>(null);

  const run = async () => {
    setErr(null);
    setResult(null);
    setRunning(true);
    try {
      const res = await fetch("/api/lexoffice/sync-vehicles", { method: "POST" });
      const j = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        total?: number;
        synced?: number;
        failed?: number;
        failed_plates?: string[];
        error?: string;
      };
      if (!res.ok || !j.ok) {
        setErr(j.error ?? "Synchronisation fehlgeschlagen.");
        return;
      }
      setResult({
        total: j.total ?? 0,
        synced: j.synced ?? 0,
        failed: j.failed ?? 0,
        failed_plates: j.failed_plates,
      });
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="rounded-lg ring-1 ring-zinc-200 p-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2 text-sm font-medium text-zinc-800">
          <Calculator size={14} className="text-zinc-500" />
          Fahrzeuge nach LexOffice synchronisieren
        </div>
        <button
          type="button"
          onClick={run}
          disabled={disabled || running}
          className="inline-flex items-center gap-1.5 text-sm px-3 py-2 rounded-md ring-1 ring-zinc-200 bg-white hover:bg-zinc-50 disabled:opacity-40"
        >
          {running ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
          Jetzt synchronisieren
        </button>
      </div>
      <div className="mt-2 text-xs text-zinc-500">
        Legt alle noch nicht übertragenen aktiven Fahrzeuge als Artikel
        (Dienstleistung „Tag“) in LexOffice an.
      </div>
      {result && (
        <div className="mt-3 text-sm rounded-md px-3 py-2 bg-emerald-50 ring-1 ring-emerald-200 text-emerald-800">
          <div className="font-medium flex items-center gap-1.5">
            <Check size={14} /> {result.synced} von {result.total} Fahrzeugen synchronisiert
          </div>
          {result.failed > 0 && result.failed_plates?.length ? (
            <div className="mt-1 text-xs">
              Fehlgeschlagen: {result.failed_plates.join(", ")}
            </div>
          ) : null}
          {result.total === 0 && (
            <div className="mt-1 text-xs opacity-90">
              Keine Fahrzeuge offen — alles bereits synchronisiert.
            </div>
          )}
        </div>
      )}
      {err && (
        <div className="mt-3 text-sm rounded-md px-3 py-2 bg-rose-50 ring-1 ring-rose-200 text-rose-700">
          {err}
        </div>
      )}
    </div>
  );
};

const EchoesCard = ({
  hasKey,
  accountId,
  enabled,
  onAccountChange,
  onToggle,
}: {
  hasKey: boolean;
  accountId: string;
  enabled: boolean;
  onAccountChange: (v: string) => void;
  onToggle: (v: boolean) => void;
}) => {
  const [keyInput, setKeyInput] = useState("");
  const [savingKey, setSavingKey] = useState(false);
  const [keyMsg, setKeyMsg] = useState<string | null>(null);
  const [keyErr, setKeyErr] = useState<string | null>(null);
  const [hasKeyLocal, setHasKeyLocal] = useState(hasKey);

  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{
    device_count?: number;
    online_count?: number;
    sample?: Array<{ id: string; label: string; plate: string | null; online: boolean }>;
  } | null>(null);
  const [testErr, setTestErr] = useState<string | null>(null);
  const [stubWarning, setStubWarning] = useState<string | null>(null);

  const saveKey = async () => {
    setKeyErr(null);
    setKeyMsg(null);
    setSavingKey(true);
    try {
      const res = await fetch("/api/org", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ echoes_api_key: keyInput.trim() || null }),
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
    if (!confirm("Echoes API-Key wirklich entfernen?")) return;
    setSavingKey(true);
    try {
      const res = await fetch("/api/org", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ echoes_api_key: null }),
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
    setStubWarning(null);
    setTesting(true);
    try {
      const res = await fetch("/api/org/echoes/test", { method: "POST" });
      const j = await res.json().catch(() => ({}));
      if (!res.ok || !j.ok) {
        setTestErr(j.error ?? "Verbindung fehlgeschlagen.");
        return;
      }
      setTestResult(j.profile);
      if (j.stub_warning) setStubWarning(j.stub_warning);
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="rounded-lg ring-1 ring-zinc-200 bg-zinc-50 p-4">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2 text-sm font-medium text-zinc-800">
            <Lock size={14} className="text-zinc-500" />
            Echoes API-Key
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
              className="text-xs text-zinc-500 hover:text-rose-700"
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
            placeholder={hasKeyLocal ? "•••••••••••••••• (zum Ersetzen neuen Key eingeben)" : "API-Key aus Echoes einfügen"}
            className="flex-1 px-3 py-2 rounded-md text-sm bg-white outline-none"
            style={{ boxShadow: "inset 0 0 0 1px rgb(231 229 228)" }}
            autoComplete="off"
          />
          <button
            type="button"
            onClick={saveKey}
            disabled={savingKey || keyInput.trim().length === 0}
            className="inline-flex items-center gap-1.5 text-sm px-3 py-2 rounded-md ring-1 ring-zinc-200 bg-white hover:bg-zinc-100 disabled:opacity-40"
          >
            {savingKey ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
            Speichern
          </button>
        </div>

        <div className="mt-2 text-[11px] text-zinc-500">
          Den API-Key bekommst du im Echoes-Dashboard unter Account → API. Wird ausschließlich serverseitig verwendet.
        </div>

        {keyMsg && <div className="mt-2 text-xs text-emerald-700">{keyMsg}</div>}
        {keyErr && <div className="mt-2 text-xs text-rose-700">{keyErr}</div>}
      </div>

      <div className="grid sm:grid-cols-[1fr_auto] gap-3 items-end">
        <label className="block">
          <div className="text-[11px] uppercase tracking-wider text-zinc-500 font-medium mb-1">
            Echoes Account-ID
          </div>
          <input
            value={accountId}
            onChange={(e) => onAccountChange(e.target.value)}
            placeholder="z. B. ECHO-12345"
            className="w-full px-3 py-2 rounded-md text-sm bg-white outline-none"
            style={{ boxShadow: "inset 0 0 0 1px rgb(231 229 228)" }}
          />
        </label>
        <button
          type="button"
          onClick={testConnection}
          disabled={!hasKeyLocal || !accountId.trim() || testing}
          className="inline-flex items-center gap-1.5 text-sm px-3 py-2 rounded-md ring-1 ring-zinc-200 bg-white hover:bg-zinc-50 disabled:opacity-40"
        >
          {testing ? <Loader2 size={13} className="animate-spin" /> : <Wifi size={13} />}
          Verbindung testen
        </button>
      </div>

      {testErr && (
        <div className="text-sm rounded-md px-3 py-2 bg-rose-50 ring-1 ring-rose-200 text-rose-700">
          {testErr}
        </div>
      )}
      {testResult && (
        <div className="text-sm rounded-md px-3 py-2 bg-emerald-50 ring-1 ring-emerald-200 text-emerald-800">
          <div className="font-medium flex items-center gap-1.5">
            <Check size={14} /> Verbindung erfolgreich · {testResult.device_count} Tracker
            {testResult.online_count != null && (
              <span className="opacity-80">({testResult.online_count} online)</span>
            )}
          </div>
          {testResult.sample && testResult.sample.length > 0 && (
            <ul className="mt-2 space-y-0.5 text-xs opacity-90 font-mono">
              {testResult.sample.map((d) => (
                <li key={d.id}>
                  {d.id} — {d.label}
                  {d.plate && <span className="opacity-70"> · {d.plate}</span>}
                  {!d.online && <span className="ml-1 opacity-70">(offline)</span>}
                </li>
              ))}
            </ul>
          )}
          {stubWarning && (
            <div className="mt-2 text-[11px] text-amber-800 bg-amber-50 ring-1 ring-amber-200 rounded px-2 py-1">
              ⚠ {stubWarning}
            </div>
          )}
        </div>
      )}

      <label className="flex items-start gap-3 p-3 rounded-lg ring-1 ring-zinc-200 cursor-pointer">
        <input
          type="checkbox"
          checked={enabled}
          onChange={(e) => onToggle(e.target.checked)}
          disabled={!hasKeyLocal || !accountId.trim()}
          className="mt-0.5 w-4 h-4 accent-indigo-600 disabled:opacity-40"
        />
        <div className="flex-1">
          <div className="font-medium text-sm flex items-center gap-1.5">
            <MapPin size={13} /> GPS-Tracking aktivieren
          </div>
          <div className="text-xs text-zinc-500 mt-1">
            Wenn aktiviert: An jedem Fahrzeug mit hinterlegter Tracker-ID erscheint eine Standort-Karte. Über die Sync-Funktion können alle Positionen aktualisiert werden.
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
    <div className="rounded-lg ring-1 ring-zinc-200 bg-zinc-50 p-4">
      <div className="text-[11px] uppercase tracking-wider text-zinc-500 font-medium mb-2">
        Ihre Strafzettel-Adresse
      </div>
      <div className="flex items-center gap-2">
        <code className="flex-1 px-3 py-2 rounded-md bg-white ring-1 ring-zinc-200 font-mono text-sm">
          {inboundEmail}
        </code>
        <button
          type="button"
          onClick={copy}
          className="inline-flex items-center gap-1.5 text-sm px-3 py-2 rounded-md ring-1 ring-zinc-200 bg-white hover:bg-zinc-50"
        >
          {copied ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
          {copied ? "Kopiert" : "Kopieren"}
        </button>
      </div>
      <button
        type="button"
        onClick={() => setShowHelp((v) => !v)}
        className="mt-3 inline-flex items-center gap-1 text-xs text-zinc-600 hover:text-zinc-900"
      >
        <ChevronDown
          size={12}
          className="transition-transform"
          style={{ transform: showHelp ? "rotate(180deg)" : "" }}
        />
        So richten Sie die Weiterleitung ein
      </button>
      {showHelp && (
        <div className="mt-3 text-xs text-zinc-600 leading-relaxed space-y-2 bg-white rounded-md p-3 ring-1 ring-zinc-200">
          <div>
            <strong>Gmail:</strong> Einstellungen → Weiterleitung und POP/IMAP → Weiterleitungsadresse
            hinzufügen → <span className="font-mono">{inboundEmail}</span> → bestätigen → Filter erstellen
            der alle Mails von Behörden weiterleitet.
          </div>
          <div>
            <strong>Outlook:</strong> Einstellungen → Mail → Weiterleitung → Weiterleiten an{" "}
            <span className="font-mono">{inboundEmail}</span>.
          </div>
          <div className="text-zinc-500">
            Tipp: Nutzen Sie eine separate Weiterleitungsregel nur für Behörden-Absender, damit private
            Mails nicht aus Versehen verarbeitet werden.
          </div>
        </div>
      )}
    </div>
  );
};

const publicLogoUrl = (path: string | null): string | null => {
  if (!path) return null;
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!base) return null;
  return `${base}/storage/v1/object/public/brand/${path}`;
};

const ACCEPTED_LOGO = "image/png,image/jpeg,image/svg+xml";

const BrandingCard = ({ initialLogoPath }: { initialLogoPath: string | null }) => {
  const [logoPath, setLogoPath] = useState<string | null>(initialLogoPath);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  // Cache-Buster: nach Upload neue URL trotz unveränderlichem Pfad-Format
  const [bust, setBust] = useState(0);

  const url = logoPath
    ? `${publicLogoUrl(logoPath)}?v=${bust || initialLogoPath?.length || 0}`
    : null;

  const upload = async (file: File) => {
    setErr(null);
    if (file.size > 2 * 1024 * 1024) {
      setErr("Datei zu groß — max. 2 MB.");
      return;
    }
    if (!ACCEPTED_LOGO.split(",").includes(file.type)) {
      setErr("Nur PNG, JPG oder SVG.");
      return;
    }
    setBusy(true);
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch("/api/settings/logo", { method: "POST", body: fd });
    const j = (await res.json().catch(() => ({}))) as {
      ok?: boolean;
      logo_path?: string;
      error?: string;
    };
    setBusy(false);
    if (!res.ok || !j.ok || !j.logo_path) {
      setErr(j.error || "Upload fehlgeschlagen.");
      return;
    }
    setLogoPath(j.logo_path);
    setBust(Date.now());
  };

  const remove = async () => {
    setErr(null);
    setBusy(true);
    const res = await fetch("/api/settings/logo", { method: "DELETE" });
    setBusy(false);
    if (!res.ok) {
      const j = (await res.json().catch(() => ({}))) as { error?: string };
      setErr(j.error || "Löschen fehlgeschlagen.");
      return;
    }
    setLogoPath(null);
  };

  const onDrop = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files?.[0];
    if (f) void upload(f);
  };

  return (
    <div>
      {url ? (
        <div className="flex items-center gap-5 p-5 rounded-xl ring-1 ring-zinc-200 bg-zinc-50">
          <div className="w-28 h-20 flex items-center justify-center bg-white rounded-lg ring-1 ring-zinc-200 overflow-hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={url}
              alt="Firmenlogo"
              className="max-w-full max-h-full object-contain"
            />
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-medium text-sm">Logo aktiv</div>
            <div className="text-xs text-zinc-500 mt-0.5">
              Erscheint zentriert oben auf jeder Vertragsseite und im Kundenportal.
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <label
              className="inline-flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg ring-1 ring-zinc-300 bg-white text-zinc-700 hover:bg-zinc-100 cursor-pointer"
            >
              {busy ? (
                <Loader2 size={13} className="animate-spin" />
              ) : (
                <Upload size={13} />
              )}
              Ersetzen
              <input
                type="file"
                accept={ACCEPTED_LOGO}
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) void upload(f);
                }}
                disabled={busy}
              />
            </label>
            <button
              type="button"
              onClick={() => void remove()}
              disabled={busy}
              className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-zinc-500 hover:bg-rose-50 hover:text-rose-700 disabled:opacity-50"
              aria-label="Logo entfernen"
            >
              <Trash2 size={14} />
            </button>
          </div>
        </div>
      ) : (
        <label
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          className={`block rounded-xl border-2 border-dashed p-8 text-center cursor-pointer transition ${
            dragging
              ? "border-indigo-500 bg-indigo-50"
              : "border-zinc-300 hover:border-zinc-400 bg-zinc-50"
          }`}
        >
          <input
            type="file"
            accept={ACCEPTED_LOGO}
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void upload(f);
            }}
            disabled={busy}
          />
          <div className="w-12 h-12 mx-auto rounded-xl bg-white ring-1 ring-zinc-200 flex items-center justify-center text-zinc-500">
            {busy ? <Loader2 size={20} className="animate-spin" /> : <ImageIcon size={20} />}
          </div>
          <div className="font-medium text-sm mt-3">
            {busy ? "Lade hoch…" : "Logo hochladen"}
          </div>
          <div className="text-xs text-zinc-500 mt-1">
            Drag &amp; Drop oder klicken — PNG, JPG oder SVG, max. 2 MB
          </div>
        </label>
      )}

      {err && (
        <div className="mt-3 text-xs text-rose-700 bg-rose-50 ring-1 ring-rose-200 rounded-lg px-3 py-2">
          {err}
        </div>
      )}
    </div>
  );
};

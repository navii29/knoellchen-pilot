"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  Calculator,
  Check,
  ChevronRight,
  FileSignature,
  Image as ImageIcon,
  Loader2,
  Lock,
  MapPin,
  RotateCcw,
  Save,
  Trash2,
  TrendingUp,
  Upload,
  Wifi,
} from "lucide-react";
import { DEFAULT_RENTAL_TERMS } from "@/lib/rental-terms";
import type { Organization } from "@/lib/types";
import { Button } from "@/components/ui/Button";
import { Panel } from "@/components/ui/Panel";
import {
  SignatureCanvas,
  type SignatureCanvasHandle,
} from "@/components/ui/SignatureCanvas";

export const SettingsClient = ({
  org,
  lexofficeHasKey,
  echoesHasKey,
  landlordHasSignature,
}: {
  org: Organization;
  lexofficeHasKey: boolean;
  echoesHasKey: boolean;
  landlordHasSignature: boolean;
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
    iban: org?.iban || "",
    bic: org?.bic || "",
    account_holder: org?.account_holder || "",
    kleinunternehmer: org?.kleinunternehmer || false,
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
      <div className="mb-6">
        <div className="kicker text-ink-muted mb-2">Leitstelle · Konfiguration</div>
        <h1 className="font-display font-extrabold text-ink text-[28px] leading-[1.05] tracking-tightest">Einstellungen</h1>
        <p className="text-[14px] text-ink-muted mt-1.5">
          Diese Daten erscheinen auf allen erstellten PDFs (Anschreiben, Rechnung).
        </p>
      </div>

      <form onSubmit={submit} className="space-y-6">
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
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[12px] text-ink-muted font-mono">
                  € netto
                </span>
              </div>
              <div className="text-[11px] text-ink-muted mt-1">
                Standardwert für neue Strafzettel. Im Strafzettel-Detail veränderbar.
                {data.kleinunternehmer
                  ? " Ohne USt (Kleinunternehmer)."
                  : " Zzgl. 19 % USt."}
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

        <Section
          title="Bankverbindung & Steuer"
          subtitle="Pflicht auf Rechnungen — ohne IBAN kann keine Rechnung erstellt werden."
        >
          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="Kontoinhaber">
              <input value={data.account_holder} onChange={set("account_holder")} className="input" placeholder={data.name || "Firmenname"} />
            </Field>
            <Field label="IBAN *">
              <input value={data.iban} onChange={set("iban")} className="input tabular-nums" placeholder="DE00 0000 0000 0000 0000 00" />
            </Field>
            <Field label="BIC">
              <input value={data.bic} onChange={set("bic")} className="input tabular-nums" placeholder="XXXXDEXXXXX" />
            </Field>
          </div>
          <div className="mt-5">
            <div className="data-label mb-2">Besteuerung</div>
            <div className="grid sm:grid-cols-2 gap-3">
              <label
                className={`flex items-start gap-3 p-3 rounded-panel border cursor-pointer transition-colors ${
                  !data.kleinunternehmer ? "border-signal bg-signal-soft" : "border-hairline hover:bg-canvas"
                }`}
              >
                <input
                  type="radio"
                  name="besteuerung"
                  checked={!data.kleinunternehmer}
                  onChange={() => setData((d) => ({ ...d, kleinunternehmer: false }))}
                  className="mt-0.5 w-4 h-4 accent-signal"
                />
                <div className="flex-1">
                  <div className="font-medium text-[13.5px] text-ink">Regelbesteuerung</div>
                  <div className="text-[12px] text-ink-muted mt-0.5">
                    Weist 19 % Umsatzsteuer aus. Standard, z. B. für GmbH, UG, AG.
                  </div>
                </div>
              </label>

              <label
                className={`flex items-start gap-3 p-3 rounded-panel border cursor-pointer transition-colors ${
                  data.kleinunternehmer ? "border-signal bg-signal-soft" : "border-hairline hover:bg-canvas"
                }`}
              >
                <input
                  type="radio"
                  name="besteuerung"
                  checked={data.kleinunternehmer}
                  onChange={() => setData((d) => ({ ...d, kleinunternehmer: true }))}
                  className="mt-0.5 w-4 h-4 accent-signal"
                />
                <div className="flex-1">
                  <div className="font-medium text-[13.5px] text-ink">Kleinunternehmer (§ 19 UStG)</div>
                  <div className="text-[12px] text-ink-muted mt-0.5">
                    Keine Umsatzsteuer. Rechnungen zeigen den §-19-Hinweis.
                  </div>
                </div>
              </label>
            </div>
            <p className="mt-2 text-[11px] text-ink-muted">
              Die Rechtsform (GmbH, UG …) gehört in den Firmennamen und ist von der
              Besteuerung unabhängig.
            </p>
          </div>
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
          className="panel p-6 hover:border-ink/20 transition flex items-center gap-4 group"
        >
          <div className="w-11 h-11 rounded-panel border border-hairline bg-canvas flex items-center justify-center text-ink-muted shrink-0">
            <TrendingUp size={18} strokeWidth={1.75} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-display font-semibold text-[14px] tracking-tight text-ink">
              Preisregeln & Revenue Management
            </div>
            <div className="text-[12.5px] text-ink-muted mt-0.5 max-w-xl">
              Definiere Saison-, Wochentag- und Nachfrage-Aufschläge. Die App
              schlägt bei jedem Vertrag den optimalen Tagespreis vor.
            </div>
          </div>
          <ChevronRight
            size={16}
            className="text-ink-muted group-hover:text-ink transition shrink-0"
          />
        </Link>

        <Link
          href="/dashboard/settings/special-terms"
          className="panel p-6 hover:border-ink/20 transition flex items-center gap-4 group"
        >
          <div className="w-11 h-11 rounded-panel border border-hairline bg-canvas flex items-center justify-center text-ink-muted shrink-0">
            <FileSignature size={18} strokeWidth={1.75} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-display font-semibold text-[14px] tracking-tight text-ink">
              Sondervereinbarungen-Textbausteine
            </div>
            <div className="text-[12.5px] text-ink-muted mt-0.5 max-w-xl">
              Vordefinierte Vereinbarungen, die bei der Vertragsanlage per
              Checkbox ausgewählt werden und auf Seite 3 des Mietvertrags
              erscheinen.
            </div>
          </div>
          <ChevronRight
            size={16}
            className="text-ink-muted group-hover:text-ink transition shrink-0"
          />
        </Link>

        <Section
          title="Mietbedingungen (AGB)"
          subtitle="Diese Bedingungen erscheinen auf Seite 2 jedes generierten Mietvertrags."
        >
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-[12px] text-ink-muted">
                <FileSignature size={13} />
                <span className="font-mono tnum">{data.rental_terms.length.toLocaleString("de-DE")}</span> Zeichen
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
                className="inline-flex items-center gap-1 text-[12px] text-ink-muted hover:text-ink"
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
              className="field font-mono text-[12.5px] leading-[1.55] resize-y"
              spellCheck={false}
            />
            <div className="text-[11px] text-ink-muted">
              Diese Vorlage ist ein Standard-Entwurf — bitte vor Live-Gang einmal von einem Anwalt prüfen lassen.
            </div>
          </div>
        </Section>

        <Section
          title="Unterschrift Vermieter"
          subtitle="Einmal hinterlegen — erscheint automatisch auf jedem Mietvertrag (Seite 1 & 3, Vermieter-Spalte, sowie im Übergabeprotokoll)."
        >
          <LandlordSignatureCard
            hasSignature={landlordHasSignature}
            initialName={org.landlord_signature_name || org.name || ""}
          />
        </Section>

        {err && <div className="text-[13px] text-red-700 bg-red-50 border border-red-200 rounded-panel px-3 py-2">{err}</div>}
        {msg && (
          <div className="text-[13px] text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-panel px-3 py-2">
            {msg}
          </div>
        )}

        <div className="flex justify-end">
          <Button type="submit" variant="signal" disabled={busy}>
            {busy ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Speichern
          </Button>
        </div>

        <style jsx>{`
          .input {
            width: 100%;
            padding: 0.5rem 0.75rem;
            font-size: 0.875rem;
            border-radius: 0.375rem;
            outline: none;
            border: 1px solid var(--hairline);
            background: #fff;
            transition: border-color 0.15s;
          }
          .input:focus { border-color: rgb(100 100 100 / 0.3); box-shadow: 0 0 0 3px rgb(255 90 31 / 0.1); }
        `}</style>
      </form>
    </>
  );
};

// Wiederverwendbare Vermieter-Unterschrift (einmal hinterlegen, gilt für alle
// Verträge). Speichert PNG + Name via PATCH /api/org.
const LandlordSignatureCard = ({
  hasSignature,
  initialName,
}: {
  hasSignature: boolean;
  initialName: string;
}) => {
  const sigRef = useRef<SignatureCanvasHandle>(null);
  const [name, setName] = useState(initialName);
  const [hasInk, setHasInk] = useState(false);
  const [saved, setSaved] = useState(hasSignature);
  const [editing, setEditing] = useState(!hasSignature);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const save = async () => {
    const png = sigRef.current?.toPNG() ?? null;
    if (!png) {
      setErr("Bitte zuerst im Feld unterschreiben.");
      return;
    }
    setBusy(true);
    setErr(null);
    const res = await fetch("/api/org", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        landlord_signature_data: png,
        landlord_signature_name: name.trim() || null,
      }),
    });
    setBusy(false);
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setErr(j.error || "Speichern fehlgeschlagen");
      return;
    }
    setSaved(true);
    setEditing(false);
  };

  const remove = async () => {
    if (!confirm("Vermieter-Unterschrift wirklich entfernen?")) return;
    setBusy(true);
    setErr(null);
    const res = await fetch("/api/org", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ landlord_signature_data: null }),
    });
    setBusy(false);
    if (!res.ok) {
      setErr("Entfernen fehlgeschlagen");
      return;
    }
    setSaved(false);
    setEditing(true);
    setHasInk(false);
    sigRef.current?.clear();
  };

  if (saved && !editing) {
    return (
      <div className="flex items-center justify-between gap-3 rounded-panel border border-hairline bg-canvas px-4 py-3">
        <div className="flex items-center gap-2 text-[13.5px] text-ink">
          <Check size={15} className="text-emerald-600" />
          <span>Unterschrift hinterlegt{name ? ` — ${name}` : ""}</span>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="text-[12.5px] text-signal hover:underline"
          >
            Ändern
          </button>
          <button
            type="button"
            onClick={remove}
            disabled={busy}
            className="inline-flex items-center gap-1 text-[12.5px] text-red-700 hover:underline disabled:opacity-40"
          >
            {busy ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />} Entfernen
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Field label="Name in Druckschrift (erscheint unter der Unterschrift)">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="field"
          placeholder="z. B. Markus Wagner"
        />
      </Field>

      <div>
        <div className="flex items-center justify-between mb-1.5">
          <div className="flex items-center gap-1.5 data-label">
            <FileSignature size={12} className="text-ink-muted" />
            Unterschrift
          </div>
          <button
            type="button"
            onClick={() => {
              sigRef.current?.clear();
              setHasInk(false);
            }}
            disabled={!hasInk}
            className="inline-flex items-center gap-1 text-[12px] text-ink-muted hover:text-ink disabled:opacity-40"
          >
            <RotateCcw size={11} /> Neu zeichnen
          </button>
        </div>
        <div className="relative">
          <SignatureCanvas ref={sigRef} height={180} onInkChange={setHasInk} />
          {!hasInk && (
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center text-[13px] text-ink-muted">
              Mit Maus, Finger oder Stift unterschreiben
            </div>
          )}
        </div>
      </div>

      {err && (
        <div className="flex items-center gap-2 text-[12.5px] text-red-700 bg-red-50 border border-red-200 rounded-panel px-3 py-2">
          <AlertTriangle size={13} /> {err}
        </div>
      )}

      <div className="flex items-center justify-end gap-3">
        {saved && (
          <button
            type="button"
            onClick={() => {
              setEditing(false);
              setErr(null);
            }}
            className="text-[13px] text-ink-muted hover:text-ink px-2"
          >
            Abbrechen
          </button>
        )}
        <Button type="button" variant="signal" onClick={save} disabled={busy || !hasInk}>
          {busy ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />} Unterschrift speichern
        </Button>
      </div>
    </div>
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
  <Panel>
    <div className="font-display font-semibold text-[15px] tracking-tight text-ink">{title}</div>
    {subtitle && <p className="text-[12.5px] text-ink-muted mt-0.5">{subtitle}</p>}
    <div className="mt-5">{children}</div>
  </Panel>
);

const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <label className="block">
    <div className="data-label mb-1">{label}</div>
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
      <div className="rounded-panel border border-hairline bg-canvas p-4">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2 text-[13.5px] font-medium text-ink">
            <Lock size={14} className="text-ink-muted" />
            LexOffice API-Key
            {hasKeyLocal && (
              <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                <Check size={11} /> Hinterlegt
              </span>
            )}
          </div>
          {hasKeyLocal && (
            <button
              type="button"
              onClick={removeKey}
              disabled={savingKey}
              className="text-[12px] text-ink-muted hover:text-rose-700"
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
            className="field flex-1"
            autoComplete="off"
          />
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={saveKey}
            disabled={savingKey || keyInput.trim().length === 0}
          >
            {savingKey ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
            Speichern
          </Button>
        </div>

        <div className="mt-2 text-[11px] text-ink-muted">
          Den API-Key finden Sie in LexOffice unter Mein Konto → Öffentliche API → Schlüssel erstellen. Er wird nur serverseitig verwendet und niemals an den Browser gesendet.
        </div>

        {keyMsg && (
          <div className="mt-2 text-[12px] text-emerald-700">{keyMsg}</div>
        )}
        {keyErr && <div className="mt-2 text-[12px] text-rose-700">{keyErr}</div>}
      </div>

      <div className="rounded-panel border border-hairline bg-paper p-4">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2 text-[13.5px] font-medium text-ink">
            <Wifi size={14} className="text-ink-muted" />
            Verbindung testen
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={testConnection}
            disabled={!hasKeyLocal || testing}
          >
            {testing ? <Loader2 size={13} className="animate-spin" /> : <Wifi size={13} />}
            Test
          </Button>
        </div>
        {!hasKeyLocal && (
          <div className="mt-2 text-[12px] text-ink-muted">
            Erst API-Key speichern, dann Verbindung prüfen.
          </div>
        )}
        {testErr && (
          <div className="mt-3 text-[13px] rounded-panel px-3 py-2 bg-rose-50 border border-rose-200 text-rose-700">
            {testErr}
          </div>
        )}
        {testResult && (
          <div className="mt-3 text-[13px] rounded-panel px-3 py-2 bg-emerald-50 border border-emerald-200 text-emerald-800">
            <div className="font-medium flex items-center gap-1.5">
              <Check size={14} /> Verbunden mit {testResult.company_name}
            </div>
            <div className="mt-1 text-[11.5px] opacity-90 space-y-0.5">
              {testResult.tax_number && <div>Steuernummer: {testResult.tax_number}</div>}
              {testResult.vat_id && <div>USt-IdNr.: {testResult.vat_id}</div>}
              <div className="font-mono text-[11px] opacity-70">
                Org-ID: {testResult.organization_id}
              </div>
            </div>
          </div>
        )}
      </div>

      <label className="flex items-start gap-3 p-3 rounded-panel border border-hairline cursor-pointer">
        <input
          type="checkbox"
          checked={enabled}
          onChange={(e) => onToggle(e.target.checked)}
          disabled={!hasKeyLocal}
          className="mt-0.5 w-4 h-4 accent-signal disabled:opacity-40"
        />
        <div className="flex-1">
          <div className="font-medium text-[13.5px] flex items-center gap-1.5 text-ink">
            <Calculator size={13} /> LexOffice-Übertragung aktivieren
          </div>
          <div className="text-[12px] text-ink-muted mt-1">
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
    <div className="rounded-panel border border-hairline bg-paper p-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2 text-[13.5px] font-medium text-ink">
          <Calculator size={14} className="text-ink-muted" />
          Fahrzeuge nach LexOffice synchronisieren
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={run}
          disabled={disabled || running}
        >
          {running ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
          Jetzt synchronisieren
        </Button>
      </div>
      <div className="mt-2 text-[12px] text-ink-muted">
        Legt alle noch nicht übertragenen aktiven Fahrzeuge als Artikel
        (Dienstleistung „Tag“) in LexOffice an.
      </div>
      {result && (
        <div className="mt-3 text-[13px] rounded-panel px-3 py-2 bg-emerald-50 border border-emerald-200 text-emerald-800">
          <div className="font-medium flex items-center gap-1.5">
            <Check size={14} /> {result.synced} von {result.total} Fahrzeugen synchronisiert
          </div>
          {result.failed > 0 && result.failed_plates?.length ? (
            <div className="mt-1 text-[11.5px]">
              Fehlgeschlagen: {result.failed_plates.join(", ")}
            </div>
          ) : null}
          {result.total === 0 && (
            <div className="mt-1 text-[11.5px] opacity-90">
              Keine Fahrzeuge offen — alles bereits synchronisiert.
            </div>
          )}
        </div>
      )}
      {err && (
        <div className="mt-3 text-[13px] rounded-panel px-3 py-2 bg-rose-50 border border-rose-200 text-rose-700">
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
      <div className="rounded-panel border border-hairline bg-canvas p-4">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2 text-[13.5px] font-medium text-ink">
            <Lock size={14} className="text-ink-muted" />
            Echoes API-Key
            {hasKeyLocal && (
              <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                <Check size={11} /> Hinterlegt
              </span>
            )}
          </div>
          {hasKeyLocal && (
            <button
              type="button"
              onClick={removeKey}
              disabled={savingKey}
              className="text-[12px] text-ink-muted hover:text-rose-700"
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
            className="field flex-1"
            autoComplete="off"
          />
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={saveKey}
            disabled={savingKey || keyInput.trim().length === 0}
          >
            {savingKey ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
            Speichern
          </Button>
        </div>

        <div className="mt-2 text-[11px] text-ink-muted">
          Den API-Key bekommst du im Echoes-Dashboard unter Account → API. Wird ausschließlich serverseitig verwendet.
        </div>

        {keyMsg && <div className="mt-2 text-[12px] text-emerald-700">{keyMsg}</div>}
        {keyErr && <div className="mt-2 text-[12px] text-rose-700">{keyErr}</div>}
      </div>

      <div className="grid sm:grid-cols-[1fr_auto] gap-3 items-end">
        <label className="block">
          <div className="data-label mb-1">Echoes Account-ID</div>
          <input
            value={accountId}
            onChange={(e) => onAccountChange(e.target.value)}
            placeholder="z. B. ECHO-12345"
            className="field"
          />
        </label>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={testConnection}
          disabled={!hasKeyLocal || !accountId.trim() || testing}
        >
          {testing ? <Loader2 size={13} className="animate-spin" /> : <Wifi size={13} />}
          Verbindung testen
        </Button>
      </div>

      {testErr && (
        <div className="text-[13px] rounded-panel px-3 py-2 bg-rose-50 border border-rose-200 text-rose-700">
          {testErr}
        </div>
      )}
      {testResult && (
        <div className="text-[13px] rounded-panel px-3 py-2 bg-emerald-50 border border-emerald-200 text-emerald-800">
          <div className="font-medium flex items-center gap-1.5">
            <Check size={14} /> Verbindung erfolgreich · {testResult.device_count} Tracker
            {testResult.online_count != null && (
              <span className="opacity-80">({testResult.online_count} online)</span>
            )}
          </div>
          {testResult.sample && testResult.sample.length > 0 && (
            <ul className="mt-2 space-y-0.5 text-[11.5px] opacity-90 font-mono">
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
            <div className="mt-2 flex items-start gap-1.5 text-[11px] text-amber-800 bg-amber-50 border border-amber-200 rounded px-2 py-1">
              <AlertTriangle size={13} strokeWidth={2} className="mt-px shrink-0" />
              <span>{stubWarning}</span>
            </div>
          )}
        </div>
      )}

      <label className="flex items-start gap-3 p-3 rounded-panel border border-hairline cursor-pointer">
        <input
          type="checkbox"
          checked={enabled}
          onChange={(e) => onToggle(e.target.checked)}
          disabled={!hasKeyLocal || !accountId.trim()}
          className="mt-0.5 w-4 h-4 accent-signal disabled:opacity-40"
        />
        <div className="flex-1">
          <div className="font-medium text-[13.5px] flex items-center gap-1.5 text-ink">
            <MapPin size={13} /> GPS-Tracking aktivieren
          </div>
          <div className="text-[12px] text-ink-muted mt-1">
            Wenn aktiviert: An jedem Fahrzeug mit hinterlegter Tracker-ID erscheint eine Standort-Karte. Über die Sync-Funktion können alle Positionen aktualisiert werden.
          </div>
        </div>
      </label>
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
        <div className="flex items-center gap-5 p-5 rounded-panel border border-hairline bg-canvas">
          <div className="w-28 h-20 flex items-center justify-center bg-paper rounded-panel border border-hairline overflow-hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={url}
              alt="Firmenlogo"
              className="max-w-full max-h-full object-contain"
            />
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-medium text-[13.5px] text-ink">Logo aktiv</div>
            <div className="text-[12px] text-ink-muted mt-0.5">
              Erscheint zentriert oben auf jeder Vertragsseite und im Kundenportal.
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <label className="inline-flex items-center gap-1.5 h-8 px-3 text-[13px] font-medium rounded-btn text-ink-soft hover:bg-ink/5 border border-transparent cursor-pointer transition-colors">
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
              className="inline-flex items-center justify-center w-8 h-8 rounded-btn text-ink-muted hover:bg-rose-50 hover:text-rose-700 disabled:opacity-50"
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
          className={`block rounded-card border-2 border-dashed p-8 text-center cursor-pointer transition ${
            dragging
              ? "border-signal bg-signal/5"
              : "border-hairline hover:border-ink/20 bg-canvas"
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
          <div className="w-12 h-12 mx-auto rounded-panel border border-hairline bg-paper flex items-center justify-center text-ink-muted">
            {busy ? <Loader2 size={20} className="animate-spin" /> : <ImageIcon size={20} />}
          </div>
          <div className="font-display font-semibold text-[14px] tracking-tight text-ink mt-3">
            {busy ? "Lade hoch…" : "Logo hochladen"}
          </div>
          <div className="text-[12.5px] text-ink-muted mt-1">
            Drag &amp; Drop oder klicken — PNG, JPG oder SVG, max. 2 MB
          </div>
        </label>
      )}

      {err && (
        <div className="mt-3 text-[12px] text-rose-700 bg-rose-50 border border-rose-200 rounded-panel px-3 py-2">
          {err}
        </div>
      )}
    </div>
  );
};

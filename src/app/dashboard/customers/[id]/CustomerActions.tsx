"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  Check,
  Copy,
  Eye,
  EyeOff,
  Loader2,
  Lock,
  Mail,
  Trash2,
  UserPlus,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/Button";

export const CustomerActions = ({
  customerId,
  customerEmail,
}: {
  customerId: string;
  customerEmail: string | null;
}) => {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [inviteOpen, setInviteOpen] = useState(false);

  const remove = async () => {
    if (!confirm("Diesen Kunden wirklich löschen? Verknüpfte Verträge bleiben erhalten.")) return;
    setBusy("delete");
    setError(null);
    const res = await fetch(`/api/customers/${customerId}`, { method: "DELETE" });
    setBusy(null);
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setError(j.error || "Löschen fehlgeschlagen");
      return;
    }
    router.push("/dashboard/customers");
    router.refresh();
  };

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setInviteOpen(true)}
        disabled={busy != null}
      >
        <UserPlus size={14} />
        Portalzugang erstellen
      </Button>

      <Button
        variant="ghost"
        size="sm"
        onClick={remove}
        disabled={busy != null}
        className="text-red-700 hover:bg-red-50 border-transparent"
      >
        {busy === "delete" ? (
          <Loader2 size={14} className="animate-spin" />
        ) : (
          <Trash2 size={14} />
        )}
        Löschen
      </Button>

      {error && <span className="text-[12px] text-red-700">{error}</span>}

      {inviteOpen && (
        <PortalInviteModal
          customerId={customerId}
          defaultEmail={customerEmail ?? ""}
          onClose={() => setInviteOpen(false)}
          onDone={() => router.refresh()}
        />
      )}
    </div>
  );
};

const PortalInviteModal = ({
  customerId,
  defaultEmail,
  onClose,
  onDone,
}: {
  customerId: string;
  defaultEmail: string;
  onClose: () => void;
  onDone: () => void;
}) => {
  const [email, setEmail] = useState(defaultEmail);
  const [password, setPassword] = useState("");
  const [showPwd, setShowPwd] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<{
    mode: "created" | "updated";
    email: string;
    password: string;
  } | null>(null);
  const [copied, setCopied] = useState<"email" | "password" | "both" | null>(null);

  const submit = async () => {
    if (!email.trim() || !email.includes("@")) {
      setError("Bitte eine gültige E-Mail-Adresse angeben.");
      return;
    }
    if (password.length < 8) {
      setError("Passwort muss mindestens 8 Zeichen lang sein.");
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch(`/api/customers/${customerId}/portal-invite`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password }),
      });
      const j = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        mode?: "created" | "updated";
        error?: string;
      };
      if (!res.ok || !j.ok) {
        setError(j.error ?? "Speichern fehlgeschlagen");
        setSubmitting(false);
        return;
      }
      setDone({ mode: j.mode ?? "created", email: email.trim(), password });
      onDone();
    } catch {
      setError("Netzwerkfehler");
    } finally {
      setSubmitting(false);
    }
  };

  const copy = async (what: "email" | "password" | "both") => {
    if (!done) return;
    const text =
      what === "email"
        ? done.email
        : what === "password"
        ? done.password
        : `E-Mail: ${done.email}\nPasswort: ${done.password}`;
    await navigator.clipboard.writeText(text);
    setCopied(what);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center px-4">
      <button
        type="button"
        className="absolute inset-0 bg-ink/40 backdrop-blur-sm"
        onClick={onClose}
        aria-label="Schließen"
      />
      <div className="relative w-full sm:max-w-md max-h-[90vh] flex flex-col bg-paper sm:rounded-card rounded-t-card shadow-panel border border-hairline overflow-hidden">
        <div className="px-6 py-4 flex items-center justify-between border-b border-hairline">
          <div>
            <div className="kicker text-ink-muted mb-1">Kundenportal</div>
            <h2 className="font-display font-bold text-[18px] tracking-tight text-ink mt-0.5">
              {done ? "Portalzugang erstellt" : "Portalzugang erstellen"}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-btn inline-flex items-center justify-center text-ink-muted hover:bg-canvas"
          >
            <X size={16} />
          </button>
        </div>

        <div className="px-6 py-5 overflow-auto scroll-thin grow">
          {!done ? (
            <div className="space-y-4">
              <p className="text-[13px] text-ink-soft leading-snug">
                Lege E-Mail und Passwort fest. Der Kunde kann sich danach unter{" "}
                <code className="font-mono text-[12px] bg-canvas px-1.5 py-0.5 rounded border border-hairline">
                  knoellchen-pilot.de/portal
                </code>{" "}
                einloggen. Die Zugangsdaten gibst du dem Kunden persönlich weiter
                (z. B. am Schalter oder per Messenger).
              </p>

              <label className="block">
                <div className="data-label mb-1.5 flex items-center gap-1.5">
                  <Mail size={12} className="text-ink-muted" />
                  E-Mail
                </div>
                <input
                  type="email"
                  className="field"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="kunde@example.de"
                  autoFocus={!defaultEmail}
                />
              </label>

              <label className="block">
                <div className="data-label mb-1.5 flex items-center gap-1.5">
                  <Lock size={12} className="text-ink-muted" />
                  Passwort
                  <span className="ml-auto text-[11px] text-ink-muted font-normal normal-case tracking-normal">
                    min 8 Zeichen
                  </span>
                </div>
                <div className="relative">
                  <input
                    type={showPwd ? "text" : "password"}
                    className="field pr-10 font-mono"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="z. B. Sommer-2026"
                    autoComplete="new-password"
                    autoFocus={!!defaultEmail}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPwd((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-muted hover:text-ink"
                    aria-label={showPwd ? "Passwort verbergen" : "Passwort anzeigen"}
                  >
                    {showPwd ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </label>

              {error && (
                <div className="flex items-center gap-2 text-[13px] rounded-panel px-3 py-2 bg-red-50 border border-red-200 text-red-700">
                  <AlertTriangle size={14} /> {error}
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <div className="rounded-panel border border-hairline bg-canvas px-4 py-3">
                <div className="flex items-center gap-2 text-[13.5px] font-medium text-ink">
                  <Check size={14} className="text-signal" />
                  {done.mode === "updated"
                    ? "Passwort aktualisiert"
                    : "Portalzugang erstellt"}
                </div>
                <div className="text-[12.5px] text-ink-soft mt-1 leading-snug">
                  Der Kunde kann sich unter{" "}
                  <code className="font-mono bg-paper px-1.5 py-0.5 rounded border border-hairline">
                    knoellchen-pilot.de/portal
                  </code>{" "}
                  mit den unten stehenden Zugangsdaten einloggen.
                </div>
              </div>

              <div className="rounded-panel border border-hairline divide-y divide-hairline">
                <CredRow
                  label="E-Mail"
                  value={done.email}
                  onCopy={() => copy("email")}
                  copied={copied === "email"}
                  mono={false}
                />
                <CredRow
                  label="Passwort"
                  value={done.password}
                  onCopy={() => copy("password")}
                  copied={copied === "password"}
                  mono
                />
              </div>

              <button
                type="button"
                onClick={() => copy("both")}
                className="w-full inline-flex items-center justify-center gap-1.5 h-10 rounded-btn border border-hairline text-[13px] text-ink-soft hover:bg-canvas"
              >
                {copied === "both" ? <Check size={14} /> : <Copy size={14} />}
                {copied === "both" ? "Kopiert" : "Beide Daten kopieren"}
              </button>

              <p className="text-[11.5px] text-ink-muted text-center">
                Tipp: Schick das per Messenger oder lies es dem Kunden vor — wir
                speichern keine E-Mails dafür.
              </p>
            </div>
          )}
        </div>

        <div className="px-6 py-4 flex items-center justify-end gap-3 border-t border-hairline">
          {!done ? (
            <>
              <button
                type="button"
                onClick={onClose}
                className="text-[13px] text-ink-muted hover:text-ink px-3"
              >
                Abbrechen
              </button>
              <button
                type="button"
                onClick={submit}
                disabled={submitting}
                className="inline-flex items-center justify-center gap-1.5 h-10 px-5 rounded-btn bg-ink text-white text-[13px] font-medium hover:bg-ink-soft disabled:opacity-40"
              >
                {submitting ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <Check size={14} />
                )}
                Zugang erstellen
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={onClose}
              className="inline-flex items-center justify-center gap-1.5 h-10 px-5 rounded-btn bg-ink text-white text-[13px] font-medium hover:bg-ink-soft"
            >
              Fertig
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

const CredRow = ({
  label,
  value,
  onCopy,
  copied,
  mono,
}: {
  label: string;
  value: string;
  onCopy: () => void;
  copied: boolean;
  mono: boolean;
}) => (
  <div className="flex items-center gap-3 px-3.5 py-2.5">
    <div className="data-label w-20 shrink-0">{label}</div>
    <div
      className={`flex-1 min-w-0 truncate text-ink ${mono ? "font-mono tnum text-[13.5px]" : "text-[14px]"}`}
    >
      {value}
    </div>
    <button
      type="button"
      onClick={onCopy}
      className="inline-flex items-center gap-1 text-[12px] text-ink-muted hover:text-ink shrink-0"
    >
      {copied ? <Check size={12} /> : <Copy size={12} />}
      {copied ? "Kopiert" : "Kopieren"}
    </button>
  </div>
);

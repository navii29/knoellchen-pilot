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

const inputCls =
  "w-full h-11 px-3.5 rounded-xl bg-white ring-1 ring-stone-200 text-[14.5px] text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-teal-500/40 focus:border-teal-500 transition-shadow";

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
      <button
        onClick={() => setInviteOpen(true)}
        disabled={busy != null}
        className="inline-flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-md ring-1 ring-stone-200 hover:bg-stone-50 disabled:opacity-50"
      >
        <UserPlus size={14} />
        Portalzugang erstellen
      </button>

      <button
        onClick={remove}
        disabled={busy != null}
        className="inline-flex items-center gap-1.5 text-sm text-red-700 px-3 py-1.5 rounded-md hover:bg-red-50 disabled:opacity-50"
      >
        {busy === "delete" ? (
          <Loader2 size={14} className="animate-spin" />
        ) : (
          <Trash2 size={14} />
        )}
        Löschen
      </button>

      {error && <span className="text-xs text-red-700">{error}</span>}

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
  const [showPwd, setShowPwd] = useState(true); // Default sichtbar — Admin gibt Daten weiter
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
        className="absolute inset-0 bg-stone-900/40 backdrop-blur-sm"
        onClick={onClose}
        aria-label="Schließen"
      />
      <div className="relative w-full sm:max-w-md max-h-[90vh] flex flex-col bg-white sm:rounded-2xl rounded-t-2xl shadow-2xl ring-1 ring-stone-200 overflow-hidden">
        <div className="px-6 py-4 flex items-center justify-between border-b border-stone-100">
          <div>
            <div className="text-[11px] uppercase tracking-[0.08em] font-semibold text-teal-700">
              Kundenportal
            </div>
            <h2 className="font-display text-xl tracking-tight font-medium mt-0.5">
              {done ? "Portalzugang erstellt" : "Portalzugang erstellen"}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full inline-flex items-center justify-center text-stone-500 hover:bg-stone-100"
          >
            <X size={16} />
          </button>
        </div>

        <div className="px-6 py-5 overflow-auto scroll-thin grow">
          {!done ? (
            <div className="space-y-4">
              <p className="text-[13px] text-stone-600 leading-snug">
                Lege E-Mail und Passwort fest. Der Kunde kann sich danach unter{" "}
                <code className="font-mono text-[12px] bg-stone-100 px-1.5 py-0.5 rounded">
                  knoellchen-pilot.de/portal
                </code>{" "}
                einloggen. Die Zugangsdaten gibst du dem Kunden persönlich weiter
                (z. B. am Schalter oder per Messenger).
              </p>

              <label className="block">
                <div className="text-[12px] font-medium text-stone-700 mb-1.5 flex items-center gap-1.5">
                  <Mail size={12} className="text-stone-500" />
                  E-Mail
                </div>
                <input
                  type="email"
                  className={inputCls}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="kunde@example.de"
                  autoFocus={!defaultEmail}
                />
              </label>

              <label className="block">
                <div className="text-[12px] font-medium text-stone-700 mb-1.5 flex items-center gap-1.5">
                  <Lock size={12} className="text-stone-500" />
                  Passwort
                  <span className="ml-auto text-[11px] text-stone-400 font-normal">
                    min 8 Zeichen
                  </span>
                </div>
                <div className="relative">
                  <input
                    type={showPwd ? "text" : "password"}
                    className={`${inputCls} pr-10 font-mono`}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="z. B. Sommer-2026"
                    autoComplete="new-password"
                    autoFocus={!!defaultEmail}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPwd((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-700"
                    aria-label={showPwd ? "Passwort verbergen" : "Passwort anzeigen"}
                  >
                    {showPwd ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </label>

              {error && (
                <div className="flex items-center gap-2 text-sm rounded-lg px-3 py-2 bg-rose-50 ring-1 ring-rose-200 text-rose-700">
                  <AlertTriangle size={14} /> {error}
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <div className="rounded-xl bg-emerald-50 ring-1 ring-emerald-200 px-4 py-3">
                <div className="flex items-center gap-2 text-[13.5px] font-medium text-emerald-800">
                  <Check size={14} />
                  {done.mode === "updated"
                    ? "Passwort aktualisiert"
                    : "Portalzugang erstellt"}
                </div>
                <div className="text-[12.5px] text-emerald-700 mt-1 leading-snug">
                  Der Kunde kann sich unter{" "}
                  <code className="font-mono bg-white/60 px-1.5 py-0.5 rounded">
                    knoellchen-pilot.de/portal
                  </code>{" "}
                  mit den unten stehenden Zugangsdaten einloggen.
                </div>
              </div>

              <div className="rounded-xl ring-1 ring-stone-200 divide-y divide-stone-100">
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
                className="w-full inline-flex items-center justify-center gap-1.5 h-10 rounded-full ring-1 ring-stone-200 text-sm text-stone-700 hover:bg-stone-50"
              >
                {copied === "both" ? <Check size={14} /> : <Copy size={14} />}
                {copied === "both" ? "Kopiert" : "Beide Daten kopieren"}
              </button>

              <p className="text-[11.5px] text-stone-500 text-center">
                Tipp: Schick das per Messenger oder lies es dem Kunden vor — wir
                speichern keine E-Mails dafür.
              </p>
            </div>
          )}
        </div>

        <div className="px-6 py-4 flex items-center justify-end gap-3 border-t border-stone-100">
          {!done ? (
            <>
              <button
                type="button"
                onClick={onClose}
                className="text-sm text-stone-500 hover:text-stone-800 px-3"
              >
                Abbrechen
              </button>
              <button
                type="button"
                onClick={submit}
                disabled={submitting}
                className="inline-flex items-center justify-center gap-1.5 h-10 px-5 rounded-full bg-stone-900 text-white text-sm font-medium hover:bg-stone-800 disabled:opacity-40"
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
              className="inline-flex items-center justify-center gap-1.5 h-10 px-5 rounded-full bg-stone-900 text-white text-sm font-medium hover:bg-stone-800"
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
    <div className="text-[11.5px] uppercase tracking-wider text-stone-500 font-medium w-20 shrink-0">
      {label}
    </div>
    <div
      className={`flex-1 min-w-0 truncate text-stone-900 ${mono ? "font-mono text-[13.5px]" : "text-[14px]"}`}
    >
      {value}
    </div>
    <button
      type="button"
      onClick={onCopy}
      className="inline-flex items-center gap-1 text-xs text-stone-500 hover:text-stone-900 shrink-0"
    >
      {copied ? <Check size={12} /> : <Copy size={12} />}
      {copied ? "Kopiert" : "Kopieren"}
    </button>
  </div>
);

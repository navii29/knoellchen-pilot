"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Loader2, Mail } from "lucide-react";
import { Button } from "@/components/ui/Button";

export const LoginClient = ({ initialError }: { initialError: string | null }) => {
  const router = useRouter();
  const [mode, setMode] = useState<"password" | "magic">("password");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(initialError);
  const [magicSent, setMagicSent] = useState(false);

  const submitPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const res = await fetch("/api/portal/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const j = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string };
      if (!res.ok || !j.ok) {
        setError(j.error ?? "Login fehlgeschlagen");
        setBusy(false);
        return;
      }
      router.replace("/portal/dashboard");
      router.refresh();
    } catch {
      setError("Netzwerkfehler");
      setBusy(false);
    }
  };

  const sendMagic = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const res = await fetch("/api/portal/magic-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const j = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string };
      if (!res.ok) {
        setError(j.error ?? "Versand fehlgeschlagen");
        setBusy(false);
        return;
      }
      setMagicSent(true);
    } finally {
      setBusy(false);
    }
  };

  if (magicSent) {
    return (
      <div className="panel p-7 text-center">
        <div className="inline-flex w-11 h-11 rounded-full bg-canvas border border-hairline items-center justify-center text-ink-soft mb-3">
          <Mail size={18} />
        </div>
        <h2 className="font-display text-ink text-[20px] tracking-tightest font-bold">
          Check deine E-Mails
        </h2>
        <p className="text-[13px] text-ink-muted mt-2 leading-snug">
          Wenn diese Adresse bei einer angeschlossenen Vermietung registriert ist,
          schicken wir dir gerade einen Login-Link. Der Link ist 24 Stunden gültig.
        </p>
        <button
          type="button"
          onClick={() => {
            setMagicSent(false);
            setEmail("");
          }}
          className="mt-4 text-[12px] text-ink-muted hover:text-ink transition-colors"
        >
          Andere E-Mail verwenden
        </button>
      </div>
    );
  }

  return (
    <div className="panel p-6">
      {/* mode toggle */}
      <div className="grid grid-cols-2 gap-1 p-1 rounded-input bg-canvas border border-hairline mb-5">
        <button
          type="button"
          onClick={() => setMode("password")}
          className={`h-9 rounded-input text-[13px] font-medium transition-colors ${
            mode === "password"
              ? "bg-paper text-ink shadow-sm border border-hairline"
              : "text-ink-muted hover:text-ink"
          }`}
        >
          Passwort
        </button>
        <button
          type="button"
          onClick={() => setMode("magic")}
          className={`h-9 rounded-input text-[13px] font-medium transition-colors ${
            mode === "magic"
              ? "bg-paper text-ink shadow-sm border border-hairline"
              : "text-ink-muted hover:text-ink"
          }`}
        >
          Magic-Link
        </button>
      </div>

      <form onSubmit={mode === "password" ? submitPassword : sendMagic} className="space-y-3">
        <label className="block">
          <div className="data-label mb-1">E-Mail</div>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="field"
            placeholder="ihre@adresse.de"
            autoComplete="email"
            autoFocus
          />
        </label>

        {mode === "password" && (
          <label className="block">
            <div className="data-label mb-1">Passwort</div>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="field"
              placeholder="••••••••"
              autoComplete="current-password"
            />
          </label>
        )}

        {error && (
          <div className="text-[13px] rounded-input px-3 py-2 bg-rose-50 border border-rose-200 text-rose-700">
            {error}
          </div>
        )}

        <Button type="submit" variant="signal" size="lg" disabled={busy} className="w-full">
          {busy && <Loader2 size={14} className="animate-spin" />}
          {mode === "password" ? "Einloggen" : "Login-Link senden"}
        </Button>
      </form>

      <p className="mt-5 text-[12px] text-ink-muted text-center leading-snug">
        Du hast noch keinen Zugang? Bitte deine Vermietung um eine Einladung —
        diese erhältst du dann per E-Mail.
      </p>
    </div>
  );
};

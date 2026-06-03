"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Loader2, Mail } from "lucide-react";

const inputCls =
  "w-full h-11 px-3.5 rounded-xl bg-white ring-1 ring-zinc-200 text-[14.5px] text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500 transition-shadow";

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
      <div className="rounded-2xl bg-white ring-1 ring-zinc-200 p-7 text-center">
        <div className="inline-flex w-11 h-11 rounded-full bg-emerald-50 ring-1 ring-emerald-200 items-center justify-center text-emerald-700 mb-3">
          <Mail size={18} />
        </div>
        <h2 className="font-display text-zinc-900 text-[20px] tracking-tight font-medium">
          Check deine E-Mails
        </h2>
        <p className="text-sm text-zinc-500 mt-2">
          Wenn diese Adresse bei einer angeschlossenen Vermietung registriert ist,
          schicken wir dir gerade einen Login-Link. Der Link ist 24 Stunden gültig.
        </p>
        <button
          type="button"
          onClick={() => {
            setMagicSent(false);
            setEmail("");
          }}
          className="mt-4 text-xs text-zinc-500 hover:text-zinc-900"
        >
          Andere E-Mail verwenden
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-2xl bg-white ring-1 ring-zinc-200 p-7">
      <div className="grid grid-cols-2 gap-1 p-1 rounded-full bg-zinc-100 mb-5">
        <button
          type="button"
          onClick={() => setMode("password")}
          className={`h-9 rounded-full text-[13.5px] font-medium transition-colors ${
            mode === "password" ? "bg-white text-zinc-900 shadow-sm" : "text-zinc-500"
          }`}
        >
          Passwort
        </button>
        <button
          type="button"
          onClick={() => setMode("magic")}
          className={`h-9 rounded-full text-[13.5px] font-medium transition-colors ${
            mode === "magic" ? "bg-white text-zinc-900 shadow-sm" : "text-zinc-500"
          }`}
        >
          Magic-Link
        </button>
      </div>

      <form onSubmit={mode === "password" ? submitPassword : sendMagic} className="space-y-3">
        <label className="block">
          <div className="text-[12px] font-medium text-zinc-700 mb-1">E-Mail</div>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={inputCls}
            placeholder="ihre@adresse.de"
            autoComplete="email"
            autoFocus
          />
        </label>

        {mode === "password" && (
          <label className="block">
            <div className="text-[12px] font-medium text-zinc-700 mb-1">Passwort</div>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={inputCls}
              placeholder="••••••••"
              autoComplete="current-password"
            />
          </label>
        )}

        {error && (
          <div className="text-sm rounded-lg px-3 py-2 bg-rose-50 ring-1 ring-rose-200 text-rose-700">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={busy}
          className="w-full inline-flex items-center justify-center gap-1.5 h-11 rounded-full bg-zinc-900 text-white text-[14px] font-medium hover:bg-zinc-800 disabled:opacity-40"
        >
          {busy && <Loader2 size={14} className="animate-spin" />}
          {mode === "password" ? "Einloggen" : "Login-Link senden"}
        </button>
      </form>

      <p className="mt-5 text-[12px] text-zinc-500 text-center leading-snug">
        Du hast noch keinen Zugang? Bitte deine Vermietung um eine Einladung —
        diese erhältst du dann per E-Mail.
      </p>
    </div>
  );
};

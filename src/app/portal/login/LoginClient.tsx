"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/Button";

export const LoginClient = ({ initialError }: { initialError: string | null }) => {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(initialError);

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

  return (
    <div className="panel p-6">
      <form onSubmit={submitPassword} className="space-y-3">
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

        {error && (
          <div className="text-[13px] rounded-input px-3 py-2 bg-rose-50 border border-rose-200 text-rose-700">
            {error}
          </div>
        )}

        <Button type="submit" variant="signal" size="lg" disabled={busy} className="w-full">
          {busy && <Loader2 size={14} className="animate-spin" />}
          Einloggen
        </Button>
      </form>

      <p className="mt-5 text-[12px] text-ink-muted text-center leading-snug">
        Du hast noch keinen Zugang? Bitte deine Vermietung um Zugangsdaten
        oder einen Zugangs-Link.
      </p>
    </div>
  );
};

"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Logo } from "@/components/ui/Logo";
import { Button } from "@/components/ui/Button";

export default function ResetPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (password.length < 8) {
      setError("Passwort muss mindestens 8 Zeichen lang sein.");
      return;
    }
    if (password !== confirm) {
      setError("Die Passwörter stimmen nicht überein.");
      return;
    }
    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) {
      // Kein gültiger Recovery-Token in der Session → Link abgelaufen.
      setError(
        /session|auth/i.test(error.message)
          ? "Der Link ist abgelaufen oder ungültig. Bitte fordern Sie einen neuen an."
          : error.message
      );
      return;
    }
    router.push("/dashboard");
    router.refresh();
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-6 py-12 bg-canvas">
      <div className="w-full max-w-[400px]">
        <div className="flex justify-center mb-10">
          <Link href="/"><Logo size={30} /></Link>
        </div>
        <div className="mb-8">
          <h1 className="apple-display text-ink text-[28px] leading-[1.05]">Neues Passwort</h1>
          <p className="text-[15px] text-ink-muted mt-2">Vergeben Sie ein neues Passwort für Ihr Konto.</p>
        </div>
        <div className="bg-paper border border-hairline rounded-card shadow-panel p-6">
          <form onSubmit={onSubmit} className="space-y-4">
            <div>
              <label className="data-label block mb-1.5">Neues Passwort</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="field"
                placeholder="Mind. 8 Zeichen"
                autoComplete="new-password"
                autoFocus
              />
            </div>
            <div>
              <label className="data-label block mb-1.5">Passwort wiederholen</label>
              <input
                type="password"
                required
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                className="field"
                placeholder="••••••••"
                autoComplete="new-password"
              />
            </div>
            {error && (
              <div className="text-[13px] text-red-700 bg-red-50 border border-red-200 rounded-input px-3 py-2.5">
                {error}
              </div>
            )}
            <Button type="submit" variant="signal" size="lg" disabled={loading} className="w-full mt-1">
              {loading ? <Loader2 size={15} className="animate-spin" /> : <>Passwort speichern <ArrowRight size={15} /></>}
            </Button>
          </form>
        </div>
        <p className="mt-5 text-[13.5px] text-ink-muted text-center">
          <Link href="/login" className="font-medium text-ink hover:text-signal transition-colors">
            Zurück zum Login
          </Link>
        </p>
      </div>
    </div>
  );
}

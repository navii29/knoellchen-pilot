"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, Loader2, MailCheck } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Logo } from "@/components/ui/Logo";
import { Button } from "@/components/ui/Button";

export default function ForgotPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const supabase = createClient();
    const redirectTo = `${window.location.origin}/auth/callback?next=/reset`;
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
    setLoading(false);
    // Enumeration-sicher: immer Erfolg anzeigen.
    if (error && !/rate|limit/i.test(error.message)) {
      setError(error.message);
      return;
    }
    setSent(true);
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-6 py-12 bg-canvas">
      <div className="w-full max-w-[400px]">
        <div className="flex justify-center mb-10">
          <Link href="/"><Logo size={30} /></Link>
        </div>

        {sent ? (
          <div className="bg-paper border border-hairline rounded-card shadow-panel p-7 text-center">
            <div className="inline-flex w-11 h-11 rounded-full bg-canvas border border-hairline items-center justify-center text-ink-soft mb-3">
              <MailCheck size={18} />
            </div>
            <h1 className="apple-display text-ink text-[22px]">Prüfen Sie Ihr Postfach</h1>
            <p className="text-[14px] text-ink-muted mt-2 leading-snug">
              Falls ein Konto zu dieser Adresse existiert, haben wir Ihnen einen
              Link zum Zurücksetzen des Passworts geschickt.
            </p>
            <Link
              href="/login"
              className="mt-5 inline-block text-[13px] text-signal hover:underline"
            >
              Zurück zum Login
            </Link>
          </div>
        ) : (
          <>
            <div className="mb-8">
              <h1 className="apple-display text-ink text-[28px] leading-[1.05]">Passwort zurücksetzen</h1>
              <p className="text-[15px] text-ink-muted mt-2">
                Geben Sie Ihre E-Mail-Adresse ein — wir schicken Ihnen einen Link.
              </p>
            </div>
            <div className="bg-paper border border-hairline rounded-card shadow-panel p-6">
              <form onSubmit={onSubmit} className="space-y-4">
                <div>
                  <label className="data-label block mb-1.5">E-Mail</label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="field"
                    placeholder="ihre@autovermietung.de"
                    autoFocus
                  />
                </div>
                {error && (
                  <div className="text-[13px] text-red-700 bg-red-50 border border-red-200 rounded-input px-3 py-2.5">
                    {error}
                  </div>
                )}
                <Button type="submit" variant="signal" size="lg" disabled={loading} className="w-full mt-1">
                  {loading ? <Loader2 size={15} className="animate-spin" /> : <>Link senden <ArrowRight size={15} /></>}
                </Button>
              </form>
            </div>
            <p className="mt-5 text-[13.5px] text-ink-muted text-center">
              <Link href="/login" className="font-medium text-ink hover:text-signal transition-colors">
                Zurück zum Login
              </Link>
            </p>
          </>
        )}
      </div>
    </div>
  );
}

"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Logo } from "@/components/ui/Logo";
import { Button } from "@/components/ui/Button";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }
    router.push("/dashboard");
    router.refresh();
  };

  return (
    <div className="min-h-screen flex">
      {/* ── cinematic side panel ── */}
      <div className="hidden lg:flex lg:w-[44%] xl:w-[40%] flex-col bg-black text-white relative overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/brand/car-cinematic.webp"
          alt=""
          aria-hidden
          className="absolute inset-0 w-full h-full object-cover opacity-80"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/55 to-black/40" />
        <div className="relative flex flex-col h-full px-10 py-10">
          <Link href="/">
            <Logo tone="dark" size={32} />
          </Link>
          <div className="flex-1 flex flex-col justify-end pb-2">
            <p className="text-[14px] font-medium text-azure-sky mb-4">Für Autovermietungen</p>
            <h2 className="apple-display text-white text-[40px] leading-[1.05] mb-5 max-w-[12ch]">
              Weniger Papierkram. Mehr Vermietung.
            </h2>
            <p className="text-[15.5px] leading-relaxed text-white/65 max-w-sm">
              Strafzettel, Verträge und Übergaben — automatisch erledigt, während Sie sich
              um Ihre Kunden kümmern.
            </p>
          </div>
        </div>
      </div>

      {/* ── light form side ── */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12 bg-canvas">
        <div className="w-full max-w-[400px]">
          {/* logo for mobile */}
          <div className="flex justify-center mb-10 lg:hidden">
            <Link href="/"><Logo size={30} /></Link>
          </div>

          <div className="mb-8">
            <h1 className="apple-display text-ink text-[32px] leading-[1.05]">
              Willkommen zurück
            </h1>
            <p className="text-[15px] text-ink-muted mt-2">Melden Sie sich bei Ihrem Konto an.</p>
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
                />
              </div>
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="data-label">Passwort</label>
                  <Link
                    href="/forgot"
                    className="text-[12px] text-ink-muted hover:text-signal transition-colors"
                  >
                    Passwort vergessen?
                  </Link>
                </div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="field"
                  placeholder="••••••••"
                />
              </div>

              {error && (
                <div className="text-[13px] text-red-700 bg-red-50 border border-red-200 rounded-input px-3 py-2.5">
                  {error}
                </div>
              )}

              <Button
                type="submit"
                variant="signal"
                size="lg"
                disabled={loading}
                className="w-full mt-1"
              >
                {loading ? (
                  <Loader2 size={15} className="animate-spin" />
                ) : (
                  <>Anmelden <ArrowRight size={15} /></>
                )}
              </Button>
            </form>
          </div>

          <p className="mt-5 text-[13.5px] text-ink-muted text-center">
            Noch kein Konto?{" "}
            <Link href="/register" className="font-medium text-ink hover:text-signal transition-colors">
              Jetzt registrieren
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Logo } from "@/components/ui/Logo";
import { Button } from "@/components/ui/Button";
import { Plate } from "@/components/ui/Plate";

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
      {/* ── dark void side panel ── */}
      <div className="hidden lg:flex lg:w-[44%] xl:w-[40%] flex-col bg-void text-on-dark relative overflow-hidden">
        <div className="absolute inset-0 grid-dark [mask-image:radial-gradient(110%_80%_at_50%_10%,#000_30%,transparent_85%)]" />
        <div className="relative flex flex-col h-full px-10 py-10">
          <Link href="/">
            <Logo tone="dark" size={32} />
          </Link>
          <div className="flex-1 flex flex-col justify-center">
            <span className="kicker text-white/45 mb-5">Die Leitstelle für Autovermietungen</span>
            <h2 className="font-display font-extrabold text-white text-[36px] leading-[1.05] tracking-tightest mb-6">
              Ihr Kontrollraum<br />wartet auf Sie.
            </h2>
            <p className="text-[15px] leading-relaxed text-white/55 max-w-xs">
              Strafzettel, Verträge, Übergaben und Schäden — alles läuft in einer Leitstelle zusammen.
            </p>
          </div>
          {/* plate motif */}
          <div className="flex items-end justify-between">
            <div className="flex flex-col gap-2">
              <Plate value="B-KP 2041" size="md" />
              <span className="font-mono text-[11px] text-white/30">AZ · KP-2041 · 55,00 €</span>
            </div>
            <div className="font-mono text-[11px] text-white/25 text-right leading-relaxed">
              DSGVO-konform<br />Daten in der EU
            </div>
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
            <span className="kicker text-ink-muted mb-3 block">Leitstelle</span>
            <h1 className="font-display font-extrabold text-ink text-[28px] tracking-tightest leading-[1.05]">
              Anmelden
            </h1>
            <p className="text-[14px] text-ink-muted mt-1.5">Willkommen zurück</p>
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
                <label className="data-label block mb-1.5">Passwort</label>
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

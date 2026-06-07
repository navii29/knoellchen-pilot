"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Logo } from "@/components/ui/Logo";
import { Button } from "@/components/ui/Button";
import { Plate } from "@/components/ui/Plate";

export default function RegisterPage() {
  const router = useRouter();
  const [orgName, setOrgName] = useState("");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const supabase = createClient();
    const { data: signUp, error: signUpErr } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName, org_name: orgName } },
    });
    if (signUpErr) {
      setError(signUpErr.message);
      setLoading(false);
      return;
    }

    if (!signUp.session) {
      const { error: signInErr } = await supabase.auth.signInWithPassword({ email, password });
      if (signInErr) {
        setError(signInErr.message);
        setLoading(false);
        return;
      }
    }

    const res = await fetch("/api/auth/bootstrap", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ org_name: orgName, full_name: fullName }),
    });
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setError(j.error || "Konnte Organisation nicht anlegen.");
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
            <span className="kicker text-white/45 mb-5">14 Tage gratis testen</span>
            <h2 className="font-display font-extrabold text-white text-[36px] leading-[1.05] tracking-tightest mb-6">
              Der Papierkram<br />fährt ab heute.
            </h2>
            <ul className="space-y-3 text-[14.5px] text-white/55">
              <li className="flex items-center gap-2.5">
                <span className="w-1 h-1 rounded-full bg-signal shrink-0" />
                Strafzettel automatisch auslesen (KI)
              </li>
              <li className="flex items-center gap-2.5">
                <span className="w-1 h-1 rounded-full bg-signal shrink-0" />
                Fahrer in Sekunden zuordnen
              </li>
              <li className="flex items-center gap-2.5">
                <span className="w-1 h-1 rounded-full bg-signal shrink-0" />
                Verträge, Übergaben, Schäden — alles digital
              </li>
              <li className="flex items-center gap-2.5">
                <span className="w-1 h-1 rounded-full bg-signal shrink-0" />
                Keine Kreditkarte erforderlich
              </li>
            </ul>
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
            <span className="kicker text-ink-muted mb-3 block">Konto anlegen</span>
            <h1 className="font-display font-extrabold text-ink text-[28px] tracking-tightest leading-[1.05]">
              Leitstelle einrichten
            </h1>
            <p className="text-[14px] text-ink-muted mt-1.5">30 Tage gratis · keine Kreditkarte</p>
          </div>

          <div className="bg-paper border border-hairline rounded-card shadow-panel p-6">
            <form onSubmit={onSubmit} className="space-y-4">
              <div>
                <label className="data-label block mb-1.5">Firmenname</label>
                <input
                  required
                  value={orgName}
                  onChange={(e) => setOrgName(e.target.value)}
                  className="field"
                  placeholder="Stadtflotte München"
                />
              </div>
              <div>
                <label className="data-label block mb-1.5">Ihr Name</label>
                <input
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="field"
                  placeholder="Max Mustermann"
                />
              </div>
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
                  minLength={8}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="field"
                  placeholder="Mind. 8 Zeichen"
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
                  <>Konto erstellen <ArrowRight size={15} /></>
                )}
              </Button>
            </form>
          </div>

          <p className="mt-5 text-[13.5px] text-ink-muted text-center">
            Schon registriert?{" "}
            <Link href="/login" className="font-medium text-ink hover:text-signal transition-colors">
              Anmelden
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Loader2, Mail } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { THEME } from "@/lib/theme";
import { Logo } from "@/components/ui/Logo";
import { mapAuthError } from "@/lib/auth-errors";

export default function RegisterPage() {
  const router = useRouter();
  const [orgName, setOrgName] = useState("");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [checkInbox, setCheckInbox] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const supabase = createClient();
    const { data: signUp, error: signUpErr } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName, org_name: orgName },
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    if (signUpErr) {
      setError(mapAuthError(signUpErr.message));
      setLoading(false);
      return;
    }

    // Keine Session => Supabase verlangt E-Mail-Bestätigung. "Postfach prüfen"-
    // Zustand zeigen; der Link landet auf /auth/callback und legt das Konto an.
    if (!signUp.session) {
      setCheckInbox(true);
      setLoading(false);
      return;
    }

    // Session vorhanden (Bestätigung deaktiviert) => direkt Organisation anlegen.
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
    <div className="min-h-screen flex items-center justify-center px-6 bg-zinc-50 py-10">
      <div className="w-full max-w-md">
        <div className="flex justify-center mb-10">
          <Link href="/"><Logo /></Link>
        </div>
        <div className="rounded-2xl bg-white ring-1 ring-zinc-200 p-8 shadow-sm">
          {checkInbox ? (
            <div className="text-center py-4">
              <div className="mx-auto mb-4 w-12 h-12 rounded-full bg-indigo-50 ring-1 ring-indigo-200 flex items-center justify-center">
                <Mail size={20} className="text-indigo-600" />
              </div>
              <h1 className="font-display font-bold text-2xl tracking-tight">Fast geschafft!</h1>
              <p className="text-sm text-zinc-500 mt-2 leading-relaxed">
                Wir haben Ihnen eine Bestätigungs-E-Mail an{" "}
                <span className="font-medium text-zinc-900">{email}</span> geschickt.
                Klicken Sie auf den Link darin, um Ihr Konto zu aktivieren.
              </p>
              <p className="text-xs text-zinc-400 mt-4">
                Keine E-Mail erhalten? Bitte prüfen Sie Ihren Spam-Ordner.
              </p>
              <Link
                href="/login"
                className="mt-6 inline-block text-sm font-medium text-zinc-900 hover:underline"
              >
                Zur Anmeldung
              </Link>
            </div>
          ) : (
          <>
          <h1 className="font-display font-bold text-2xl tracking-tight">Konto anlegen</h1>
          <p className="text-sm text-zinc-500 mt-1">30 Tage gratis · keine Kreditkarte</p>

          <form onSubmit={onSubmit} className="mt-7 space-y-4">
            <div>
              <label className="text-xs uppercase tracking-wider text-zinc-500 font-medium">Firmenname</label>
              <input
                required
                value={orgName}
                onChange={(e) => setOrgName(e.target.value)}
                className="mt-1.5 w-full px-3 py-2.5 text-sm rounded-lg ring-1 ring-zinc-200 outline-none focus:ring-zinc-400"
                placeholder="Stadtflotte München"
              />
            </div>
            <div>
              <label className="text-xs uppercase tracking-wider text-zinc-500 font-medium">Ihr Name</label>
              <input
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="mt-1.5 w-full px-3 py-2.5 text-sm rounded-lg ring-1 ring-zinc-200 outline-none focus:ring-zinc-400"
                placeholder="Max Mustermann"
              />
            </div>
            <div>
              <label className="text-xs uppercase tracking-wider text-zinc-500 font-medium">E-Mail</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1.5 w-full px-3 py-2.5 text-sm rounded-lg ring-1 ring-zinc-200 outline-none focus:ring-zinc-400"
                placeholder="ihre@autovermietung.de"
              />
            </div>
            <div>
              <label className="text-xs uppercase tracking-wider text-zinc-500 font-medium">Passwort</label>
              <input
                type="password"
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1.5 w-full px-3 py-2.5 text-sm rounded-lg ring-1 ring-zinc-200 outline-none focus:ring-zinc-400"
                placeholder="Mind. 8 Zeichen"
              />
            </div>

            {error && (
              <div className="text-sm text-red-700 bg-red-50 ring-1 ring-red-200 rounded-lg px-3 py-2">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full inline-flex items-center justify-center gap-1.5 text-white px-4 py-2.5 rounded-lg text-sm font-semibold disabled:opacity-50"
              style={{ background: THEME.primary }}
            >
              {loading ? <Loader2 size={14} className="animate-spin" /> : <>Konto erstellen <ArrowRight size={14} /></>}
            </button>

            <p className="text-[11.5px] text-zinc-400 text-center leading-snug">
              Mit der Registrierung akzeptieren Sie unsere{" "}
              <Link href="/agb" className="underline hover:text-zinc-600">AGB</Link>{" "}
              und{" "}
              <Link href="/datenschutz" className="underline hover:text-zinc-600">
                Datenschutzerklärung
              </Link>
              .
            </p>
          </form>

          <div className="mt-6 text-sm text-zinc-500 text-center">
            Schon registriert?{" "}
            <Link href="/login" className="font-medium text-zinc-900 hover:underline">
              Anmelden
            </Link>
          </div>
          </>
          )}
        </div>
      </div>
    </div>
  );
}

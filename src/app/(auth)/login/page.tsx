"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { THEME } from "@/lib/theme";
import { Logo } from "@/components/ui/Logo";
import { mapAuthError, mapQueryError } from "@/lib/auth-errors";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const code = new URLSearchParams(window.location.search).get("error");
    const msg = mapQueryError(code);
    if (msg) setError(msg);
    // Kaputtes/unvollständiges Konto: hängende Session beenden, damit kein
    // Redirect-Loop entsteht und der Nutzer neu anmelden/registrieren kann.
    if (code === "no_profile" || code === "no_org") {
      createClient().auth.signOut().catch(() => {});
    }
  }, []);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setError(mapAuthError(error.message));
      setLoading(false);
      return;
    }
    router.push("/dashboard");
    router.refresh();
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-6 bg-zinc-50">
      <div className="w-full max-w-md">
        <div className="flex justify-center mb-10">
          <Link href="/"><Logo /></Link>
        </div>
        <div className="rounded-2xl bg-white ring-1 ring-zinc-200 p-8 shadow-sm">
          <h1 className="font-display font-bold text-2xl tracking-tight">Anmelden</h1>
          <p className="text-sm text-zinc-500 mt-1">Willkommen zurück</p>

          <form onSubmit={onSubmit} className="mt-7 space-y-4">
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
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1.5 w-full px-3 py-2.5 text-sm rounded-lg ring-1 ring-zinc-200 outline-none focus:ring-zinc-400"
                placeholder="••••••••"
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
              {loading ? <Loader2 size={14} className="animate-spin" /> : <>Anmelden <ArrowRight size={14} /></>}
            </button>
          </form>

          <div className="mt-6 text-sm text-zinc-500 text-center">
            Noch kein Konto?{" "}
            <Link href="/register" className="font-medium text-zinc-900 hover:underline">
              Jetzt registrieren
            </Link>
          </div>
        </div>
        <div className="mt-6 flex items-center justify-center gap-4 text-[12px] text-zinc-400">
          <Link href="/impressum" className="hover:text-zinc-600">Impressum</Link>
          <Link href="/datenschutz" className="hover:text-zinc-600">Datenschutz</Link>
          <Link href="/agb" className="hover:text-zinc-600">AGB</Link>
        </div>
      </div>
    </div>
  );
}

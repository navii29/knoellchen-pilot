"use client";

import { useState } from "react";
import { CheckCircle2, KeyRound, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Panel, PanelHeader } from "@/components/ui/Panel";
import { Button } from "@/components/ui/Button";

/**
 * Eigenes Login-Passwort ändern. Verifiziert zuerst das aktuelle Passwort
 * (Re-Auth), damit eine offene Sitzung nicht ohne Kenntnis des alten Passworts
 * übernommen werden kann, und setzt dann das neue per Supabase Auth.
 */
export const PasswordCard = () => {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setDone(false);
    if (next.length < 8) {
      setError("Das neue Passwort muss mindestens 8 Zeichen haben.");
      return;
    }
    if (next !== confirm) {
      setError("Die neuen Passwörter stimmen nicht überein.");
      return;
    }
    if (next === current) {
      setError("Das neue Passwort darf nicht dem aktuellen entsprechen.");
      return;
    }

    setBusy(true);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user?.email) {
      setBusy(false);
      setError("Nicht angemeldet. Bitte neu einloggen.");
      return;
    }

    // 1) Aktuelles Passwort prüfen (Re-Authentifizierung).
    const { error: signErr } = await supabase.auth.signInWithPassword({
      email: user.email,
      password: current,
    });
    if (signErr) {
      setBusy(false);
      setError("Das aktuelle Passwort ist falsch.");
      return;
    }

    // 2) Neues Passwort setzen.
    const { error: updErr } = await supabase.auth.updateUser({ password: next });
    setBusy(false);
    if (updErr) {
      setError(updErr.message || "Passwort konnte nicht geändert werden.");
      return;
    }

    setCurrent("");
    setNext("");
    setConfirm("");
    setDone(true);
  };

  return (
    <Panel flush>
      <PanelHeader Icon={KeyRound} title="Passwort ändern" />
      <form onSubmit={submit} className="p-5 space-y-4 max-w-sm">
        <label className="block">
          <div className="data-label mb-1">Aktuelles Passwort</div>
          <input
            type="password"
            autoComplete="current-password"
            value={current}
            onChange={(e) => setCurrent(e.target.value)}
            className="field"
            required
          />
        </label>
        <label className="block">
          <div className="data-label mb-1">Neues Passwort</div>
          <input
            type="password"
            autoComplete="new-password"
            value={next}
            onChange={(e) => setNext(e.target.value)}
            className="field"
            required
            minLength={8}
          />
          <div className="text-[11px] text-ink-muted mt-1">Mindestens 8 Zeichen.</div>
        </label>
        <label className="block">
          <div className="data-label mb-1">Neues Passwort wiederholen</div>
          <input
            type="password"
            autoComplete="new-password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            className="field"
            required
          />
        </label>

        {error && (
          <div className="text-[13px] text-red-700 bg-red-50 border border-red-200 rounded-frame px-3 py-2">
            {error}
          </div>
        )}
        {done && (
          <div className="inline-flex items-center gap-1.5 text-[13px] text-emerald-700">
            <CheckCircle2 size={14} /> Passwort geändert.
          </div>
        )}

        <Button type="submit" variant="signal" size="sm" disabled={busy}>
          {busy ? <Loader2 size={14} className="animate-spin" /> : <KeyRound size={14} />}
          Passwort ändern
        </Button>
      </form>
    </Panel>
  );
};

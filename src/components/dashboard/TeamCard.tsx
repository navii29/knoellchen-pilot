"use client";

import { useEffect, useState } from "react";
import { Loader2, Trash2, UserPlus, ShieldCheck, User, SlidersHorizontal } from "lucide-react";
import { PERMISSION_CATALOG } from "@/lib/permissions";

type Member = {
  id: string;
  full_name: string | null;
  email: string | null;
  role: string;
  created_at: string;
  permissions: string[];
};

export const TeamCard = () => {
  const [members, setMembers] = useState<Member[]>([]);
  const [role, setRole] = useState<string>("member");
  const [meId, setMeId] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  // Formular
  const [showForm, setShowForm] = useState(false);
  const [fName, setFName] = useState("");
  const [fEmail, setFEmail] = useState("");
  const [fPass, setFPass] = useState("");
  const [busy, setBusy] = useState(false);
  const [rightsFor, setRightsFor] = useState<string | null>(null);

  const load = async () => {
    const res = await fetch("/api/team");
    const j = (await res.json().catch(() => ({}))) as {
      ok?: boolean;
      role?: string;
      me?: string;
      members?: Member[];
      error?: string;
    };
    setLoading(false);
    if (!res.ok || !j.ok) {
      setErr(j.error ?? "Team konnte nicht geladen werden");
      return;
    }
    setMembers(j.members ?? []);
    setRole(j.role ?? "member");
    setMeId(j.me ?? "");
  };

  useEffect(() => {
    load();
  }, []);

  const isOwner = role === "owner";

  const addMember = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    setMsg(null);
    setBusy(true);
    const res = await fetch("/api/team", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ full_name: fName, email: fEmail, password: fPass }),
    });
    const j = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string };
    setBusy(false);
    if (!res.ok || !j.ok) {
      setErr(j.error ?? "Konnte das Mitglied nicht anlegen");
      return;
    }
    setMsg(`${fEmail} angelegt. Bitte Zugangsdaten an die Person weitergeben — sie kann das Passwort danach selbst ändern.`);
    setFName("");
    setFEmail("");
    setFPass("");
    setShowForm(false);
    load();
  };

  const removeMember = async (m: Member) => {
    if (!confirm(`${m.email} wirklich aus dem Team entfernen?`)) return;
    setErr(null);
    setMsg(null);
    const res = await fetch(`/api/team/${m.id}`, { method: "DELETE" });
    const j = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string };
    if (!res.ok || !j.ok) {
      setErr(j.error ?? "Entfernen fehlgeschlagen");
      return;
    }
    load();
  };

  const toggleRole = async (m: Member) => {
    const next = m.role === "owner" ? "member" : "owner";
    setErr(null);
    const res = await fetch(`/api/team/${m.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role: next }),
    });
    const j = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string };
    if (!res.ok || !j.ok) {
      setErr(j.error ?? "Rolle konnte nicht geändert werden");
      return;
    }
    load();
  };

  const updatePermissions = async (m: Member, key: string, checked: boolean) => {
    const next = checked
      ? [...new Set([...(m.permissions ?? []), key])]
      : (m.permissions ?? []).filter((p) => p !== key);
    setErr(null);
    // Optimistisch aktualisieren, bei Fehler neu laden.
    setMembers((prev) => prev.map((x) => (x.id === m.id ? { ...x, permissions: next } : x)));
    const res = await fetch(`/api/team/${m.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ permissions: next }),
    });
    const j = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string };
    if (!res.ok || !j.ok) {
      setErr(j.error ?? "Rechte konnten nicht gespeichert werden");
      load();
    }
  };

  return (
    <div className="panel p-5">
      <div className="flex items-center justify-between mb-1">
        <h3 className="font-display font-semibold text-ink text-[15px]">Team</h3>
        {isOwner && (
          <button
            type="button"
            onClick={() => setShowForm((v) => !v)}
            className="inline-flex items-center gap-1.5 text-[13px] px-3 h-8 rounded-btn bg-signal text-white hover:bg-signal-strong transition-colors"
          >
            <UserPlus size={14} /> Mitglied
          </button>
        )}
      </div>
      <p className="text-[12.5px] text-ink-muted mb-4">
        Mitarbeiter mit eigenem Login. {isOwner ? "Sie sind Inhaber." : "Nur Inhaber können das Team verwalten."}
      </p>

      {loading ? (
        <div className="flex items-center gap-2 text-[13px] text-ink-muted py-3">
          <Loader2 size={14} className="animate-spin" /> Laden…
        </div>
      ) : (
        <div className="space-y-1.5">
          {members.map((m) => {
            const isMemberRole = m.role !== "owner";
            const open = rightsFor === m.id;
            return (
              <div key={m.id}>
                <div className="flex items-center gap-3 px-3 py-2.5 rounded-input border border-hairline bg-paper">
                  <div className="w-8 h-8 rounded-full bg-canvas border border-hairline flex items-center justify-center text-ink-muted shrink-0">
                    {m.role === "owner" ? <ShieldCheck size={15} /> : <User size={15} />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[13.5px] text-ink truncate">
                      {m.full_name || m.email}
                      {m.id === meId && <span className="text-ink-muted"> · Sie</span>}
                    </div>
                    <div className="text-[12px] text-ink-muted truncate">{m.email}</div>
                  </div>
                  <span
                    className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${
                      m.role === "owner" ? "bg-signal/12 text-signal" : "bg-black/[0.05] text-ink-muted"
                    }`}
                  >
                    {m.role === "owner" ? "Inhaber" : "Mitglied"}
                  </span>
                  {isOwner && m.id !== meId && (
                    <div className="flex items-center gap-1 shrink-0">
                      {isMemberRole && (
                        <button
                          type="button"
                          onClick={() => setRightsFor(open ? null : m.id)}
                          className={`text-[11px] px-2 h-7 rounded-btn inline-flex items-center gap-1 ${
                            open ? "bg-signal/12 text-signal" : "text-ink-muted hover:text-ink hover:bg-black/[0.04]"
                          }`}
                          title="Rechte"
                        >
                          <SlidersHorizontal size={13} /> Rechte
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => toggleRole(m)}
                        className="text-[11px] text-ink-muted hover:text-ink px-2 h-7 rounded-btn hover:bg-black/[0.04]"
                        title="Rolle wechseln"
                      >
                        {m.role === "owner" ? "→ Mitglied" : "→ Inhaber"}
                      </button>
                      <button
                        type="button"
                        onClick={() => removeMember(m)}
                        className="text-ink-muted hover:text-red-600 w-7 h-7 inline-flex items-center justify-center rounded-btn hover:bg-red-50"
                        title="Entfernen"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  )}
                </div>

                {isOwner && isMemberRole && open && (
                  <div className="mt-1.5 mb-1 ml-3 mr-1 p-3 rounded-input border border-hairline bg-canvas">
                    <div className="text-[11px] text-ink-muted mb-2.5">
                      Rechte für {m.full_name || m.email}. Margen, Kosten und Partner bleiben
                      grundsätzlich nur dem Inhaber vorbehalten.
                    </div>
                    <div className="grid sm:grid-cols-2 gap-x-4 gap-y-1">
                      {PERMISSION_CATALOG.map((p) => {
                        const checked = (m.permissions ?? []).includes(p.key);
                        return (
                          <label
                            key={p.key}
                            className="flex items-start gap-2 cursor-pointer text-[12.5px] py-1"
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={(e) => updatePermissions(m, p.key, e.target.checked)}
                              className="mt-0.5 w-3.5 h-3.5 accent-signal shrink-0"
                            />
                            <span className="leading-snug">
                              <span className="text-ink font-medium">{p.label}</span>
                              <span className="text-ink-muted"> — {p.description}</span>
                            </span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {showForm && isOwner && (
        <form onSubmit={addMember} className="mt-4 p-4 rounded-panel border border-hairline bg-canvas space-y-3">
          <div className="grid sm:grid-cols-2 gap-3">
            <input
              value={fName}
              onChange={(e) => setFName(e.target.value)}
              className="field"
              placeholder="Name"
            />
            <input
              type="email"
              required
              value={fEmail}
              onChange={(e) => setFEmail(e.target.value)}
              className="field"
              placeholder="kollege@firma.de"
            />
          </div>
          <input
            type="text"
            required
            value={fPass}
            onChange={(e) => setFPass(e.target.value)}
            className="field"
            placeholder="Start-Passwort (mind. 8 Zeichen)"
          />
          <div className="flex items-center gap-2">
            <button
              type="submit"
              disabled={busy}
              className="inline-flex items-center gap-1.5 text-[13px] px-4 h-9 rounded-btn bg-signal text-white hover:bg-signal-strong disabled:opacity-50"
            >
              {busy && <Loader2 size={14} className="animate-spin" />} Anlegen
            </button>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="text-[13px] text-ink-muted hover:text-ink px-3 h-9"
            >
              Abbrechen
            </button>
          </div>
        </form>
      )}

      {msg && (
        <div className="mt-3 text-[12.5px] text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-input px-3 py-2">
          {msg}
        </div>
      )}
      {err && (
        <div className="mt-3 text-[12.5px] text-red-700 bg-red-50 border border-red-200 rounded-input px-3 py-2">
          {err}
        </div>
      )}
    </div>
  );
};

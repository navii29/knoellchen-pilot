"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Pencil, X } from "lucide-react";

// Inline-Bearbeitung der Behörde inkl. voller Postanschrift (für den
// Zeugenfragebogen-Empfänger). Nutzt die org-scoped PATCH-Route; die Felder
// authority/authority_street/authority_zip/authority_city sind dort erlaubt.
// So lassen sich fehlende oder falsch ausgelesene KI-Werte korrigieren.
type Fields = {
  authority: string | null;
  authority_street: string | null;
  authority_zip: string | null;
  authority_city: string | null;
};

export const AuthorityEditor = ({
  ticketId,
  value,
}: {
  ticketId: string;
  value: Fields;
}) => {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    authority: value.authority ?? "",
    authority_street: value.authority_street ?? "",
    authority_zip: value.authority_zip ?? "",
    authority_city: value.authority_city ?? "",
  });

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const save = async () => {
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/tickets/${ticketId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        authority: form.authority.trim() || null,
        authority_street: form.authority_street.trim() || null,
        authority_zip: form.authority_zip.trim() || null,
        authority_city: form.authority_city.trim() || null,
      }),
    });
    setBusy(false);
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setError(j.error || "Speichern fehlgeschlagen");
      return;
    }
    setEditing(false);
    router.refresh();
  };

  const cancel = () => {
    setForm({
      authority: value.authority ?? "",
      authority_street: value.authority_street ?? "",
      authority_zip: value.authority_zip ?? "",
      authority_city: value.authority_city ?? "",
    });
    setError(null);
    setEditing(false);
  };

  const cityLine = [value.authority_zip, value.authority_city].filter(Boolean).join(" ");
  const inputCls =
    "px-2 py-1 rounded-btn border border-hairline bg-canvas text-ink text-[13px] outline-none focus:border-signal/40 focus:ring-2 focus:ring-signal/15";

  return (
    <div className="grid grid-cols-[160px_1fr] gap-3 px-5 py-2.5 text-[13.5px]">
      <div className="data-label text-ink-muted">Behörde</div>
      {editing ? (
        <div className="flex flex-col gap-1.5">
          <input autoFocus value={form.authority} onChange={set("authority")} placeholder="Name der Behörde" className={inputCls} />
          <input value={form.authority_street} onChange={set("authority_street")} placeholder="Straße + Hausnummer" className={inputCls} />
          <div className="flex gap-1.5">
            <input value={form.authority_zip} onChange={set("authority_zip")} placeholder="PLZ" className={`${inputCls} w-24 font-mono tnum`} />
            <input value={form.authority_city} onChange={set("authority_city")} placeholder="Ort" className={`${inputCls} flex-1`} />
          </div>
          <div className="flex items-center gap-1.5 mt-0.5">
            <button onClick={save} disabled={busy} aria-label="Speichern" className="w-7 h-7 inline-flex items-center justify-center rounded-btn text-emerald-700 hover:bg-emerald-50 disabled:opacity-50">
              <Check size={14} />
            </button>
            <button onClick={cancel} disabled={busy} aria-label="Abbrechen" className="w-7 h-7 inline-flex items-center justify-center rounded-btn text-ink-muted hover:bg-canvas disabled:opacity-50">
              <X size={14} />
            </button>
          </div>
          {error && <span className="text-[12px] text-red-700">{error}</span>}
        </div>
      ) : (
        <div className="flex items-start gap-2 group">
          <div className="text-ink leading-snug">
            <div>{value.authority || "—"}</div>
            {value.authority_street && <div className="text-ink-muted">{value.authority_street}</div>}
            {cityLine && <div className="text-ink-muted font-mono tnum">{cityLine}</div>}
          </div>
          <button onClick={() => setEditing(true)} aria-label="Behörde bearbeiten" className="w-6 h-6 inline-flex items-center justify-center rounded-btn text-ink-muted hover:text-ink hover:bg-canvas transition-colors shrink-0">
            <Pencil size={12} />
          </button>
        </div>
      )}
    </div>
  );
};

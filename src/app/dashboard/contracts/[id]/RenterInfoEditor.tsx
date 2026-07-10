"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Pencil, X } from "lucide-react";

// Inline-Nachtrag von Anschrift + Geburtsdatum am Mieter (fehlen oft bei
// importierten Alt-Verträgen). Nutzt die org-scoped PATCH-Route; renter_address
// und renter_birthday sind dort erlaubt. Diese Felder speisen den
// Zeugenfragebogen; ohne verknüpften Kunden gibt es keinen Fallback.
export const RenterInfoEditor = ({
  contractId,
  address,
  birthday,
}: {
  contractId: string;
  address: string | null;
  birthday: string | null;
}) => {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [addr, setAddr] = useState(address ?? "");
  const [bday, setBday] = useState(birthday ?? "");

  const save = async () => {
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/contracts/${contractId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        renter_address: addr.trim() || null,
        renter_birthday: bday.trim() || null,
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
    setAddr(address ?? "");
    setBday(birthday ?? "");
    setError(null);
    setEditing(false);
  };

  const inputCls =
    "px-2 py-1 rounded-btn border border-hairline bg-canvas text-ink text-[13px] outline-none focus:border-signal/40 focus:ring-2 focus:ring-signal/15";

  if (editing) {
    return (
      <div className="flex flex-col gap-1.5 text-[13px]">
        <input autoFocus value={addr} onChange={(e) => setAddr(e.target.value)} placeholder="Anschrift (Straße, PLZ Ort)" className={inputCls} />
        <input value={bday} onChange={(e) => setBday(e.target.value)} placeholder="Geburtsdatum (YYYY-MM-DD)" className={`${inputCls} font-mono tnum`} />
        <div className="flex items-center gap-1.5">
          <button onClick={save} disabled={busy} aria-label="Speichern" className="w-7 h-7 inline-flex items-center justify-center rounded-btn text-emerald-700 hover:bg-emerald-50 disabled:opacity-50">
            <Check size={14} />
          </button>
          <button onClick={cancel} disabled={busy} aria-label="Abbrechen" className="w-7 h-7 inline-flex items-center justify-center rounded-btn text-ink-muted hover:bg-canvas disabled:opacity-50">
            <X size={14} />
          </button>
        </div>
        {error && <span className="text-[12px] text-red-700">{error}</span>}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1 text-[13px]">
      <div className="grid grid-cols-[120px_1fr] gap-2">
        <div className="text-ink-muted text-[12px]">Anschrift</div>
        <div className="flex items-center gap-2 group">
          <span className="text-ink">{address || "—"}</span>
          <button onClick={() => setEditing(true)} aria-label="Mieterdaten bearbeiten" className="w-6 h-6 inline-flex items-center justify-center rounded-btn text-ink-muted hover:text-ink hover:bg-canvas transition-colors">
            <Pencil size={12} />
          </button>
        </div>
      </div>
      <div className="grid grid-cols-[120px_1fr] gap-2">
        <div className="text-ink-muted text-[12px]">Geburtsdatum</div>
        <div className="font-mono tnum text-ink">{birthday || "—"}</div>
      </div>
    </div>
  );
};

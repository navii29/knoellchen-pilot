"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Download, Loader2, Trash2, X } from "lucide-react";
import { THEME } from "@/lib/theme";
import type { Contract } from "@/lib/types";

export const ContractActions = ({
  contract,
  pdfUrl,
}: {
  contract: Contract;
  pdfUrl: string | null;
}) => {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showReturn, setShowReturn] = useState(false);
  const [returnDate, setReturnDate] = useState(new Date().toISOString().slice(0, 10));
  const [kmReturn, setKmReturn] = useState("");

  const patch = async (key: string, body: Record<string, unknown>) => {
    setBusy(key);
    setError(null);
    const res = await fetch(`/api/contracts/${contract.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    setBusy(null);
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setError(j.error || "Fehler");
      return false;
    }
    router.refresh();
    return true;
  };

  const closeContract = async () => {
    const ok = await patch("close", {
      status: "abgeschlossen",
      actual_return_date: returnDate,
      km_return: kmReturn ? Number(kmReturn) : null,
    });
    if (ok) setShowReturn(false);
  };

  const remove = async () => {
    if (!confirm(`Vertrag ${contract.contract_nr} wirklich löschen?`)) return;
    setBusy("delete");
    const res = await fetch(`/api/contracts/${contract.id}`, { method: "DELETE" });
    setBusy(null);
    if (res.ok) router.push("/dashboard/contracts");
  };

  return (
    <div className="rounded-xl bg-white ring-1 ring-stone-200 p-5">
      <div className="flex items-center gap-2 flex-wrap">
        {pdfUrl && (
          <a
            href={pdfUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-md ring-1 ring-stone-200 hover:bg-stone-50"
          >
            <Download size={14} /> Vertrags-PDF anzeigen
          </a>
        )}

        {contract.status === "aktiv" && !showReturn && (
          <button
            onClick={() => setShowReturn(true)}
            className="inline-flex items-center gap-1.5 text-sm text-white px-3 py-1.5 rounded-md font-medium"
            style={{ background: THEME.primary }}
          >
            <Check size={14} /> Rückgabe erfassen
          </button>
        )}

        {contract.status !== "storniert" && (
          <button
            onClick={() => patch("cancel", { status: "storniert" })}
            disabled={busy != null}
            className="inline-flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-md ring-1 ring-stone-200 hover:bg-stone-50 text-stone-700"
          >
            {busy === "cancel" ? <Loader2 size={14} className="animate-spin" /> : <X size={14} />}
            Stornieren
          </button>
        )}

        <div className="ml-auto">
          <button
            onClick={remove}
            disabled={busy != null}
            className="inline-flex items-center gap-1.5 text-sm px-2.5 py-1.5 rounded-md text-stone-500 hover:text-red-600"
          >
            <Trash2 size={14} /> Löschen
          </button>
        </div>
      </div>

      {showReturn && (
        <div className="mt-4 grid sm:grid-cols-[1fr_1fr_auto] gap-3 items-end">
          <label className="block">
            <div className="text-[11px] uppercase tracking-wider text-stone-500 font-medium mb-1">
              Tatsächliches Rückgabedatum
            </div>
            <input
              type="date"
              value={returnDate}
              onChange={(e) => setReturnDate(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-lg ring-1 ring-stone-200 outline-none focus:ring-stone-400"
            />
          </label>
          <label className="block">
            <div className="text-[11px] uppercase tracking-wider text-stone-500 font-medium mb-1">
              km bei Rückgabe
            </div>
            <input
              value={kmReturn}
              onChange={(e) => setKmReturn(e.target.value)}
              placeholder="z.B. 12450"
              className="w-full px-3 py-2 text-sm rounded-lg ring-1 ring-stone-200 outline-none focus:ring-stone-400 font-mono"
            />
          </label>
          <button
            onClick={closeContract}
            disabled={busy != null}
            className="inline-flex items-center gap-1.5 text-sm text-white px-4 py-2 rounded-md font-medium"
            style={{ background: THEME.primary }}
          >
            {busy === "close" ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />} Abschließen
          </button>
        </div>
      )}

      {error && (
        <div className="mt-3 text-sm text-red-700 bg-red-50 ring-1 ring-red-200 rounded-lg px-3 py-2">{error}</div>
      )}
    </div>
  );
};

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Info, Loader2, X } from "lucide-react";

export const DemoDataBanner = () => {
  const router = useRouter();
  const [hidden, setHidden] = useState(false);
  const [removing, setRemoving] = useState(false);

  if (hidden) return null;

  const remove = async () => {
    setRemoving(true);
    try {
      await fetch("/api/demo/seed", { method: "DELETE" });
      setHidden(true);
      router.refresh();
    } catch {
      setRemoving(false);
    }
  };

  return (
    <div className="flex items-center gap-3 px-4 md:px-10 py-2.5 bg-amber-50 border-b border-amber-200/70 text-[13px] text-amber-900">
      <Info size={15} className="shrink-0 text-amber-600" />
      <span className="flex-1 leading-snug">
        Sie sehen <span className="font-medium">Beispieldaten</span> — damit Ihr
        Dashboard sofort lebendig ist. Sobald Sie eigene Fahrzeuge und Verträge
        anlegen, können Sie die Beispieldaten mit einem Klick entfernen.
      </span>
      <button
        onClick={remove}
        disabled={removing}
        className="inline-flex items-center gap-1.5 px-3 h-7 rounded-full bg-white ring-1 ring-amber-300 text-amber-800 font-medium hover:bg-amber-100 transition disabled:opacity-60 shrink-0"
      >
        {removing && <Loader2 size={13} className="animate-spin" />}
        Beispieldaten entfernen
      </button>
      <button
        onClick={() => setHidden(true)}
        aria-label="Hinweis ausblenden"
        className="shrink-0 text-amber-600 hover:text-amber-900 transition"
      >
        <X size={15} />
      </button>
    </div>
  );
};

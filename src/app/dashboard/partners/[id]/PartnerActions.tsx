"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Loader2, Trash2 } from "lucide-react";

export const PartnerActions = ({ partnerId }: { partnerId: string }) => {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  const remove = async () => {
    if (
      !confirm(
        "Partner wirklich löschen? Verträge bleiben erhalten, verlieren aber die Partner-Zuordnung."
      )
    )
      return;
    setBusy(true);
    const res = await fetch(`/api/partners/${partnerId}`, { method: "DELETE" });
    setBusy(false);
    if (res.ok) {
      router.push("/dashboard/partners");
      router.refresh();
    }
  };

  return (
    <button
      type="button"
      onClick={remove}
      disabled={busy}
      className="inline-flex items-center gap-1.5 text-sm text-red-700 px-3 py-1.5 rounded-md hover:bg-red-50 disabled:opacity-50"
    >
      {busy ? (
        <Loader2 size={14} className="animate-spin" />
      ) : (
        <Trash2 size={14} />
      )}
      Löschen
    </button>
  );
};

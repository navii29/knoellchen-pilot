"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Loader2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";

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
    <Button
      variant="ghost"
      size="sm"
      onClick={remove}
      disabled={busy}
      className="text-red-700 hover:bg-red-50 border-transparent"
    >
      {busy ? (
        <Loader2 size={14} className="animate-spin" />
      ) : (
        <Trash2 size={14} />
      )}
      Löschen
    </Button>
  );
};

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Trash2, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { PortalInviteModal } from "@/components/dashboard/PortalInviteModal";

export const CustomerActions = ({
  customerId,
  customerEmail,
}: {
  customerId: string;
  customerEmail: string | null;
}) => {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [inviteOpen, setInviteOpen] = useState(false);

  const remove = async () => {
    if (!confirm("Diesen Kunden wirklich löschen? Verknüpfte Verträge bleiben erhalten.")) return;
    setBusy("delete");
    setError(null);
    const res = await fetch(`/api/customers/${customerId}`, { method: "DELETE" });
    setBusy(null);
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setError(j.error || "Löschen fehlgeschlagen");
      return;
    }
    router.push("/dashboard/customers");
    router.refresh();
  };

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <Button variant="ghost" size="sm" onClick={() => setInviteOpen(true)} disabled={busy != null}>
        <UserPlus size={14} />
        Portalzugang erstellen
      </Button>

      <Button
        variant="ghost"
        size="sm"
        onClick={remove}
        disabled={busy != null}
        className="text-red-700 hover:bg-red-50 border-transparent"
      >
        {busy === "delete" ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
        Löschen
      </Button>

      {error && <span className="text-[12px] text-red-700">{error}</span>}

      {inviteOpen && (
        <PortalInviteModal
          customerId={customerId}
          defaultEmail={customerEmail ?? ""}
          onClose={() => setInviteOpen(false)}
          onDone={() => router.refresh()}
        />
      )}
    </div>
  );
};

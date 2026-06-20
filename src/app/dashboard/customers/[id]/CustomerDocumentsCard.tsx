"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CreditCard, FileText, IdCard, Loader2, Trash2, type LucideIcon } from "lucide-react";
import { Panel, PanelHeader } from "@/components/ui/Panel";
import { Button } from "@/components/ui/Button";
import { FileDrop } from "@/components/ui/FileDrop";

// Führerschein- & Ausweisfotos eines Kunden verwalten (hochladen, öffnen,
// ersetzen, entfernen). Upload läuft über /api/customers/[id]/document — der
// Storage-Pfad wird dort serverseitig & org-scoped vergeben.
type DocType = "license" | "id_card";

export const CustomerDocumentsCard = ({
  customerId,
  licenseUrl,
  idCardUrl,
}: {
  customerId: string;
  licenseUrl: string | null;
  idCardUrl: string | null;
}) => {
  return (
    <Panel flush>
      <PanelHeader Icon={FileText} title="Dokumente" />
      <div className="p-5 grid sm:grid-cols-2 gap-3">
        <DocSlot customerId={customerId} type="license" label="Führerschein" Icon={CreditCard} url={licenseUrl} />
        <DocSlot customerId={customerId} type="id_card" label="Personalausweis" Icon={IdCard} url={idCardUrl} />
      </div>
    </Panel>
  );
};

const DocSlot = ({
  customerId,
  type,
  label,
  Icon,
  url,
}: {
  customerId: string;
  type: DocType;
  label: string;
  Icon: LucideIcon;
  url: string | null;
}) => {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [replacing, setReplacing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const upload = async (files: File[]) => {
    const file = files[0];
    if (!file) return;
    setError(null);
    setBusy(true);
    const fd = new FormData();
    fd.append("file", file);
    fd.append("type", type);
    const res = await fetch(`/api/customers/${customerId}/document`, {
      method: "POST",
      body: fd,
    });
    setBusy(false);
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setError(j.error || "Upload fehlgeschlagen");
      return;
    }
    setReplacing(false);
    router.refresh();
  };

  const remove = async () => {
    if (!confirm(`${label}-Foto wirklich entfernen?`)) return;
    setError(null);
    setBusy(true);
    const res = await fetch(`/api/customers/${customerId}/document?type=${type}`, {
      method: "DELETE",
    });
    setBusy(false);
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setError(j.error || "Entfernen fehlgeschlagen");
      return;
    }
    router.refresh();
  };

  return (
    <div className="rounded-panel border border-hairline bg-canvas p-4 space-y-3">
      <div className="flex items-center gap-2 data-label text-ink-muted">
        <Icon size={13} /> {label}
      </div>

      {url && !replacing ? (
        <div className="flex items-center gap-2 flex-wrap">
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2 rounded-btn font-medium tracking-tight h-8 px-3 text-[13px] text-ink-soft hover:bg-ink/5 border border-hairline"
          >
            Öffnen
          </a>
          <Button type="button" variant="ghost" size="sm" disabled={busy} onClick={() => setReplacing(true)}>
            Ersetzen
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={busy}
            onClick={remove}
            className="text-red-600 hover:bg-red-50"
          >
            <Trash2 size={13} /> Entfernen
          </Button>
        </div>
      ) : (
        <>
          <FileDrop
            onFiles={upload}
            accept="application/pdf,image/*"
            disabled={busy}
            label={url ? `Neues ${label}-Foto hochladen` : `${label}-Foto hochladen`}
            hint="PDF oder Foto, max 12 MB"
          />
          {replacing && (
            <button
              type="button"
              onClick={() => setReplacing(false)}
              className="text-[12.5px] text-ink-muted hover:text-ink"
            >
              Abbrechen
            </button>
          )}
        </>
      )}

      {busy && (
        <div className="inline-flex items-center gap-1.5 text-[12.5px] text-ink-muted">
          <Loader2 size={13} className="animate-spin" /> Wird übertragen…
        </div>
      )}
      {error && (
        <div className="text-[13px] text-red-700 bg-red-50 border border-red-200 rounded-panel px-3 py-2">
          {error}
        </div>
      )}
    </div>
  );
};

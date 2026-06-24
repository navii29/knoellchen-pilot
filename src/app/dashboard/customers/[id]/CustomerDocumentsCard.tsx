"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  CheckCircle2,
  CreditCard,
  FileText,
  IdCard,
  Loader2,
  Trash2,
  type LucideIcon,
} from "lucide-react";
import { Panel, PanelHeader } from "@/components/ui/Panel";
import { Button } from "@/components/ui/Button";
import { FileDrop } from "@/components/ui/FileDrop";

// Führerschein- & Ausweisfotos eines Kunden verwalten — je Dokument Vorder- UND
// Rückseite (Vorderseite Pflicht, Rückseite optional). Beim Upload werden beide
// Seiten zusammen per KI ausgelesen und die leeren Kundenfelder befüllt. Der
// Storage-Pfad wird in /api/customers/[id]/document serverseitig & org-scoped
// vergeben.
type DocType = "license" | "id_card";

export const CustomerDocumentsCard = ({
  customerId,
  licenseUrl,
  licenseBackUrl,
  idCardUrl,
  idCardBackUrl,
}: {
  customerId: string;
  licenseUrl: string | null;
  licenseBackUrl: string | null;
  idCardUrl: string | null;
  idCardBackUrl: string | null;
}) => {
  return (
    <Panel flush>
      <PanelHeader Icon={FileText} title="Dokumente" />
      <div className="p-5 grid sm:grid-cols-2 gap-3">
        <DocCard
          customerId={customerId}
          type="license"
          label="Führerschein"
          Icon={CreditCard}
          frontUrl={licenseUrl}
          backUrl={licenseBackUrl}
        />
        <DocCard
          customerId={customerId}
          type="id_card"
          label="Personalausweis"
          Icon={IdCard}
          frontUrl={idCardUrl}
          backUrl={idCardBackUrl}
        />
      </div>
    </Panel>
  );
};

const DocCard = ({
  customerId,
  type,
  label,
  Icon,
  frontUrl,
  backUrl,
}: {
  customerId: string;
  type: DocType;
  label: string;
  Icon: LucideIcon;
  frontUrl: string | null;
  backUrl: string | null;
}) => {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);

  // Lokal gewählte (noch nicht hochgeladene) Seiten — werden zusammen
  // hochgeladen, damit Vorder- + Rückseite gemeinsam ausgelesen werden.
  const [front, setFront] = useState<File | null>(null);
  const [back, setBack] = useState<File | null>(null);

  const submit = async () => {
    if (!front) {
      setError("Bitte zuerst die Vorderseite wählen.");
      return;
    }
    setError(null);
    setNote(null);
    setBusy(true);
    const fd = new FormData();
    fd.append("type", type);
    fd.append("file_front", front);
    if (back) fd.append("file_back", back);
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
    const j = (await res.json().catch(() => ({}))) as { filled?: string[] };
    const n = Array.isArray(j.filled) ? j.filled.length : 0;
    setNote(n > 0 ? `${n} Felder ausgelesen` : "Foto gespeichert");
    setFront(null);
    setBack(null);
    router.refresh();
  };

  const remove = async () => {
    if (!confirm(`${label}-Fotos wirklich entfernen?`)) return;
    setError(null);
    setNote(null);
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

  const hasStored = !!frontUrl || !!backUrl;

  return (
    <div className="rounded-panel border border-hairline bg-canvas p-4 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 data-label text-ink-muted">
          <Icon size={13} /> {label}
        </div>
        {hasStored && (
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
        )}
      </div>

      <div className="grid grid-cols-2 gap-2">
        <Side
          sideLabel="Vorderseite"
          storedUrl={frontUrl}
          selected={front}
          onSelect={setFront}
          onClearSelected={() => setFront(null)}
          disabled={busy}
        />
        <Side
          sideLabel="Rückseite"
          storedUrl={backUrl}
          selected={back}
          onSelect={setBack}
          onClearSelected={() => setBack(null)}
          disabled={busy}
        />
      </div>

      {(front || back) && (
        <Button
          type="button"
          variant="signal"
          size="sm"
          disabled={busy || !front}
          onClick={submit}
        >
          {hasStored ? "Aktualisieren & auslesen" : "Hochladen & auslesen"}
        </Button>
      )}

      {busy && (
        <div className="inline-flex items-center gap-1.5 text-[12.5px] text-ink-muted">
          <Loader2 size={13} className="animate-spin" /> Wird verarbeitet…
        </div>
      )}
      {note && (
        <div className="inline-flex items-center gap-1.5 text-[12.5px] text-emerald-700">
          <CheckCircle2 size={13} /> {note}
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

const Side = ({
  sideLabel,
  storedUrl,
  selected,
  onSelect,
  onClearSelected,
  disabled,
}: {
  sideLabel: string;
  storedUrl: string | null;
  selected: File | null;
  onSelect: (f: File) => void;
  onClearSelected: () => void;
  disabled: boolean;
}) => {
  return (
    <div className="space-y-2">
      <div className="text-[11px] uppercase tracking-wide text-ink-muted">{sideLabel}</div>
      {selected ? (
        <div className="flex items-center justify-between gap-2 rounded-btn border border-hairline px-2.5 h-8 text-[12.5px] text-ink-soft">
          <span className="truncate">{selected.name}</span>
          <button
            type="button"
            onClick={onClearSelected}
            disabled={disabled}
            className="text-ink-muted hover:text-ink shrink-0"
            aria-label="Auswahl entfernen"
          >
            <Trash2 size={13} />
          </button>
        </div>
      ) : (
        <FileDrop
          onFiles={(files) => files[0] && onSelect(files[0])}
          accept="application/pdf,image/*"
          disabled={disabled}
          label={storedUrl ? `${sideLabel} ersetzen` : `${sideLabel} wählen`}
          hint="PDF oder Foto, max 12 MB"
        />
      )}
      {storedUrl && (
        <a
          href={storedUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center justify-center rounded-btn font-medium tracking-tight h-7 px-2.5 text-[12px] text-ink-soft hover:bg-ink/5 border border-hairline"
        >
          {`Gespeicherte ${sideLabel} öffnen`}
        </a>
      )}
    </div>
  );
};

"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ChevronRight, FileSpreadsheet, Loader2, Plus, Trash2, Users } from "lucide-react";
import { CsvImportModal } from "@/components/dashboard/CsvImportModal";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button, ButtonLink } from "@/components/ui/Button";
import { SearchInput } from "@/components/ui/Toolbar";
import { EmptyState } from "@/components/ui/EmptyState";
import {
  BulkBar,
  SelectCheckbox,
  useRowSelection,
} from "@/components/dashboard/bulk-select";
import type { Customer } from "@/lib/types";

const fullName = (c: Customer) =>
  [c.title, c.first_name, c.last_name].filter(Boolean).join(" ");

const fullAddress = (c: Customer) =>
  [
    [c.street, c.house_nr].filter(Boolean).join(" "),
    [c.zip, c.city].filter(Boolean).join(" "),
  ]
    .filter(Boolean)
    .join(", ");

export const CustomersList = ({ initial }: { initial: Customer[] }) => {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [importOpen, setImportOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return initial;
    return initial.filter((c) => {
      return (
        fullName(c).toLowerCase().includes(needle) ||
        (c.email || "").toLowerCase().includes(needle) ||
        (c.phone || "").toLowerCase().includes(needle) ||
        (c.license_nr || "").toLowerCase().includes(needle) ||
        (c.zip || "").toLowerCase().includes(needle) ||
        (c.city || "").toLowerCase().includes(needle)
      );
    });
  }, [initial, q]);

  const sel = useRowSelection(filtered);

  const bulkDelete = async () => {
    if (sel.count === 0) return;
    if (
      !confirm(
        `${sel.count} ${sel.count === 1 ? "Kunde" : "Kunden"} wirklich löschen? ` +
          "Verknüpfte Verträge bleiben erhalten, ein etwaiger Portal-Zugang wird mitgelöscht."
      )
    )
      return;
    setBusy(true);
    setError(null);
    const res = await fetch("/api/customers/bulk-delete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: sel.selectedIds }),
    });
    setBusy(false);
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setError(j.error || "Löschen fehlgeschlagen");
      return;
    }
    sel.clear();
    router.refresh();
  };

  return (
    <>
      <PageHeader
        kicker="CRM"
        title="Kunden"
        description="Mieterdaten zentral pflegen — bei Vertragsanlage einfach auswählen."
        actions={
          <>
            <Button variant="ghost" size="sm" onClick={() => setImportOpen(true)}>
              <FileSpreadsheet size={14} /> CSV importieren
            </Button>
            <ButtonLink href="/dashboard/customers/new" variant="signal" size="sm">
              <Plus size={14} /> Neuer Kunde
            </ButtonLink>
          </>
        }
      />

      {importOpen && (
        <CsvImportModal
          title="Kunden aus CSV importieren"
          endpoint="/api/customers/import-csv"
          onClose={() => setImportOpen(false)}
        />
      )}

      <div className="mt-6 flex items-center justify-between gap-3">
        <div className="text-[13px] text-ink-muted tnum">
          {filtered.length} {filtered.length === 1 ? "Kunde" : "Kunden"}
          {q && initial.length !== filtered.length ? ` von ${initial.length}` : ""}
        </div>
        <SearchInput
          value={q}
          onChange={setQ}
          placeholder="Name, E-Mail, Führerschein, PLZ…"
          className="w-72"
        />
      </div>

      <BulkBar count={sel.count} onClear={sel.clear}>
        <Button variant="ghost" size="sm" onClick={bulkDelete} disabled={busy} className="text-red-700 hover:bg-red-50">
          {busy ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
          Löschen
        </Button>
      </BulkBar>

      {error && (
        <div className="mt-3 text-[13px] text-red-700 bg-red-50 border border-red-200 rounded-panel px-3 py-2">
          {error}
        </div>
      )}

      <div className="mt-4 panel overflow-hidden">
        {/* Desktop */}
        <div className="hidden md:block">
          <div className="grid grid-cols-[34px_1fr_220px_140px_180px_24px] gap-3 px-5 py-2.5 border-b border-hairline bg-canvas/60 th items-center">
            <SelectCheckbox
              checked={sel.allSelected}
              indeterminate={sel.someSelected}
              onChange={sel.toggleAll}
              ariaLabel="Alle auswählen"
            />
            <span>Name</span>
            <span>E-Mail</span>
            <span>Telefon</span>
            <span>Adresse</span>
            <span />
          </div>
          {filtered.map((c) => (
            <div
              key={c.id}
              className="grid grid-cols-[34px_1fr_220px_140px_180px_24px] gap-3 items-center px-5 py-3 border-b border-hairline last:border-0 text-[13.5px] hover:bg-canvas transition-colors"
            >
              <SelectCheckbox
                checked={sel.isSelected(c.id)}
                onChange={() => sel.toggle(c.id)}
                ariaLabel={`${fullName(c) || "Kunde"} auswählen`}
              />
              <Link href={`/dashboard/customers/${c.id}`} style={{ display: "contents" }}>
                <span className="text-ink truncate">
                  {fullName(c) || "—"}
                  {c.salutation && (
                    <span className="text-ink-muted text-[12px] ml-2">{c.salutation}</span>
                  )}
                </span>
                <span className="text-ink-muted text-[12.5px] truncate">{c.email || "—"}</span>
                <span className="text-ink-muted text-[12.5px] truncate font-mono tnum">{c.phone || "—"}</span>
                <span className="text-ink-muted text-[12.5px] truncate">{fullAddress(c) || "—"}</span>
                <ChevronRight size={14} className="text-ink-muted" />
              </Link>
            </div>
          ))}
        </div>

        {/* Mobile */}
        <div className="md:hidden divide-y divide-hairline">
          {filtered.map((c) => (
            <div key={c.id} className="flex items-start gap-3 px-4 py-3 hover:bg-canvas">
              <div className="pt-1">
                <SelectCheckbox
                  checked={sel.isSelected(c.id)}
                  onChange={() => sel.toggle(c.id)}
                  ariaLabel={`${fullName(c) || "Kunde"} auswählen`}
                />
              </div>
              <Link
                href={`/dashboard/customers/${c.id}`}
                className="flex items-start gap-3 flex-1 min-w-0 active:bg-canvas"
              >
                <div className="flex-1 min-w-0 space-y-0.5">
                  <div className="text-[14px] font-medium text-ink truncate">
                    {fullName(c) || "—"}
                  </div>
                  <div className="text-[12px] text-ink-muted truncate">{c.email || "—"}</div>
                  {c.phone && (
                    <div className="text-[12px] text-ink-muted truncate font-mono tnum">{c.phone}</div>
                  )}
                  {fullAddress(c) && (
                    <div className="text-[12px] text-ink-muted truncate">{fullAddress(c)}</div>
                  )}
                </div>
                <ChevronRight size={16} className="text-ink-muted shrink-0 mt-1" />
              </Link>
            </div>
          ))}
        </div>

        {filtered.length === 0 && (
          <EmptyState
            Icon={Users}
            title={q ? "Keine Kunden gefunden." : "Noch keine Kunden angelegt."}
            description={
              !q ? "Legen Sie den ersten Kunden an oder importieren Sie eine CSV-Datei." : undefined
            }
            action={
              !q ? (
                <ButtonLink href="/dashboard/customers/new" variant="signal" size="sm">
                  <Plus size={14} /> Ersten Kunden anlegen
                </ButtonLink>
              ) : undefined
            }
          />
        )}
      </div>
    </>
  );
};

"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ChevronRight, FileSpreadsheet, Plus, Users } from "lucide-react";
import { CsvImportModal } from "@/components/dashboard/CsvImportModal";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button, ButtonLink } from "@/components/ui/Button";
import { SearchInput } from "@/components/ui/Toolbar";
import { EmptyState } from "@/components/ui/EmptyState";
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
  const [q, setQ] = useState("");
  const [importOpen, setImportOpen] = useState(false);

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

  return (
    <>
      <PageHeader
        kicker="CRM"
        title="Kunden"
        description="Mieterdaten zentral pflegen — bei Vertragsanlage einfach auswählen."
        actions={
          <>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setImportOpen(true)}
            >
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

      <div className="mt-6 flex items-center justify-end">
        <SearchInput
          value={q}
          onChange={setQ}
          placeholder="Name, E-Mail, Führerschein, PLZ…"
          className="w-72"
        />
      </div>

      <div className="mt-4 panel overflow-hidden">
        {/* Desktop */}
        <div className="hidden md:block">
          <div className="grid grid-cols-[1fr_220px_140px_180px_24px] gap-3 px-5 py-2.5 border-b border-hairline bg-canvas/60 th">
            <span>Name</span>
            <span>E-Mail</span>
            <span>Telefon</span>
            <span>Adresse</span>
            <span />
          </div>
          {filtered.map((c) => (
            <Link
              key={c.id}
              href={`/dashboard/customers/${c.id}`}
              className="grid grid-cols-[1fr_220px_140px_180px_24px] gap-3 items-center px-5 py-3 border-b border-hairline last:border-0 text-[13.5px] hover:bg-canvas transition-colors"
            >
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
          ))}
        </div>

        {/* Mobile */}
        <div className="md:hidden divide-y divide-hairline">
          {filtered.map((c) => (
            <Link
              key={c.id}
              href={`/dashboard/customers/${c.id}`}
              className="flex items-start gap-3 px-4 py-3 hover:bg-canvas active:bg-canvas"
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

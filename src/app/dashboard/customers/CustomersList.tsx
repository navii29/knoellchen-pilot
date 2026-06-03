"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ChevronRight, FileSpreadsheet, Plus, Search, Users } from "lucide-react";
import { CsvImportModal } from "@/components/dashboard/CsvImportModal";
import { THEME } from "@/lib/theme";
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
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <div className="font-display font-bold text-2xl tracking-tight">Kunden</div>
          <p className="text-sm text-zinc-500 mt-1">
            Mieterdaten zentral pflegen — bei Vertragsanlage einfach auswählen.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setImportOpen(true)}
            className="inline-flex items-center gap-1.5 text-sm text-zinc-700 px-3.5 py-1.5 rounded-md font-medium ring-1 ring-zinc-200 bg-white hover:bg-zinc-50"
          >
            <FileSpreadsheet size={14} /> CSV importieren
          </button>
          <Link
            href="/dashboard/customers/new"
            className="inline-flex items-center gap-1.5 text-sm text-white px-3.5 py-1.5 rounded-md font-medium"
            style={{ background: THEME.primary }}
          >
            <Plus size={14} /> Neuer Kunde
          </Link>
        </div>
      </div>

      {importOpen && (
        <CsvImportModal
          title="Kunden aus CSV importieren"
          endpoint="/api/customers/import-csv"
          onClose={() => setImportOpen(false)}
        />
      )}

      <div className="mt-6 flex items-center justify-end">
        <div className="relative">
          <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-400" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Name, E-Mail, Führerschein, PLZ…"
            className="pl-8 pr-3 py-2 bg-white rounded-md text-sm ring-1 ring-zinc-200 w-72 outline-none focus:ring-zinc-400"
          />
        </div>
      </div>

      <div className="mt-4 rounded-xl bg-white ring-1 ring-zinc-200 overflow-hidden">
        {/* Desktop */}
        <div className="hidden md:block">
          <div className="grid grid-cols-[1fr_220px_140px_180px_24px] gap-3 px-5 py-2.5 text-[11px] uppercase tracking-wider text-zinc-400 border-b border-zinc-100">
            <span>Name</span>
            <span>E-Mail</span>
            <span>Telefon</span>
            <span>Adresse</span>
            <span></span>
          </div>
          {filtered.map((c) => (
            <Link
              key={c.id}
              href={`/dashboard/customers/${c.id}`}
              className="grid grid-cols-[1fr_220px_140px_180px_24px] gap-3 items-center px-5 py-3 border-b border-zinc-50 last:border-0 text-sm hover:bg-zinc-50"
            >
              <span className="text-zinc-900 truncate">
                {fullName(c) || "—"}
                {c.salutation && (
                  <span className="text-zinc-400 text-xs ml-2">{c.salutation}</span>
                )}
              </span>
              <span className="text-zinc-500 text-xs truncate">{c.email || "—"}</span>
              <span className="text-zinc-500 text-xs truncate tabular-nums">{c.phone || "—"}</span>
              <span className="text-zinc-500 text-xs truncate">{fullAddress(c) || "—"}</span>
              <ChevronRight size={14} className="text-zinc-300" />
            </Link>
          ))}
        </div>

        {/* Mobile */}
        <div className="md:hidden divide-y divide-zinc-100">
          {filtered.map((c) => (
            <Link
              key={c.id}
              href={`/dashboard/customers/${c.id}`}
              className="flex items-start gap-3 px-4 py-3 hover:bg-zinc-50 active:bg-zinc-100"
            >
              <div className="flex-1 min-w-0 space-y-0.5">
                <div className="text-sm font-medium text-zinc-900 truncate">
                  {fullName(c) || "—"}
                </div>
                <div className="text-[11px] text-zinc-500 truncate">{c.email || "—"}</div>
                {c.phone && (
                  <div className="text-[11px] text-zinc-500 truncate tabular-nums">{c.phone}</div>
                )}
                {fullAddress(c) && (
                  <div className="text-[11px] text-zinc-400 truncate">{fullAddress(c)}</div>
                )}
              </div>
              <ChevronRight size={16} className="text-zinc-300 shrink-0 mt-1" />
            </Link>
          ))}
        </div>

        {filtered.length === 0 && (
          <div className="px-5 py-12 text-center text-sm text-zinc-500">
            <Users size={28} className="mx-auto text-zinc-300" />
            <div className="mt-3">
              {q ? "Keine Kunden gefunden." : "Noch keine Kunden angelegt."}
            </div>
            {!q && (
              <Link
                href="/dashboard/customers/new"
                className="inline-flex items-center gap-1.5 text-sm text-white px-3.5 py-1.5 rounded-md font-medium mt-4"
                style={{ background: THEME.primary }}
              >
                <Plus size={14} /> Ersten Kunden anlegen
              </Link>
            )}
          </div>
        )}
      </div>
    </>
  );
};

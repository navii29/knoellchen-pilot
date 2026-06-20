"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronRight, Handshake, Loader2, Plus, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button, ButtonLink } from "@/components/ui/Button";
import { SearchInput } from "@/components/ui/Toolbar";
import { EmptyState } from "@/components/ui/EmptyState";
import {
  BulkBar,
  SelectCheckbox,
  useRowSelection,
} from "@/components/dashboard/bulk-select";
import {
  COMMISSION_TYPE_META,
  PARTNER_TYPE_META,
  type SalesPartner,
} from "@/lib/partners";

const fmtCommission = (p: SalesPartner) => {
  if (p.commission_value == null) return "—";
  if (p.commission_type === "percent")
    return `${Number(p.commission_value).toFixed(1).replace(".", ",")} %`;
  if (p.commission_type === "fixed")
    return `${Number(p.commission_value).toFixed(2).replace(".", ",")} € pauschal`;
  return "Marge VK − Einstand";
};

export const PartnersList = ({ initial }: { initial: SalesPartner[] }) => {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return initial;
    return initial.filter((p) =>
      [p.name, p.contact_name, p.email, p.phone, p.address]
        .filter(Boolean)
        .some((s) => String(s).toLowerCase().includes(needle))
    );
  }, [initial, q]);

  const sel = useRowSelection(filtered);

  const bulkDelete = async () => {
    if (sel.count === 0) return;
    if (!confirm(`${sel.count} ${sel.count === 1 ? "Partner" : "Partner"} wirklich löschen?`))
      return;
    setBusy(true);
    setError(null);
    const res = await fetch("/api/partners/bulk-delete", {
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
        kicker="Vertrieb"
        title="Partner"
        description="Hotels, Reisebüros, Portale, Werkstätten — alle Vermittler an einer Stelle, mit Provisionsmodell und Fahrzeug-Preisen."
        actions={
          <ButtonLink href="/dashboard/partners/new" variant="signal" size="sm">
            <Plus size={14} /> Neuer Partner
          </ButtonLink>
        }
      />

      <div className="mt-6 flex items-center justify-between gap-3">
        <div className="text-[13px] text-ink-muted tnum">
          {filtered.length} Partner
        </div>
        <SearchInput
          value={q}
          onChange={setQ}
          placeholder="Suchen…"
          className="w-64"
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
        {filtered.length === 0 ? (
          <EmptyState
            Icon={Handshake}
            title={initial.length === 0 ? "Noch keine Partner angelegt." : "Keine Treffer."}
            description={
              initial.length === 0
                ? "Legen Sie den ersten Partner an und hinterlegen Sie das Provisionsmodell."
                : undefined
            }
            action={
              initial.length === 0 ? (
                <ButtonLink href="/dashboard/partners/new" variant="signal" size="sm">
                  <Plus size={14} /> Neuer Partner
                </ButtonLink>
              ) : undefined
            }
          />
        ) : (
          <>
            <div className="grid grid-cols-[34px_40px_1fr_180px_180px_24px] items-center gap-3 px-5 py-2.5 border-b border-hairline bg-canvas/60 th">
              <SelectCheckbox
                checked={sel.allSelected}
                indeterminate={sel.someSelected}
                onChange={sel.toggleAll}
                ariaLabel="Alle auswählen"
              />
              <span />
              <span>Partner</span>
              <span>Provision</span>
              <span>Adresse</span>
              <span />
            </div>
            <div className="divide-y divide-hairline">
            {filtered.map((p) => {
              const meta = PARTNER_TYPE_META[p.type];
              return (
                <div
                  key={p.id}
                  className="grid grid-cols-[34px_40px_1fr_180px_180px_24px] items-center gap-3 px-5 py-3.5 hover:bg-canvas transition-colors"
                >
                  <SelectCheckbox
                    checked={sel.isSelected(p.id)}
                    onChange={() => sel.toggle(p.id)}
                    ariaLabel={`Partner ${p.name} auswählen`}
                  />
                  <Link href={`/dashboard/partners/${p.id}`} style={{ display: "contents" }}>
                  <div className="w-9 h-9 rounded-panel border border-hairline bg-canvas flex items-center justify-center text-ink-muted">
                    <Handshake size={15} />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[14.5px] font-medium text-ink truncate">
                        {p.name}
                      </span>
                      <span className="inline-flex items-center px-1.5 h-5 rounded-full border border-hairline bg-canvas text-[11px] font-mono text-ink-muted">
                        {meta.short}
                      </span>
                      {!p.active && (
                        <span className="kicker text-ink-muted">inaktiv</span>
                      )}
                    </div>
                    <div className="text-[12px] text-ink-muted truncate mt-0.5">
                      {[p.contact_name, p.email].filter(Boolean).join(" · ")}
                    </div>
                  </div>
                  <div className="text-[12px] text-ink-soft">
                    <div className="font-mono tnum font-medium">
                      {fmtCommission(p)}
                    </div>
                    <div className="text-ink-muted truncate">
                      {COMMISSION_TYPE_META[p.commission_type].label}
                    </div>
                  </div>
                  <div className="text-[12px] text-ink-muted truncate">
                    {p.address ?? "—"}
                  </div>
                  <ChevronRight size={14} className="text-ink-muted" />
                  </Link>
                </div>
              );
            })}
            </div>
          </>
        )}
      </div>
    </>
  );
};

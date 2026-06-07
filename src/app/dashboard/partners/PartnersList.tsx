"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ChevronRight, Handshake, Plus } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { ButtonLink } from "@/components/ui/Button";
import { SearchInput } from "@/components/ui/Toolbar";
import { EmptyState } from "@/components/ui/EmptyState";
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
  const [q, setQ] = useState("");

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return initial;
    return initial.filter((p) =>
      [p.name, p.contact_name, p.email, p.phone, p.address]
        .filter(Boolean)
        .some((s) => String(s).toLowerCase().includes(needle))
    );
  }, [initial, q]);

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

      <div className="mt-6 flex items-center justify-end">
        <SearchInput
          value={q}
          onChange={setQ}
          placeholder="Suchen…"
          className="w-64"
        />
      </div>

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
          <div className="divide-y divide-hairline">
            {filtered.map((p) => {
              const meta = PARTNER_TYPE_META[p.type];
              return (
                <Link
                  key={p.id}
                  href={`/dashboard/partners/${p.id}`}
                  className="grid grid-cols-[40px_1fr_180px_180px_24px] items-center gap-3 px-5 py-3.5 hover:bg-canvas transition-colors"
                >
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
              );
            })}
          </div>
        )}
      </div>
    </>
  );
};

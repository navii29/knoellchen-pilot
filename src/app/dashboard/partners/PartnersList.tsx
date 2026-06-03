"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ChevronRight, Handshake, Plus, Search } from "lucide-react";
import { THEME } from "@/lib/theme";
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
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <div className="font-display font-bold text-2xl tracking-tight">Partner</div>
          <p className="text-sm text-zinc-500 mt-1 max-w-xl">
            Hotels, Reisebüros, Portale, Werkstätten — alle Vermittler an
            einer Stelle, mit Provisionsmodell und Fahrzeug-Preisen.
          </p>
        </div>
        <Link
          href="/dashboard/partners/new"
          className="inline-flex items-center gap-1.5 text-sm text-white px-3.5 py-1.5 rounded-md font-medium"
          style={{ background: THEME.primary }}
        >
          <Plus size={14} /> Neuer Partner
        </Link>
      </div>

      <div className="mt-6 flex items-center justify-end">
        <div className="relative">
          <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-400" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Suchen…"
            className="h-9 pl-8 pr-3 rounded-md text-sm bg-white outline-none ring-1 ring-zinc-200 focus:ring-zinc-400 w-64"
          />
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="mt-6 rounded-xl bg-white ring-1 ring-zinc-200 px-5 py-12 text-center text-sm text-zinc-500">
          <Handshake size={28} className="mx-auto text-zinc-300 mb-2" />
          {initial.length === 0
            ? "Noch keine Partner angelegt."
            : "Keine Treffer."}
        </div>
      ) : (
        <div className="mt-4 rounded-xl bg-white ring-1 ring-zinc-200 divide-y divide-zinc-100 overflow-hidden">
          {filtered.map((p) => {
            const meta = PARTNER_TYPE_META[p.type];
            return (
              <Link
                key={p.id}
                href={`/dashboard/partners/${p.id}`}
                className="grid grid-cols-[40px_1fr_180px_180px_24px] items-center gap-3 px-5 py-3.5 hover:bg-zinc-50"
              >
                <div
                  className="w-9 h-9 rounded-lg flex items-center justify-center"
                  style={{ background: meta.bg, color: meta.color }}
                >
                  <Handshake size={15} />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[14.5px] font-medium text-zinc-900 truncate">
                      {p.name}
                    </span>
                    <span
                      className="inline-flex items-center px-1.5 h-5 rounded text-[11px] font-medium"
                      style={{
                        background: meta.bg,
                        color: meta.text,
                        boxShadow: `inset 0 0 0 1px ${meta.ring}`,
                      }}
                    >
                      {meta.short}
                    </span>
                    {!p.active && (
                      <span className="text-[10.5px] uppercase tracking-wider text-zinc-400">
                        inaktiv
                      </span>
                    )}
                  </div>
                  <div className="text-[12px] text-zinc-500 truncate mt-0.5">
                    {[p.contact_name, p.email].filter(Boolean).join(" · ")}
                  </div>
                </div>
                <div className="text-[12px] text-zinc-600">
                  <div className="font-medium tabular-nums">
                    {fmtCommission(p)}
                  </div>
                  <div className="text-zinc-400 truncate">
                    {COMMISSION_TYPE_META[p.commission_type].label}
                  </div>
                </div>
                <div className="text-[12px] text-zinc-500 truncate">
                  {p.address ?? "—"}
                </div>
                <ChevronRight size={14} className="text-zinc-300" />
              </Link>
            );
          })}
        </div>
      )}
    </>
  );
};

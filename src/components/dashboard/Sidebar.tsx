"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  Car,
  ChevronRight,
  FileSignature,
  FileText,
  LayoutDashboard,
  Settings,
  Sparkles,
  WandSparkles,
} from "lucide-react";
import { THEME } from "@/lib/theme";

type BadgeKey = "tickets" | "contracts";

const ITEMS: Array<{ href: string; label: string; Icon: typeof Car; badgeKey?: BadgeKey }> = [
  { href: "/dashboard", label: "Dashboard", Icon: LayoutDashboard },
  { href: "/dashboard/assistant", label: "Assistent", Icon: WandSparkles },
  { href: "/dashboard/contracts", label: "Verträge", Icon: FileSignature, badgeKey: "contracts" },
  { href: "/dashboard/tickets", label: "Strafzettel", Icon: FileText, badgeKey: "tickets" },
  { href: "/dashboard/vehicles", label: "Fahrzeuge", Icon: Car },
  { href: "/dashboard/reports", label: "Auswertung", Icon: BarChart3 },
  { href: "/dashboard/settings", label: "Einstellungen", Icon: Settings },
];

export const Sidebar = ({
  orgName,
  ticketCount,
  contractCount,
}: {
  orgName: string;
  ticketCount: number;
  contractCount: number;
}) => {
  const pathname = usePathname();
  return (
    <aside className="w-60 shrink-0 border-r border-stone-200 bg-white flex flex-col">
      <div className="h-14 px-4 flex items-center gap-2 border-b border-stone-200">
        <div
          className="w-7 h-7 rounded-lg flex items-center justify-center"
          style={{ background: THEME.primary }}
        >
          <Sparkles size={15} className="text-white" strokeWidth={2.25} />
        </div>
        <div className="font-display font-bold text-[15px] tracking-tight">Knöllchen-Pilot</div>
      </div>
      <div className="p-3 space-y-0.5 flex-1">
        <div className="text-[10px] uppercase tracking-wider text-stone-400 px-2 py-2 font-medium">
          Arbeitsbereich
        </div>
        {ITEMS.map((it) => {
          const isActive =
            it.href === "/dashboard" ? pathname === "/dashboard" : pathname.startsWith(it.href);
          const badge =
            it.badgeKey === "tickets" ? ticketCount : it.badgeKey === "contracts" ? contractCount : null;
          return (
            <Link
              key={it.href}
              href={it.href}
              className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-md text-[13px] ${
                isActive ? "bg-stone-100 font-medium text-stone-900" : "text-stone-600 hover:bg-stone-50"
              }`}
            >
              <it.Icon size={15} style={isActive ? { color: THEME.primary } : {}} />
              <span>{it.label}</span>
              {badge != null && badge > 0 && (
                <span className="ml-auto text-[10px] font-mono px-1.5 py-0.5 rounded bg-stone-200 text-stone-700">
                  {badge}
                </span>
              )}
            </Link>
          );
        })}
      </div>
      <div className="p-3 border-t border-stone-200">
        <form action="/auth/signout" method="post">
          <button className="w-full flex items-center gap-2.5 px-2 py-2 hover:bg-stone-50 rounded-md">
            <div className="w-8 h-8 rounded-full bg-stone-900 text-white flex items-center justify-center font-display text-xs font-semibold">
              {orgName.slice(0, 2).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0 text-left">
              <div className="text-[13px] font-medium truncate">{orgName}</div>
              <div className="text-[11px] text-stone-500 truncate">Abmelden</div>
            </div>
            <ChevronRight size={14} className="text-stone-400" />
          </button>
        </form>
      </div>
    </aside>
  );
};

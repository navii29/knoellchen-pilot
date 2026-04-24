"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  AlertOctagon,
  BarChart3,
  Calendar,
  Car,
  ChevronRight,
  FileSignature,
  FileText,
  LayoutDashboard,
  Settings,
  Sparkles,
  Users,
  WandSparkles,
  X,
} from "lucide-react";

type BadgeKey = "tickets" | "contracts" | "customers" | "damage";

const ITEMS: Array<{ href: string; label: string; Icon: typeof Car; badgeKey?: BadgeKey }> = [
  { href: "/dashboard", label: "Dashboard", Icon: LayoutDashboard },
  { href: "/dashboard/assistant", label: "Assistent", Icon: WandSparkles },
  { href: "/dashboard/contracts", label: "Verträge", Icon: FileSignature, badgeKey: "contracts" },
  { href: "/dashboard/customers", label: "Kunden", Icon: Users, badgeKey: "customers" },
  { href: "/dashboard/tickets", label: "Strafzettel", Icon: FileText, badgeKey: "tickets" },
  { href: "/dashboard/damage-reports", label: "Schäden", Icon: AlertOctagon, badgeKey: "damage" },
  { href: "/dashboard/vehicles", label: "Fahrzeuge", Icon: Car },
  { href: "/dashboard/calendar", label: "Kalender", Icon: Calendar },
  { href: "/dashboard/reports", label: "Auswertung", Icon: BarChart3 },
  { href: "/dashboard/settings", label: "Einstellungen", Icon: Settings },
];

export const SIDEBAR_OPEN_EVENT = "dashboard:open-sidebar";

export const Sidebar = ({
  orgName,
  ticketCount,
  contractCount,
  customerCount,
  damageCount,
}: {
  orgName: string;
  ticketCount: number;
  contractCount: number;
  customerCount: number;
  damageCount: number;
}) => {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  // Custom-Event aus der Topbar empfangen
  useEffect(() => {
    const handler = () => setMobileOpen(true);
    window.addEventListener(SIDEBAR_OPEN_EVENT, handler);
    return () => window.removeEventListener(SIDEBAR_OPEN_EVENT, handler);
  }, []);

  // Bei Routenwechsel Drawer schliessen
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  // ESC schliesst Drawer
  useEffect(() => {
    if (!mobileOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMobileOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [mobileOpen]);

  // Body-Scroll lock wenn Drawer offen
  useEffect(() => {
    if (mobileOpen) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = prev;
      };
    }
  }, [mobileOpen]);

  const navList = (
    <>
      <div className="text-[10px] uppercase tracking-wider text-stone-500 px-2.5 py-2 font-medium">
        Arbeitsbereich
      </div>
      {ITEMS.map((it) => {
        const isActive =
          it.href === "/dashboard" ? pathname === "/dashboard" : pathname.startsWith(it.href);
        const badge =
          it.badgeKey === "tickets"
            ? ticketCount
            : it.badgeKey === "contracts"
            ? contractCount
            : it.badgeKey === "customers"
            ? customerCount
            : it.badgeKey === "damage"
            ? damageCount
            : null;
        return (
          <Link
            key={it.href}
            href={it.href}
            className={`group w-full flex items-center gap-2.5 px-2.5 py-2.5 rounded-md text-[13px] transition-all duration-150 ${
              isActive
                ? "bg-white/10 text-white font-medium"
                : "text-stone-400 hover:bg-white/5 hover:text-stone-100"
            }`}
          >
            <it.Icon
              size={15}
              strokeWidth={isActive ? 2 : 1.75}
              className={isActive ? "text-white" : "text-stone-500 group-hover:text-stone-300"}
            />
            <span>{it.label}</span>
            {badge != null && badge > 0 && (
              <span
                className={`ml-auto text-[10px] font-mono px-1.5 py-0.5 rounded ${
                  isActive ? "bg-white/15 text-white" : "bg-stone-800 text-stone-300"
                }`}
              >
                {badge}
              </span>
            )}
          </Link>
        );
      })}
    </>
  );

  const profileBlock = (
    <form action="/auth/signout" method="post">
      <button className="w-full flex items-center gap-2.5 px-2 py-2 rounded-md hover:bg-white/5 transition-all duration-150">
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-stone-600 to-stone-800 text-white flex items-center justify-center font-display text-[11px] font-semibold ring-1 ring-white/10">
          {orgName.slice(0, 2).toUpperCase()}
        </div>
        <div className="flex-1 min-w-0 text-left">
          <div className="text-[13px] font-medium text-stone-100 truncate">{orgName}</div>
          <div className="text-[11px] text-stone-500 truncate">Abmelden</div>
        </div>
        <ChevronRight size={13} className="text-stone-600" />
      </button>
    </form>
  );

  const logoBlock = (
    <div className="h-14 px-4 flex items-center gap-2.5 border-b border-stone-800">
      <div className="w-6 h-6 rounded-md flex items-center justify-center bg-gradient-to-br from-teal-400 to-teal-600 shadow-[0_0_12px_rgba(45,212,191,0.4)]">
        <Sparkles size={13} className="text-white" strokeWidth={2.25} />
      </div>
      <div className="font-display font-semibold text-[14px] tracking-tight text-white">
        Knöllchen-Pilot
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop-Sidebar */}
      <aside className="hidden md:flex w-60 shrink-0 bg-stone-950 text-stone-300 flex-col">
        {logoBlock}
        <div className="p-3 space-y-0.5 flex-1 overflow-y-auto">{navList}</div>
        <div className="p-3 border-t border-stone-800">{profileBlock}</div>
      </aside>

      {/* Mobile-Drawer + Backdrop */}
      <div
        className={`md:hidden fixed inset-0 z-50 transition-opacity duration-200 ${
          mobileOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
        aria-hidden={!mobileOpen}
      >
        <div
          className="absolute inset-0 bg-black/50"
          onClick={() => setMobileOpen(false)}
        />
        <aside
          className={`absolute left-0 top-0 bottom-0 w-72 max-w-[85vw] bg-stone-950 text-stone-300 flex flex-col shadow-2xl transition-transform duration-200 ${
            mobileOpen ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          <div className="h-14 px-4 flex items-center justify-between border-b border-stone-800">
            <div className="flex items-center gap-2.5">
              <div className="w-6 h-6 rounded-md flex items-center justify-center bg-gradient-to-br from-teal-400 to-teal-600 shadow-[0_0_12px_rgba(45,212,191,0.4)]">
                <Sparkles size={13} className="text-white" strokeWidth={2.25} />
              </div>
              <div className="font-display font-semibold text-[14px] tracking-tight text-white">
                Knöllchen-Pilot
              </div>
            </div>
            <button
              onClick={() => setMobileOpen(false)}
              className="touch-target -mr-2 flex items-center justify-center text-stone-400 hover:text-white"
              aria-label="Menü schließen"
            >
              <X size={18} />
            </button>
          </div>
          <div className="p-3 space-y-0.5 flex-1 overflow-y-auto">{navList}</div>
          <div className="p-3 border-t border-stone-800 safe-bottom">{profileBlock}</div>
        </aside>
      </div>
    </>
  );
};

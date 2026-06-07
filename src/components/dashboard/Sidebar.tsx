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
  Handshake,
  LayoutDashboard,
  Settings,
  Users,
  WandSparkles,
  X,
} from "lucide-react";
import { Logo } from "@/components/ui/Logo";

type BadgeKey = "tickets" | "contracts" | "customers" | "damage";

const ITEMS: Array<{ href: string; label: string; Icon: typeof Car; badgeKey?: BadgeKey }> = [
  { href: "/dashboard", label: "Dashboard", Icon: LayoutDashboard },
  { href: "/dashboard/assistant", label: "Assistent", Icon: WandSparkles },
  { href: "/dashboard/contracts", label: "Verträge", Icon: FileSignature, badgeKey: "contracts" },
  { href: "/dashboard/customers", label: "Kunden", Icon: Users, badgeKey: "customers" },
  { href: "/dashboard/partners", label: "Partner", Icon: Handshake },
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
      {/* Section label — mono kicker style on dark */}
      <div className="font-mono text-[10px] uppercase tracking-wider text-white/40 px-3 py-2.5">
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
            className={`group relative w-full flex items-center gap-2.5 px-3 py-2.5 rounded-panel text-[13px] transition-all duration-150 ${
              isActive
                ? "bg-white/[0.06] text-white font-medium"
                : "text-white/55 hover:bg-white/[0.06] hover:text-white"
            }`}
          >
            {/* Signal bar for active state */}
            {isActive && (
              <span
                aria-hidden
                className="absolute left-0 top-1/2 -translate-y-1/2 w-[2px] h-5 bg-signal rounded-r-full"
              />
            )}
            <it.Icon
              size={15}
              strokeWidth={isActive ? 2 : 1.75}
              className={isActive ? "text-white" : "text-white/40 group-hover:text-white/70"}
            />
            <span>{it.label}</span>
            {badge != null && badge > 0 && (
              <span
                className={`ml-auto font-mono text-[10px] px-1.5 py-0.5 rounded ${
                  isActive
                    ? "bg-signal/15 text-signal"
                    : "bg-white/10 text-white/70"
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
      <button className="w-full flex items-center gap-2.5 px-2 py-2 rounded-panel hover:bg-white/[0.06] transition-all duration-150">
        {/* Mono avatar with initials */}
        <div className="w-8 h-8 rounded-frame bg-void-700 border border-hairline-dark text-white flex items-center justify-center font-mono text-[11px] font-semibold shrink-0">
          {orgName.slice(0, 2).toUpperCase()}
        </div>
        <div className="flex-1 min-w-0 text-left">
          <div className="text-[13px] font-medium text-white/90 truncate">{orgName}</div>
          <div className="font-mono text-[10px] text-white/40 truncate">Abmelden</div>
        </div>
        <ChevronRight size={13} className="text-white/25 shrink-0" />
      </button>
    </form>
  );

  const logoBlock = (
    <div className="h-16 px-4 flex items-center border-b border-hairline-dark">
      <Logo tone="dark" size={28} />
    </div>
  );

  return (
    <>
      {/* Desktop-Sidebar */}
      <aside className="hidden md:flex w-60 shrink-0 bg-void-800 flex-col">
        {logoBlock}
        <div className="p-2 space-y-0.5 flex-1 overflow-y-auto">{navList}</div>
        <div className="p-3 border-t border-hairline-dark">{profileBlock}</div>
      </aside>

      {/* Mobile-Drawer + Backdrop */}
      <div
        className={`md:hidden fixed inset-0 z-50 transition-opacity duration-200 ${
          mobileOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
        aria-hidden={!mobileOpen}
      >
        <div
          className="absolute inset-0 bg-black/60"
          onClick={() => setMobileOpen(false)}
        />
        <aside
          className={`absolute left-0 top-0 bottom-0 w-72 max-w-[85vw] bg-void-800 flex flex-col shadow-frame transition-transform duration-200 ${
            mobileOpen ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          <div className="h-16 px-4 flex items-center justify-between border-b border-hairline-dark">
            <Logo tone="dark" size={28} />
            <button
              onClick={() => setMobileOpen(false)}
              className="touch-target -mr-2 flex items-center justify-center text-white/40 hover:text-white"
              aria-label="Menü schließen"
            >
              <X size={18} />
            </button>
          </div>
          <div className="p-2 space-y-0.5 flex-1 overflow-y-auto">{navList}</div>
          <div className="p-3 border-t border-hairline-dark safe-bottom">{profileBlock}</div>
        </aside>
      </div>
    </>
  );
};

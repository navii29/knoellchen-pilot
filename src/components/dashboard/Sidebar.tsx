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
      <div className="text-[11px] font-medium uppercase tracking-wider text-ink-muted px-3 py-2.5">
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
            className={`group w-full flex items-center gap-2.5 px-3 py-2 rounded-btn text-[13.5px] transition-all duration-150 ${
              isActive
                ? "glass-active text-signal font-medium"
                : "text-ink-soft hover:bg-white/40 hover:text-ink"
            }`}
          >
            <it.Icon
              size={16}
              strokeWidth={isActive ? 2.1 : 1.85}
              className={isActive ? "text-signal" : "text-ink-muted group-hover:text-ink-soft"}
            />
            <span>{it.label}</span>
            {badge != null && badge > 0 && (
              <span
                className={`ml-auto text-[10.5px] font-medium tabular-nums px-1.5 py-0.5 rounded-full ${
                  isActive ? "bg-signal/15 text-signal" : "bg-black/[0.05] text-ink-muted"
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
      <button className="w-full flex items-center gap-2.5 px-2 py-2 rounded-btn hover:bg-black/[0.04] transition-all duration-150">
        <div className="w-8 h-8 rounded-full bg-graphite text-white flex items-center justify-center text-[11px] font-semibold shrink-0">
          {orgName.slice(0, 2).toUpperCase()}
        </div>
        <div className="flex-1 min-w-0 text-left">
          <div className="text-[13px] font-medium text-ink truncate">{orgName}</div>
          <div className="text-[11px] text-ink-muted truncate">Abmelden</div>
        </div>
        <ChevronRight size={14} className="text-ink-muted shrink-0" />
      </button>
    </form>
  );

  const logoBlock = (
    <div className="h-16 px-4 flex items-center border-b border-hairline">
      <Logo tone="light" size={28} />
    </div>
  );

  return (
    <>
      {/* Desktop-Sidebar — frosted glass chrome */}
      <aside className="hidden md:flex w-60 shrink-0 glass-chrome border-y-0 border-l-0 flex-col relative z-10">
        {logoBlock}
        <div className="p-2 space-y-0.5 flex-1 overflow-y-auto">{navList}</div>
        <div className="p-3 border-t border-hairline">{profileBlock}</div>
      </aside>

      {/* Mobile-Drawer + Backdrop */}
      <div
        className={`md:hidden fixed inset-0 z-50 transition-opacity duration-200 ${
          mobileOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
        aria-hidden={!mobileOpen}
      >
        <div
          className="absolute inset-0 bg-black/30 backdrop-blur-sm"
          onClick={() => setMobileOpen(false)}
        />
        <aside
          className={`absolute left-0 top-0 bottom-0 w-72 max-w-[85vw] glass-raised flex flex-col transition-transform duration-200 ${
            mobileOpen ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          <div className="h-16 px-4 flex items-center justify-between border-b border-hairline">
            <Logo tone="light" size={28} />
            <button
              onClick={() => setMobileOpen(false)}
              className="touch-target -mr-2 flex items-center justify-center text-ink-muted hover:text-ink"
              aria-label="Menü schließen"
            >
              <X size={18} />
            </button>
          </div>
          <div className="p-2 space-y-0.5 flex-1 overflow-y-auto">{navList}</div>
          <div className="p-3 border-t border-hairline safe-bottom">{profileBlock}</div>
        </aside>
      </div>
    </>
  );
};

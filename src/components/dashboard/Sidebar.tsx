"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  Activity,
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
import { hasPermission, type PermissionKey } from "@/lib/permissions";

type BadgeKey = "tickets" | "contracts" | "customers" | "damage";

const ITEMS: Array<{
  href: string;
  label: string;
  Icon: typeof Car;
  badgeKey?: BadgeKey;
  ownerOnly?: boolean;
  perm?: PermissionKey;
}> = [
  { href: "/dashboard", label: "Dashboard", Icon: LayoutDashboard },
  { href: "/dashboard/assistant", label: "Assistent", Icon: WandSparkles },
  { href: "/dashboard/contracts", label: "Verträge", Icon: FileSignature, badgeKey: "contracts" },
  { href: "/dashboard/customers", label: "Kunden", Icon: Users, badgeKey: "customers" },
  { href: "/dashboard/partners", label: "Partner", Icon: Handshake, ownerOnly: true },
  { href: "/dashboard/tickets", label: "Strafzettel", Icon: FileText, badgeKey: "tickets" },
  { href: "/dashboard/damage-reports", label: "Schäden", Icon: AlertOctagon, badgeKey: "damage" },
  { href: "/dashboard/vehicles", label: "Fahrzeuge", Icon: Car },
  { href: "/dashboard/calendar", label: "Kalender", Icon: Calendar },
  { href: "/dashboard/reports", label: "Auswertung", Icon: BarChart3, ownerOnly: true },
  { href: "/dashboard/monitoring", label: "Überwachung", Icon: Activity, perm: "monitoring" },
  { href: "/dashboard/settings", label: "Einstellungen", Icon: Settings, perm: "settings" },
];

export const SIDEBAR_OPEN_EVENT = "dashboard:open-sidebar";

export const Sidebar = ({
  orgName,
  userRole = "member",
  userPermissions = [],
  ticketCount,
  contractCount,
  customerCount,
  damageCount,
}: {
  orgName: string;
  userRole?: string;
  userPermissions?: string[];
  ticketCount: number;
  contractCount: number;
  customerCount: number;
  damageCount: number;
}) => {
  const isOwner = userRole === "owner";
  const me = { role: userRole, permissions: userPermissions };
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
      <div className="text-[11px] font-medium uppercase tracking-wider text-white/40 px-3 py-2.5">
        Arbeitsbereich
      </div>
      {ITEMS.map((it) => {
        if (it.ownerOnly && !isOwner) return null;
        if (it.perm && !hasPermission(me, it.perm)) return null;
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
                ? "bg-white/[0.12] text-white font-medium"
                : "text-white/65 hover:bg-white/[0.07] hover:text-white"
            }`}
          >
            <it.Icon
              size={16}
              strokeWidth={isActive ? 2.1 : 1.85}
              className={isActive ? "text-white" : "text-white/55 group-hover:text-white/85"}
            />
            <span>{it.label}</span>
            {badge != null && badge > 0 && (
              <span
                className={`ml-auto text-[10.5px] font-medium tabular-nums px-1.5 py-0.5 rounded-full ${
                  isActive ? "bg-white/20 text-white" : "bg-white/10 text-white/55"
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
      <button className="w-full flex items-center gap-2.5 px-2 py-2 rounded-btn hover:bg-white/[0.07] transition-all duration-150">
        <div className="w-8 h-8 rounded-full bg-white/[0.12] text-white flex items-center justify-center text-[11px] font-semibold shrink-0">
          {orgName.slice(0, 2).toUpperCase()}
        </div>
        <div className="flex-1 min-w-0 text-left">
          <div className="text-[13px] font-medium text-white truncate">{orgName}</div>
          <div className="text-[11px] text-white/50 truncate">Abmelden</div>
        </div>
        <ChevronRight size={14} className="text-white/50 shrink-0" />
      </button>
    </form>
  );

  const logoBlock = (
    <div className="h-16 px-4 flex items-center border-b border-white/10">
      <Logo tone="dark" size={28} />
    </div>
  );

  const legalLinks = (
    <div className="flex items-center gap-x-3 gap-y-1 flex-wrap px-3 pt-2 text-[11px] text-white/40">
      <Link href="/impressum" className="hover:text-white/70 transition-colors">Impressum</Link>
      <Link href="/datenschutz" className="hover:text-white/70 transition-colors">Datenschutz</Link>
      <Link href="/agb" className="hover:text-white/70 transition-colors">AGB</Link>
    </div>
  );

  return (
    <>
      {/* Desktop-Sidebar — dunkles, cleanes Chrome */}
      <aside className="hidden md:flex w-60 shrink-0 bg-void-700 border-r border-white/[0.08] flex-col relative z-10">
        {logoBlock}
        <div className="p-2 space-y-0.5 flex-1 overflow-y-auto scroll-thin">{navList}</div>
        <div className="p-3 border-t border-white/10">{profileBlock}{legalLinks}</div>
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
          className={`absolute left-0 top-0 bottom-0 w-72 max-w-[85vw] bg-void-700 flex flex-col transition-transform duration-200 ${
            mobileOpen ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          <div className="h-16 px-4 flex items-center justify-between border-b border-white/10">
            <Logo tone="dark" size={28} />
            <button
              onClick={() => setMobileOpen(false)}
              className="touch-target -mr-2 flex items-center justify-center text-white/60 hover:text-white"
              aria-label="Menü schließen"
            >
              <X size={18} />
            </button>
          </div>
          <div className="p-2 space-y-0.5 flex-1 overflow-y-auto scroll-thin">{navList}</div>
          <div className="p-3 border-t border-white/10 safe-bottom">{profileBlock}{legalLinks}</div>
        </aside>
      </div>
    </>
  );
};

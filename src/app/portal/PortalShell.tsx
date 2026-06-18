"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Car, Home, LogOut, Menu, Ticket } from "lucide-react";
import { Logo } from "@/components/ui/Logo";

const TABS = [
  { href: "/portal/dashboard", label: "Start", Icon: Home, match: (p: string) => p === "/portal/dashboard" },
  { href: "/portal/contracts", label: "Mieten", Icon: Car, match: (p: string) => p.startsWith("/portal/contracts") },
  { href: "/portal/strafzettel", label: "Strafzettel", Icon: Ticket, match: (p: string) => p.startsWith("/portal/strafzettel") },
  {
    href: "/portal/mehr",
    label: "Mehr",
    Icon: Menu,
    match: (p: string) =>
      p.startsWith("/portal/mehr") ||
      p.startsWith("/portal/documents") ||
      p.startsWith("/portal/profile") ||
      p.startsWith("/portal/hilfe"),
  },
];

export const PortalShell = ({
  orgName,
  orgLogoUrl,
  customerName,
  children,
}: {
  orgName: string;
  orgLogoUrl?: string | null;
  customerName: string;
  children: React.ReactNode;
}) => {
  const pathname = usePathname() ?? "";
  const router = useRouter();

  const onLogout = async () => {
    await fetch("/api/portal/logout", { method: "POST" });
    router.replace("/portal/login");
    router.refresh();
  };

  return (
    <div className="min-h-screen bg-canvas relative isolate flex flex-col">
      {/* Aurora field — das Licht, das das Liquid Glass bricht. */}
      <div className="workspace-aurora" aria-hidden />

      {/* Kopf — Glas-Chrome */}
      <header className="glass-chrome border-b border-hairline sticky top-0 z-30">
        <div className="max-w-2xl mx-auto px-5 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            {orgLogoUrl ? (
              <div className="h-8 max-w-[140px] flex items-center shrink-0">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={orgLogoUrl} alt={orgName} className="max-h-8 max-w-full object-contain" />
              </div>
            ) : (
              <Logo size={26} tone="light" wordmark={false} />
            )}
            <div className="min-w-0">
              <div className="kicker text-ink-muted leading-none mb-0.5">Kundenportal</div>
              <div
                className={`font-display text-[14px] tracking-tight font-semibold text-ink truncate leading-tight ${
                  orgLogoUrl ? "sr-only sm:not-sr-only" : ""
                }`}
              >
                {orgName}
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={onLogout}
            className="text-ink-muted hover:text-ink inline-flex items-center gap-1.5 text-[12px] font-medium transition-colors touch-target justify-end"
          >
            <LogOut size={13} />
            <span className="hidden sm:inline">Abmelden</span>
          </button>
        </div>
      </header>

      <main className="relative z-10 flex-1 pb-24 sm:pb-10">
        <div className="max-w-2xl mx-auto">
          <div className="px-5 pt-4 text-[12px] text-ink-muted font-mono">
            Hallo, <span className="font-semibold text-ink-soft">{customerName}</span>
          </div>
          {children}
        </div>
      </main>

      {/* Mobile Bottom-Nav — Glas-Chrome */}
      <nav className="fixed sm:hidden bottom-0 inset-x-0 glass-chrome border-t border-hairline z-30 safe-bottom">
        <div className="max-w-2xl mx-auto grid grid-cols-4 px-2 py-1.5">
          {TABS.map(({ href, label, Icon, match }) => {
            const active = match(pathname);
            return (
              <Link
                key={href}
                href={href}
                className={`flex flex-col items-center justify-center gap-0.5 py-1.5 rounded-xl transition-colors touch-target ${
                  active ? "glass-active text-signal" : "text-ink-muted"
                }`}
              >
                <Icon size={18} strokeWidth={active ? 2.4 : 1.8} />
                <span className="text-[10px] font-medium tracking-wide">{label}</span>
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Desktop Tab-Bar */}
      <nav className="hidden sm:block glass-chrome border-t border-hairline relative z-10">
        <div className="max-w-2xl mx-auto flex items-center gap-1 px-5 py-2">
          {TABS.map(({ href, label, Icon, match }) => {
            const active = match(pathname);
            return (
              <Link
                key={href}
                href={href}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-btn text-[13px] font-medium transition-colors ${
                  active ? "bg-signal text-white" : "text-ink-soft hover:bg-ink/5"
                }`}
              >
                <Icon size={13} />
                {label}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
};

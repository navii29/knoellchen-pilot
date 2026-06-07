"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  FileSignature,
  FileText,
  Home,
  LogOut,
  User,
} from "lucide-react";
import { Logo } from "@/components/ui/Logo";

const TABS = [
  { href: "/portal/dashboard", label: "Übersicht", Icon: Home },
  { href: "/portal/contracts", label: "Verträge", Icon: FileSignature },
  { href: "/portal/documents", label: "Dokumente", Icon: FileText },
  { href: "/portal/profile", label: "Profil", Icon: User },
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
    <div className="min-h-screen bg-canvas flex flex-col">
      {/* top header — hairline bottom, paper surface */}
      <header className="bg-paper border-b border-hairline">
        <div className="max-w-2xl mx-auto px-5 py-3.5 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            {orgLogoUrl ? (
              <div className="h-8 max-w-[140px] flex items-center shrink-0">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={orgLogoUrl}
                  alt={orgName}
                  className="max-h-8 max-w-full object-contain"
                />
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
            className="text-ink-muted hover:text-ink inline-flex items-center gap-1.5 text-[12px] font-medium transition-colors"
          >
            <LogOut size={13} />
            <span className="hidden sm:inline">Abmelden</span>
          </button>
        </div>
      </header>

      <main className="flex-1 pb-24 sm:pb-8">
        <div className="max-w-2xl mx-auto">
          <div className="px-5 pt-4 text-[12px] text-ink-muted font-mono">
            Hallo, <span className="font-semibold text-ink-soft">{customerName}</span>
          </div>
          {children}
        </div>
      </main>

      {/* mobile bottom nav — fixed, hairline top */}
      <nav className="fixed sm:hidden bottom-0 inset-x-0 bg-paper border-t border-hairline z-40">
        <div className="max-w-2xl mx-auto grid grid-cols-4">
          {TABS.map(({ href, label, Icon }) => {
            const active = pathname === href || pathname.startsWith(`${href}/`);
            return (
              <Link
                key={href}
                href={href}
                className={`flex flex-col items-center gap-0.5 py-2.5 transition-colors ${
                  active ? "text-signal" : "text-ink-muted"
                }`}
              >
                <Icon size={18} strokeWidth={active ? 2.4 : 1.8} />
                <span className="text-[10px] font-medium tracking-wide uppercase">{label}</span>
              </Link>
            );
          })}
        </div>
      </nav>

      {/* desktop tab bar — hairline top */}
      <nav className="hidden sm:block bg-paper border-t border-hairline">
        <div className="max-w-2xl mx-auto flex items-center gap-1 px-5 py-2">
          {TABS.map(({ href, label, Icon }) => {
            const active = pathname === href || pathname.startsWith(`${href}/`);
            return (
              <Link
                key={href}
                href={href}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-btn text-[13px] font-medium transition-colors ${
                  active
                    ? "bg-signal text-white"
                    : "text-ink-soft hover:bg-ink/5"
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

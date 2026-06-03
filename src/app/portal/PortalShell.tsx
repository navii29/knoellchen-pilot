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
    <div className="min-h-screen bg-zinc-50 flex flex-col">
      <header className="bg-white border-b border-zinc-200/70">
        <div className="max-w-2xl mx-auto px-5 py-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            {orgLogoUrl ? (
              <div className="h-9 max-w-[140px] flex items-center shrink-0">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={orgLogoUrl}
                  alt={orgName}
                  className="max-h-9 max-w-full object-contain"
                />
              </div>
            ) : (
              <div className="w-9 h-9 rounded-xl bg-zinc-900 flex items-center justify-center shadow shadow-indigo-500/20 shrink-0">
                <span className="text-white font-bold text-[15px]">
                  {orgName.slice(0, 1).toUpperCase()}
                </span>
              </div>
            )}
            <div className="min-w-0">
              <div className="text-[10.5px] uppercase tracking-[0.08em] text-zinc-500 font-medium">
                Kundenportal
              </div>
              <div
                className={`font-display text-[15px] tracking-tight font-medium text-zinc-900 truncate leading-tight ${
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
            className="text-zinc-500 hover:text-zinc-900 inline-flex items-center gap-1 text-xs"
          >
            <LogOut size={13} />
            <span className="hidden sm:inline">Abmelden</span>
          </button>
        </div>
      </header>

      <main className="flex-1 pb-24 sm:pb-8">
        <div className="max-w-2xl mx-auto">
          <div className="px-5 pt-4 text-xs text-zinc-500">
            Hallo, <span className="font-medium text-zinc-700">{customerName}</span>
          </div>
          {children}
        </div>
      </main>

      <nav className="fixed sm:hidden bottom-0 inset-x-0 bg-white border-t border-zinc-200 z-40">
        <div className="max-w-2xl mx-auto grid grid-cols-4">
          {TABS.map(({ href, label, Icon }) => {
            const active = pathname === href || pathname.startsWith(`${href}/`);
            return (
              <Link
                key={href}
                href={href}
                className={`flex flex-col items-center gap-0.5 py-2.5 ${
                  active ? "text-zinc-900" : "text-zinc-400"
                }`}
              >
                <Icon size={18} strokeWidth={active ? 2.4 : 1.8} />
                <span className="text-[10.5px] font-medium">{label}</span>
              </Link>
            );
          })}
        </div>
      </nav>

      <nav className="hidden sm:block bg-white border-t border-zinc-200">
        <div className="max-w-2xl mx-auto flex items-center gap-1 px-5 py-2">
          {TABS.map(({ href, label, Icon }) => {
            const active = pathname === href || pathname.startsWith(`${href}/`);
            return (
              <Link
                key={href}
                href={href}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[13px] font-medium ${
                  active
                    ? "bg-zinc-900 text-white"
                    : "text-zinc-600 hover:bg-zinc-100"
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

"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AppleLink } from "./AppleButton";

const LINKS = [
  { href: "#produkt", label: "Produkt" },
  { href: "#funktionen", label: "Funktionen" },
  { href: "#preise", label: "Preise" },
  { href: "#faq", label: "FAQ" },
];

export const AppleNav = () => {
  const [open, setOpen] = useState(false);

  // lock body scroll when the mobile sheet is open
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <div className="fixed top-0 inset-x-0 z-50 flex justify-center px-4 pt-3 pointer-events-none">
      <header className="pointer-events-auto w-full max-w-3xl glass-light rounded-pill shadow-[0_8px_30px_-12px_rgba(0,0,0,0.18)]">
        <div className="h-12 pl-5 pr-2 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 group" aria-label="Knöllchen-Pilot">
            <span
              className="inline-flex items-center justify-center w-6 h-6 rounded-full text-white text-[12px] font-semibold"
              style={{ background: "linear-gradient(135deg,#0894ff,#8668ff)" }}
            >
              K
            </span>
            <span className="text-[14px] font-semibold tracking-tight text-graphite">
              Knöllchen-Pilot
            </span>
          </Link>

          <nav className="hidden md:flex items-center gap-1 text-[13px]">
            {LINKS.map((l) => (
              <a
                key={l.href}
                href={l.href}
                className="px-3 py-1.5 rounded-full text-graphite-soft hover:text-graphite hover:bg-black/[0.04] transition-colors"
              >
                {l.label}
              </a>
            ))}
          </nav>

          <div className="flex items-center gap-1.5">
            <Link
              href="/login"
              className="hidden sm:inline-flex px-3 h-9 items-center text-[13px] text-graphite-soft hover:text-graphite transition-colors"
            >
              Anmelden
            </Link>
            <AppleLink href="/register" variant="azure" size="sm">
              Testen
            </AppleLink>
            <button
              aria-label="Menü"
              onClick={() => setOpen((v) => !v)}
              className="md:hidden w-9 h-9 inline-flex items-center justify-center rounded-full text-graphite-soft hover:bg-black/[0.04]"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                {open ? <><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></> : <><line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" /></>}
              </svg>
            </button>
          </div>
        </div>

        {open && (
          <div className="md:hidden px-3 pb-3 pt-1 space-y-1">
            {LINKS.map((l) => (
              <a
                key={l.href}
                href={l.href}
                onClick={() => setOpen(false)}
                className="block px-3 py-2.5 rounded-2xl text-[15px] text-graphite hover:bg-black/[0.04]"
              >
                {l.label}
              </a>
            ))}
            <Link href="/login" onClick={() => setOpen(false)} className="block px-3 py-2.5 rounded-2xl text-[15px] text-graphite-soft">
              Anmelden
            </Link>
          </div>
        )}
      </header>
    </div>
  );
};

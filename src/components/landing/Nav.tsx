"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

const Mark = () => (
  <div className="flex items-center gap-2.5">
    <div className="w-7 h-7 rounded-[7px] bg-zinc-950 flex items-center justify-center text-white text-[13px] font-semibold leading-none">
      K
    </div>
    <span className="font-semibold text-[15px] tracking-[-0.02em] text-zinc-950">
      Knöllchen-Pilot
    </span>
  </div>
);

export const Nav = () => {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={`fixed top-0 inset-x-0 z-50 transition-colors duration-200 ${
        scrolled
          ? "bg-white/80 backdrop-blur-xl border-b border-zinc-200/80"
          : "bg-transparent border-b border-transparent"
      }`}
    >
      <div className="max-w-6xl mx-auto px-5 lg:px-8 h-16 flex items-center justify-between">
        <Link href="/" aria-label="Knöllchen-Pilot — Startseite">
          <Mark />
        </Link>

        <nav className="hidden md:flex items-center gap-8 text-[14px] text-zinc-600">
          <a href="#features" className="hover:text-zinc-950 transition-colors">Funktionen</a>
          <a href="#pricing" className="hover:text-zinc-950 transition-colors">Preise</a>
          <a href="#faq" className="hover:text-zinc-950 transition-colors">FAQ</a>
        </nav>

        <div className="flex items-center gap-1.5">
          <Link
            href="/login"
            className="hidden sm:inline-flex h-9 items-center px-3 text-[14px] text-zinc-600 hover:text-zinc-950 transition-colors"
          >
            Anmelden
          </Link>
          <Link
            href="/register"
            className="inline-flex items-center h-9 px-4 rounded-lg bg-indigo-600 text-white text-[13.5px] font-medium hover:bg-indigo-500 transition-colors"
          >
            Kostenlos testen
          </Link>
          <button
            aria-label="Menü"
            onClick={() => setOpen((v) => !v)}
            className="md:hidden w-9 h-9 inline-flex items-center justify-center rounded-lg text-zinc-700 hover:bg-zinc-100 transition-colors"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              {open ? (
                <>
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </>
              ) : (
                <>
                  <line x1="3" y1="6" x2="21" y2="6" />
                  <line x1="3" y1="12" x2="21" y2="12" />
                  <line x1="3" y1="18" x2="21" y2="18" />
                </>
              )}
            </svg>
          </button>
        </div>
      </div>

      {open && (
        <div className="md:hidden bg-white border-t border-zinc-200 px-5 py-5 space-y-1 text-[15px] text-zinc-700">
          <a href="#features" onClick={() => setOpen(false)} className="block py-2">Funktionen</a>
          <a href="#pricing" onClick={() => setOpen(false)} className="block py-2">Preise</a>
          <a href="#faq" onClick={() => setOpen(false)} className="block py-2">FAQ</a>
          <Link href="/login" onClick={() => setOpen(false)} className="block py-2">Anmelden</Link>
          <Link
            href="/register"
            onClick={() => setOpen(false)}
            className="block mt-2 text-center h-11 leading-[44px] rounded-lg bg-indigo-600 text-white font-medium"
          >
            Kostenlos testen
          </Link>
        </div>
      )}
    </header>
  );
};

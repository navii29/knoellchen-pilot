"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

export const Nav = () => {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 16);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={`fixed top-0 inset-x-0 z-50 transition-all duration-300 ${
        scrolled
          ? "bg-black/70 backdrop-blur-xl border-b border-white/10"
          : "bg-transparent border-b border-transparent"
      }`}
    >
      <div className="max-w-7xl mx-auto px-6 lg:px-10 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 group">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-teal-400 to-emerald-500 flex items-center justify-center shadow-lg shadow-teal-500/30">
            <span className="text-black font-bold text-[13px]">K</span>
          </div>
          <span className="text-white font-medium tracking-tight text-[15px]">
            Knöllchen-Pilot
          </span>
        </Link>

        <nav className="hidden md:flex items-center gap-8 text-[14px] text-white/70">
          <a href="#features" className="hover:text-white transition-colors">
            Features
          </a>
          <a href="#pricing" className="hover:text-white transition-colors">
            Preise
          </a>
          <a href="#faq" className="hover:text-white transition-colors">
            FAQ
          </a>
        </nav>

        <div className="flex items-center gap-3">
          <Link
            href="/login"
            className="hidden sm:inline-flex text-[14px] text-white/70 hover:text-white transition-colors"
          >
            Login
          </Link>
          <Link
            href="/register"
            className="inline-flex items-center px-4 h-9 rounded-full bg-white text-black text-[13.5px] font-medium hover:bg-white/90 transition-colors"
          >
            Kostenlos testen
          </Link>
          <button
            aria-label="Menü"
            onClick={() => setOpen((v) => !v)}
            className="md:hidden w-9 h-9 inline-flex items-center justify-center rounded-full text-white/80 hover:bg-white/10 transition-colors"
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
        <div className="md:hidden bg-black/95 backdrop-blur-xl border-t border-white/10 px-6 py-6 space-y-4 text-[15px] text-white/80">
          <a href="#features" onClick={() => setOpen(false)} className="block">Features</a>
          <a href="#pricing" onClick={() => setOpen(false)} className="block">Preise</a>
          <a href="#faq" onClick={() => setOpen(false)} className="block">FAQ</a>
          <Link href="/login" className="block">Login</Link>
        </div>
      )}
    </header>
  );
};

"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Logo } from "@/components/ui/Logo";
import { ButtonLink } from "@/components/ui/Button";

const LINKS = [
  { href: "#leitstelle", label: "Leitstelle" },
  { href: "#features", label: "Module" },
  { href: "#pricing", label: "Preise" },
  { href: "#faq", label: "FAQ" },
];

export const SiteNav = () => {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={`fixed top-0 inset-x-0 z-50 transition-colors duration-300 ${
        scrolled
          ? "bg-void/85 backdrop-blur-xl border-b border-hairline-dark"
          : "bg-transparent border-b border-transparent"
      }`}
    >
      <div className="max-w-wide mx-auto px-5 lg:px-8 h-16 flex items-center justify-between">
        <Link href="/" aria-label="Knöllchen-Pilot — Startseite">
          <Logo tone="dark" />
        </Link>

        <nav className="hidden md:flex items-center gap-1 text-[13.5px]">
          {LINKS.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="px-3 py-2 rounded-btn text-white/55 hover:text-white hover:bg-white/[0.06] transition-colors"
            >
              {l.label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <Link
            href="/login"
            className="hidden sm:inline-flex px-3 h-9 items-center rounded-btn text-[13.5px] text-white/65 hover:text-white transition-colors"
          >
            Anmelden
          </Link>
          <ButtonLink href="/register" variant="signal" size="sm" className="hidden sm:inline-flex">
            14 Tage gratis
          </ButtonLink>
          <button
            aria-label="Menü"
            onClick={() => setOpen((v) => !v)}
            className="md:hidden w-9 h-9 inline-flex items-center justify-center rounded-btn text-white/80 hover:bg-white/10 transition-colors"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              {open ? (
                <><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></>
              ) : (
                <><line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" /></>
              )}
            </svg>
          </button>
        </div>
      </div>

      {open && (
        <div className="md:hidden bg-void border-t border-hairline-dark px-5 py-5 space-y-1 text-[15px]">
          {LINKS.map((l) => (
            <a key={l.href} href={l.href} onClick={() => setOpen(false)} className="block py-2 text-white/80">
              {l.label}
            </a>
          ))}
          <div className="pt-3 flex flex-col gap-2">
            <Link href="/login" onClick={() => setOpen(false)} className="py-2 text-white/70">Anmelden</Link>
            <ButtonLink href="/register" variant="signal" size="md" className="w-full">14 Tage gratis testen</ButtonLink>
          </div>
        </div>
      )}
    </header>
  );
};

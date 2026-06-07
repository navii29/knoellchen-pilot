"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Logo } from "@/components/ui/Logo";
import { ButtonLink } from "@/components/ui/Button";

/**
 * Standalone nav for pages outside the one-page landing (legal pages).
 * Same Leitstelle look as SiteNav, but links point back to homepage sections.
 */
const LINKS = [
  { href: "/#leitstelle", label: "Leitstelle" },
  { href: "/#features", label: "Module" },
  { href: "/#pricing", label: "Preise" },
  { href: "/#faq", label: "FAQ" },
];

export const Nav = () => {
  const [scrolled, setScrolled] = useState(false);

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
            <Link
              key={l.href}
              href={l.href}
              className="px-3 py-2 rounded-btn text-white/55 hover:text-white hover:bg-white/[0.06] transition-colors"
            >
              {l.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <Link
            href="/login"
            className="hidden sm:inline-flex px-3 h-9 items-center rounded-btn text-[13.5px] text-white/65 hover:text-white transition-colors"
          >
            Anmelden
          </Link>
          <ButtonLink href="/register" variant="signal" size="sm">
            14 Tage gratis
          </ButtonLink>
        </div>
      </div>
    </header>
  );
};

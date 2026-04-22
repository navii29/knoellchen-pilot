import Link from "next/link";
import { ArrowRight, Play } from "lucide-react";
import { THEME } from "@/lib/theme";
import { Logo } from "@/components/ui/Logo";

export const Nav = () => (
  <header className="sticky top-0 z-40 backdrop-blur-md bg-stone-50/80 border-b border-stone-200/70">
    <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
      <Logo />
      <nav className="hidden md:flex items-center gap-8 text-sm text-stone-600">
        <a href="#problem" className="hover:text-stone-900">Problem</a>
        <a href="#loesung" className="hover:text-stone-900">Lösung</a>
        <a href="#dashboard" className="hover:text-stone-900">Dashboard</a>
        <a href="#preise" className="hover:text-stone-900">Preise</a>
        <a href="#faq" className="hover:text-stone-900">FAQ</a>
      </nav>
      <div className="flex items-center gap-2">
        <Link
          href="/login"
          className="hidden sm:inline-flex items-center gap-1.5 text-sm text-stone-700 hover:text-stone-900 px-3 py-1.5 rounded-md"
        >
          <Play size={14} /> Anmelden
        </Link>
        <Link
          href="/register"
          className="inline-flex items-center gap-1.5 text-sm text-white px-3.5 py-1.5 rounded-md font-medium shadow-sm"
          style={{ background: THEME.primary }}
        >
          Kostenlos testen <ArrowRight size={14} />
        </Link>
      </div>
    </div>
  </header>
);

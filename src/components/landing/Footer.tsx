/**
 * Footer — Dark bg-void, multi-column, hairline structure.
 * Logo + tagline, nav columns, DSGVO/EU trust line.
 */

import Link from "next/link";
import { Logo } from "@/components/ui/Logo";

const NAV = [
  {
    label: "Produkt",
    links: [
      { label: "Module", href: "/#features" },
      { label: "Preise", href: "/#pricing" },
      { label: "So funktioniert es", href: "/#leitstelle" },
      { label: "Anmelden", href: "/login" },
    ],
  },
  {
    label: "Rechtliches",
    links: [
      { label: "Impressum", href: "/impressum" },
      { label: "Datenschutz", href: "/datenschutz" },
      { label: "AGB", href: "/agb" },
    ],
  },
  {
    label: "Kontakt",
    links: [
      { label: "hallo@knoellchen-pilot.de", href: "mailto:hallo@knoellchen-pilot.de" },
      { label: "Support", href: "mailto:support@knoellchen-pilot.de" },
    ],
  },
];

export const Footer = () => {
  return (
    <footer className="bg-void border-t border-hairline-dark">
      <div className="max-w-wide mx-auto px-5 lg:px-8 py-14 lg:py-16">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-[1.6fr_1fr_1fr_1fr]">
          {/* brand column */}
          <div>
            <Logo tone="dark" size={28} />
            <p className="mt-4 font-mono text-[12px] text-white/40 leading-relaxed max-w-[220px]">
              Die Leitstelle für Autovermietungen. Verträge, Strafzettel und Kunden — in einer Oberfläche.
            </p>
          </div>

          {/* nav columns */}
          {NAV.map((col) => (
            <div key={col.label}>
              <div className="font-mono text-[10.5px] uppercase tracking-widest text-white/30 mb-4">
                {col.label}
              </div>
              <ul className="space-y-2.5">
                {col.links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-[13.5px] text-white/50 hover:text-white/80 transition-colors"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* bottom bar */}
        <div className="mt-12 pt-6 border-t border-hairline-dark flex flex-col sm:flex-row items-center justify-between gap-3">
          <span className="font-mono text-[11.5px] text-white/30 tnum">
            © 2026 Knöllchen-Pilot
          </span>
          <span className="font-mono text-[11.5px] text-white/30">
            Daten in der EU · DSGVO-konform · Kein Outsourcing
          </span>
        </div>
      </div>
    </footer>
  );
};

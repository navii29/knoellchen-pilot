import Link from "next/link";

const COLUMNS: { heading: string; links: { label: string; href: string }[] }[] = [
  {
    heading: "Produkt",
    links: [
      { label: "Funktionen", href: "/#funktionen" },
      { label: "Preise", href: "/#preise" },
      { label: "Anmelden", href: "/login" },
    ],
  },
  {
    heading: "Rechtliches",
    links: [
      { label: "Impressum", href: "/impressum" },
      { label: "Datenschutz", href: "/datenschutz" },
      { label: "AGB", href: "/agb" },
    ],
  },
  {
    heading: "Kontakt",
    links: [
      { label: "hello@knoellchen-pilot.de", href: "mailto:hello@knoellchen-pilot.de" },
      { label: "Support", href: "mailto:support@knoellchen-pilot.de" },
    ],
  },
];

/** Small gradient "K" logomark */
const LogoMark = () => (
  <div className="flex items-center gap-2.5">
    <span
      className="inline-flex items-center justify-center w-8 h-8 rounded-xl text-white text-[15px] font-semibold select-none shrink-0"
      style={{ background: "linear-gradient(135deg, #0894ff 0%, #0071e3 100%)" }}
      aria-hidden
    >
      K
    </span>
    <span className="text-[15px] font-semibold tracking-tight text-graphite">
      Knöllchen-Pilot
    </span>
  </div>
);

export const AppleFooter = () => {
  return (
    <footer className="bg-mist border-t border-black/[0.06]">
      <div className="max-w-[1080px] mx-auto px-5 py-14 sm:py-16">
        {/* top row — logo + columns */}
        <div className="grid sm:grid-cols-4 gap-10 sm:gap-8">
          {/* brand */}
          <div className="sm:col-span-1">
            <LogoMark />
            <p className="mt-3 text-[13px] leading-[1.55] text-graphite-muted max-w-[24ch]">
              Strafzettel automatisch an den richtigen Mieter weiterbelasten. Für Autovermietungen.
            </p>
          </div>

          {/* nav columns */}
          {COLUMNS.map((col) => (
            <div key={col.heading}>
              <div className="text-[11px] font-semibold tracking-widest uppercase text-graphite-muted mb-4">
                {col.heading}
              </div>
              <ul className="space-y-2.5">
                {col.links.map((l) => (
                  <li key={l.href}>
                    <Link
                      href={l.href}
                      className="text-[13px] text-graphite-soft hover:text-azure-link transition-colors duration-150"
                    >
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* bottom row */}
        <div className="mt-12 pt-5 border-t border-black/[0.06] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <p className="text-[12px] text-graphite-muted">
            &copy; 2026 Knöllchen-Pilot. Alle Rechte vorbehalten.
          </p>
          <p className="text-[12px] text-graphite-muted">
            Daten in der EU &middot; DSGVO-konform
          </p>
        </div>
      </div>
    </footer>
  );
};

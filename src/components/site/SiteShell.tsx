import type { CSSProperties } from "react";
import type { PublicSiteContext } from "@/lib/site/public-loader";
import { publicLogoUrl } from "@/lib/site/public-loader";
import { SiteNav } from "./SiteNav";
import { BlockRenderer } from "./BlockRenderer";

// Layout-Flavor pro Template: nur Hülle/Background-Nuancen. Inhalt + Theme-Farbe
// kommen aus den Blöcken / dem Theme.
const FONT_VAR: Record<string, string> = {
  sans: "var(--font-sans)",
  display: "var(--font-display)",
};

// Zentrale Render-Komponente der öffentlichen Mietseite: setzt die Theme-CSS-
// Variablen (Primärfarbe, Schrift, Flächenfarben) und rendert Nav → Blöcke →
// Footer. Die Theme-Farbe wirkt über --site-primary auf alle Blöcke.
export function SiteShell({ ctx }: { ctx: PublicSiteContext }) {
  const { site, org, pages, page, blocks } = ctx;
  const logoUrl = publicLogoUrl(org.logo_path);

  // Helle, neutrale Palette; nur die Akzentfarbe ist themenabhängig.
  const themeVars = {
    "--site-primary": site.theme.primary,
    "--site-font": FONT_VAR[site.theme.font] ?? FONT_VAR.display,
    "--site-bg": "#f7f8fa",
    "--site-surface": "#ffffff",
    "--site-muted": "#eef1f4",
    "--site-border": "#e3e6ea",
    "--site-ink": "#16181d",
    "--site-ink-soft": "#4b5159",
  } as CSSProperties;

  const year = new Date().getFullYear();

  return (
    <div
      style={themeVars}
      className="min-h-screen bg-[var(--site-bg)] font-[var(--site-font)] text-[var(--site-ink)]"
    >
      <SiteNav
        slug={org.slug}
        orgName={org.name}
        pages={pages}
        logoUrl={logoUrl}
        currentPath={page.path}
      />

      <main>
        {blocks.map((block) => (
          <BlockRenderer
            key={block.id}
            block={block}
            slug={org.slug}
            orgId={org.id}
            logoPath={org.logo_path}
          />
        ))}
        {blocks.length === 0 ? (
          <div className="mx-auto max-w-3xl px-6 py-24 text-center text-[var(--site-ink-soft)]">
            Diese Seite hat noch keine Inhalte.
          </div>
        ) : null}
      </main>

      <footer className="border-t border-[var(--site-border)] bg-[var(--site-surface)]">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-2 px-6 py-8 text-sm text-[var(--site-ink-soft)] sm:flex-row">
          <span>
            &copy; {year} {org.name}
          </span>
          <span className="text-xs">Erstellt mit Knoellchen-Pilot</span>
        </div>
      </footer>
    </div>
  );
}

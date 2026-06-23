// Minimales Layout der öffentlichen Mietseiten (/m/[slug]). Erbt NUR das
// Root-<html>/<body> (globals.css, SF-Font-Stack) — KEINE Dashboard- oder
// Marketing-Chrome. Die eigentliche Hülle (Theme, Nav, Footer) liefert der
// SiteShell pro Site, damit jede Org ihr eigenes Theme bekommt.
export const dynamic = "force-dynamic";

export default function SiteRootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}

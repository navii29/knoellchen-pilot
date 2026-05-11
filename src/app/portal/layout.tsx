// Wurzel-Layout des Portals: rendert nur die Children, KEIN Auth-Check.
// Auth + Shell stecken im (app)-Route-Group-Layout. Login-Seite umgeht das
// und rendert ein eigenes minimales Layout.
export const dynamic = "force-dynamic";

export default function PortalRootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}

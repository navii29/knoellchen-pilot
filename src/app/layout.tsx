import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Knöllchen-Pilot — Strafzettel automatisch bearbeiten",
  description:
    "Die KI-Software, die Strafzettel für Autovermietungen vollautomatisch bearbeitet — von der E-Mail der Behörde bis zum Zeugenfragebogen zurück.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: "#0d9488",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="de">
      <body className="overflow-x-hidden">{children}</body>
    </html>
  );
}

import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Knöllchen-Pilot — Strafzettel automatisch bearbeiten",
  description:
    "Die KI-Software, die Strafzettel für Autovermietungen vollautomatisch bearbeitet — von der E-Mail der Behörde bis zum Zeugenfragebogen zurück.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="de">
      <body>{children}</body>
    </html>
  );
}

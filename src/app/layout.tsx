import type { Metadata, Viewport } from "next";
import "./globals.css";

// Eine Schrift überall: San Francisco (System-Stack). Keine Google-Fonts mehr —
// SF rendert nativ auf Apple-Geräten, fällt sonst sauber zurück. Die Font-
// Variablen (--font-sans/-display/-mono) zeigen in globals.css alle auf den
// SF-Stack, damit Tailwind-Klassen font-sans/-display/-mono identisch sind.

const siteUrl =
  process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ||
  "https://knoellchen-pilot.vercel.app";
const siteTitle =
  "Knöllchen-Pilot — Strafzettel automatisch an den Mieter weiterbelasten";
const siteDescription =
  "Bußgeldbescheid für einen Mietwagen? Knöllchen-Pilot liest ihn aus, ordnet den Mieter über den Mietvertrag zu und belastet Bußgeld plus Bearbeitungsgebühr automatisch weiter. Für Autovermietungen in Deutschland.";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: siteTitle,
    template: "%s · Knöllchen-Pilot",
  },
  description: siteDescription,
  applicationName: "Knöllchen-Pilot",
  openGraph: {
    type: "website",
    locale: "de_DE",
    siteName: "Knöllchen-Pilot",
    title: siteTitle,
    description: siteDescription,
    url: siteUrl,
  },
  twitter: {
    card: "summary_large_image",
    title: siteTitle,
    description: siteDescription,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: "#0B0A0C",
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

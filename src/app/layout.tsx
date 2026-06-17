import type { Metadata, Viewport } from "next";
import { Archivo, Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";

// Body / UI — legible workhorse for dense product surfaces.
const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
  variable: "--font-sans",
});

// Display — compact industrial grotesque, the voice of the "Leitstelle".
const archivo = Archivo({
  subsets: ["latin"],
  weight: ["500", "600", "700", "800"],
  display: "swap",
  variable: "--font-display",
});

// Data / IDs / plates / telemetry — the control-center texture.
const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  display: "swap",
  variable: "--font-mono",
});

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
    <html
      lang="de"
      className={`${inter.variable} ${archivo.variable} ${jetbrainsMono.variable}`}
    >
      <body className="overflow-x-hidden">{children}</body>
    </html>
  );
}

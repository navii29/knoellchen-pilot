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

export const metadata: Metadata = {
  title: "Knöllchen-Pilot — Die Leitstelle für Autovermietungen",
  description:
    "Verträge, Flotte, Übergaben und Strafzettel — eine Leitstelle, die den Papierkram selbst abarbeitet. Das Betriebssystem für moderne Autovermietungen.",
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

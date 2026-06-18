import * as Sentry from "@sentry/nextjs";

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

// Ohne DSN passiert nichts (kein Versand) — die Integration ist dann ein No-Op.
if (dsn) {
  Sentry.init({
    dsn,
    // Nur in Produktion aktiv senden; lokal still.
    enabled: process.env.NODE_ENV === "production",
    tracesSampleRate: 0.1,
    // Keine personenbezogenen Daten (IP/Headers) ungefragt mitsenden.
    sendDefaultPii: false,
  });
}

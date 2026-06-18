import { withSentryConfig } from "@sentry/nextjs";

/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverActions: { bodySizeLimit: "12mb" },
    // instrumentation.ts (Sentry-Init) in Next 14 aktivieren.
    instrumentationHook: true,
    // Chromium-Binary nicht durch Webpack ziehen — wird zur Laufzeit aus
    // node_modules geladen. Sonst kommt Vercel an die 50 MB Function-Size-
    // Grenze.
    serverComponentsExternalPackages: ["@sparticuz/chromium", "puppeteer-core"],
    // Statische Assets (Übergabeprotokoll-Template) für die contract-pdf Route
    // ins Function-Bundle ziehen.
    outputFileTracingIncludes: {
      "app/api/contracts/**/*": ["./src/lib/assets/**/*"],
      "app/api/portal/contracts/**/*": ["./src/lib/assets/**/*"],
    },
  },
};

// Sentry umschließt die Config. Ohne DSN/Auth-Token werden keine Source-Maps
// hochgeladen — die Instrumentierung bleibt trotzdem aktiv (No-Op ohne DSN).
export default withSentryConfig(nextConfig, {
  silent: true,
  telemetry: false,
  sourcemaps: { disable: true },
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverActions: { bodySizeLimit: "12mb" },
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

export default nextConfig;

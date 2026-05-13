/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverActions: { bodySizeLimit: "12mb" },
    // Chromium-Binary nicht durch Webpack ziehen — wird zur Laufzeit aus
    // node_modules geladen. Sonst kommt Vercel an die 50 MB Function-Size-
    // Grenze.
    serverComponentsExternalPackages: ["@sparticuz/chromium", "puppeteer-core"],
  },
};

export default nextConfig;

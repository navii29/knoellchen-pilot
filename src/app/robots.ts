import type { MetadataRoute } from "next";

/**
 * Das Kundenportal und das Dashboard verarbeiten Ausweise, Führerscheine,
 * Fotos und Unterschriften — diese Bereiche dürfen NICHT von Suchmaschinen
 * indexiert werden. Zusätzlich setzt die Middleware X-Robots-Tag: noindex.
 */
export default function robots(): MetadataRoute.Robots {
  const base = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") || "https://knoellchen-pilot.vercel.app";
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/portal", "/dashboard", "/onboarding", "/api"],
    },
    sitemap: `${base}/sitemap.xml`,
  };
}

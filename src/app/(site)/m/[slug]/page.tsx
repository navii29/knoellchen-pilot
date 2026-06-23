import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { loadPublicSite } from "@/lib/site/public-loader";
import { SiteShell } from "@/components/site/SiteShell";

export const dynamic = "force-dynamic";

type Params = { params: { slug: string } };

export async function generateMetadata({
  params,
}: Params): Promise<Metadata> {
  const ctx = await loadPublicSite(params.slug, "");
  if (!ctx) return { title: "Nicht gefunden" };
  const title = ctx.site.seo_title || ctx.org.name;
  const description =
    ctx.site.seo_description ||
    `${ctx.org.name} — Mietfahrzeuge und Kontakt.`;
  return {
    title,
    description,
    robots: { index: true, follow: true },
    openGraph: { title, description, type: "website" },
  };
}

export default async function SiteHomePage({ params }: Params) {
  const ctx = await loadPublicSite(params.slug, "");
  if (!ctx) notFound();
  return <SiteShell ctx={ctx} />;
}

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { loadPublicSite } from "@/lib/site/public-loader";
import { SiteShell } from "@/components/site/SiteShell";

export const dynamic = "force-dynamic";

type Params = { params: { slug: string; path: string[] } };

const toPath = (segments: string[]) =>
  (segments ?? []).map((s) => decodeURIComponent(s)).join("/");

export async function generateMetadata({
  params,
}: Params): Promise<Metadata> {
  const ctx = await loadPublicSite(params.slug, toPath(params.path));
  if (!ctx) return { title: "Nicht gefunden" };
  const base = ctx.site.seo_title || ctx.org.name;
  const title = `${ctx.page.title} · ${base}`;
  const description =
    ctx.site.seo_description ||
    `${ctx.org.name} — ${ctx.page.title}.`;
  return {
    title,
    description,
    robots: { index: true, follow: true },
    openGraph: { title, description, type: "website" },
  };
}

export default async function SiteSubPage({ params }: Params) {
  const ctx = await loadPublicSite(params.slug, toPath(params.path));
  if (!ctx) notFound();
  return <SiteShell ctx={ctx} />;
}

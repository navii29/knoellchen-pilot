import Link from "next/link";
import Image from "next/image";
import type { HeroContent } from "@/lib/site/types";

export function Hero({
  content,
  slug,
  logoUrl,
}: {
  content: HeroContent;
  slug: string;
  logoUrl: string | null;
}) {
  const showLogo = content.showLogo !== false && logoUrl;
  return (
    <section className="relative overflow-hidden bg-[var(--site-surface)]">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.07]"
        style={{
          background:
            "radial-gradient(60% 80% at 50% -10%, var(--site-primary), transparent 70%)",
        }}
      />
      <div className="relative mx-auto max-w-5xl px-6 py-20 text-center sm:py-28">
        {showLogo ? (
          <Image
            src={logoUrl as string}
            alt={content.headline}
            width={160}
            height={64}
            unoptimized
            className="mx-auto mb-8 h-16 w-auto object-contain"
          />
        ) : null}
        <h1 className="font-[var(--site-font)] text-4xl font-bold tracking-tight text-[var(--site-ink)] sm:text-6xl">
          {content.headline}
        </h1>
        {content.subline ? (
          <p className="mx-auto mt-6 max-w-2xl text-lg text-[var(--site-ink-soft)]">
            {content.subline}
          </p>
        ) : null}
        {content.ctaLabel ? (
          <div className="mt-10">
            <Link
              href={`/m/${slug}${content.ctaPath ? `/${content.ctaPath}` : ""}`}
              className="inline-flex items-center rounded-full bg-[var(--site-primary)] px-7 py-3 text-base font-semibold text-white shadow-sm transition-opacity hover:opacity-90"
            >
              {content.ctaLabel}
            </Link>
          </div>
        ) : null}
      </div>
    </section>
  );
}

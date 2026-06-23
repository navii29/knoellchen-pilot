import Link from "next/link";
import type { CtaContent } from "@/lib/site/types";

export function Cta({ content, slug }: { content: CtaContent; slug: string }) {
  return (
    <section className="bg-[var(--site-primary)]">
      <div className="mx-auto max-w-4xl px-6 py-16 text-center">
        <h2 className="font-[var(--site-font)] text-3xl font-bold text-white sm:text-4xl">
          {content.headline}
        </h2>
        {content.text ? (
          <p className="mx-auto mt-4 max-w-2xl text-lg text-white/90">
            {content.text}
          </p>
        ) : null}
        {content.ctaLabel ? (
          <div className="mt-8">
            <Link
              href={`/m/${slug}${content.ctaPath ? `/${content.ctaPath}` : ""}`}
              className="inline-flex items-center rounded-full bg-white px-7 py-3 text-base font-semibold text-[var(--site-primary)] shadow-sm transition-opacity hover:opacity-90"
            >
              {content.ctaLabel}
            </Link>
          </div>
        ) : null}
      </div>
    </section>
  );
}

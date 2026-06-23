import Link from "next/link";
import Image from "next/image";
import type { SitePage } from "@/lib/site/types";

// Einfache, öffentliche Navigation aus den Seiten der Site.
export function SiteNav({
  slug,
  orgName,
  pages,
  logoUrl,
  currentPath,
}: {
  slug: string;
  orgName: string;
  pages: SitePage[];
  logoUrl: string | null;
  currentPath: string;
}) {
  return (
    <header className="sticky top-0 z-20 border-b border-[var(--site-border)] bg-[var(--site-surface)]/90 backdrop-blur">
      <nav className="mx-auto flex max-w-6xl items-center justify-between gap-6 px-6 py-4">
        <Link href={`/m/${slug}`} className="flex items-center gap-3">
          {logoUrl ? (
            <Image
              src={logoUrl}
              alt={orgName}
              width={120}
              height={36}
              unoptimized
              className="h-8 w-auto object-contain"
            />
          ) : (
            <span className="font-[var(--site-font)] text-lg font-bold text-[var(--site-ink)]">
              {orgName}
            </span>
          )}
        </Link>
        <ul className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
          {pages.map((p) => {
            const active = p.path === currentPath;
            return (
              <li key={p.id}>
                <Link
                  href={`/m/${slug}${p.path ? `/${p.path}` : ""}`}
                  className={
                    active
                      ? "font-semibold text-[var(--site-primary)]"
                      : "text-[var(--site-ink-soft)] hover:text-[var(--site-ink)]"
                  }
                >
                  {p.title}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </header>
  );
}

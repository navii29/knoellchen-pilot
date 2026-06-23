import Image from "next/image";
import type { GalleryContent } from "@/lib/site/types";

// Gallery erwartet bereits aufgelöste Bild-URLs (der Renderer wandelt Storage-
// Pfade in öffentliche URLs um). Leere Galerien werden nicht gerendert.
export function Gallery({
  content,
  images,
}: {
  content: GalleryContent;
  images: { url: string; alt: string }[];
}) {
  if (images.length === 0) return null;
  return (
    <section className="bg-[var(--site-bg)]">
      <div className="mx-auto max-w-6xl px-6 py-16">
        {content.title ? (
          <h2 className="mb-8 font-[var(--site-font)] text-3xl font-bold text-[var(--site-ink)]">
            {content.title}
          </h2>
        ) : null}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          {images.map((img, i) => (
            <div
              key={i}
              className="relative aspect-[4/3] overflow-hidden rounded-xl border border-[var(--site-border)] bg-[var(--site-muted)]"
            >
              <Image
                src={img.url}
                alt={img.alt}
                fill
                unoptimized
                sizes="(max-width: 640px) 50vw, 33vw"
                className="object-cover"
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

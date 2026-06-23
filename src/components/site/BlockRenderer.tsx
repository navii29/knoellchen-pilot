import type { SiteBlock } from "@/lib/site/types";
import {
  loadPublicVehicles,
  publicLogoUrl,
} from "@/lib/site/public-loader";
import { Hero } from "./blocks/Hero";
import { RichText } from "./blocks/RichText";
import { Fleet } from "./blocks/Fleet";
import { Features } from "./blocks/Features";
import { Gallery } from "./blocks/Gallery";
import { Contact } from "./blocks/Contact";
import { Cta } from "./blocks/Cta";

// Server-Komponente: rendert einen einzelnen Block. Für daten-abhängige Blöcke
// (fleet, gallery, hero-logo) werden die Daten hier serverseitig + org-scoped
// geladen. Alles über @/lib/site/public-loader, der den Admin-Client kapselt.
export async function BlockRenderer({
  block,
  slug,
  orgId,
  logoPath,
}: {
  block: SiteBlock;
  slug: string;
  orgId: string;
  logoPath: string | null;
}) {
  switch (block.type) {
    case "hero":
      return (
        <Hero
          content={block.content}
          slug={slug}
          logoUrl={block.content.showLogo !== false ? publicLogoUrl(logoPath) : null}
        />
      );

    case "richtext":
      return <RichText content={block.content} />;

    case "fleet": {
      const vehicles = await loadPublicVehicles(
        orgId,
        block.content.vehicleIds,
        block.content.limit ?? 12
      );
      return (
        <Fleet
          heading={block.content.title}
          subline={block.content.subline}
          vehicles={vehicles}
        />
      );
    }

    case "features":
      return <Features content={block.content} />;

    case "gallery": {
      const images = (block.content.images ?? [])
        .map((img) => {
          // Absolute URL durchreichen, Storage-Pfad in öffentliche URL wandeln.
          const url = /^https?:\/\//.test(img.path)
            ? img.path
            : publicLogoUrl(img.path);
          return url ? { url, alt: img.alt ?? "" } : null;
        })
        .filter((x): x is { url: string; alt: string } => x !== null);
      return <Gallery content={block.content} images={images} />;
    }

    case "contact":
      return <Contact content={block.content} />;

    case "cta":
      return <Cta content={block.content} slug={slug} />;

    default:
      return null;
  }
}

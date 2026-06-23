// Server-only Loader für den öffentlichen Mietseiten-Renderer (/m/[slug]).
//
// SICHERHEIT: Liest über den Service-Role-Admin-Client (RLS umgangen) und
// filtert deshalb SELBST streng nach org-Slug + published = true. Diese
// Server-Filterung ist die Zugriffskontrolle für die öffentliche Seite.
// Der Admin-Client darf NIEMALS an den Client gelangen — dieses Modul wird
// ausschließlich in Server Components / Server-Code importiert.
//
// Fahrzeuge werden org-scoped geladen und auf die öffentlich unbedenklichen
// Anzeigefelder reduziert (PublicVehicle). Kosten/Margen/EK/Partner-Preise
// werden bewusst NICHT selektiert.

import { createAdminClient } from "@/lib/supabase/server";
import type {
  Site,
  SitePage,
  SiteBlock,
  SiteTheme,
  PublicVehicle,
  SeedOrg,
} from "./types";

const DEFAULT_THEME: SiteTheme = {
  primary: "#0d9488",
  font: "display",
  layout: "modern",
};

export interface PublicSiteContext {
  org: SeedOrg & { id: string; slug: string };
  site: Site;
  pages: SitePage[]; // alle Seiten der Site (für die Navigation), nach sort
  page: SitePage; // die angeforderte Seite
  blocks: SiteBlock[]; // Blöcke der angeforderten Seite, nach sort
}

const coerceTheme = (raw: unknown): SiteTheme => {
  if (raw && typeof raw === "object") {
    const t = raw as Partial<SiteTheme>;
    return {
      primary: typeof t.primary === "string" ? t.primary : DEFAULT_THEME.primary,
      font: t.font === "sans" ? "sans" : "display",
      layout:
        t.layout === "klassisch" || t.layout === "bold"
          ? t.layout
          : "modern",
    };
  }
  return DEFAULT_THEME;
};

// Lädt die öffentliche Site-Seite für (slug, path). Gibt null zurück, wenn die
// Org/Site/Seite fehlt ODER die Site nicht veröffentlicht ist → der Renderer
// ruft dann notFound().
export const loadPublicSite = async (
  slug: string,
  path: string
): Promise<PublicSiteContext | null> => {
  if (!slug) return null;
  const admin = createAdminClient();

  const { data: org } = await admin
    .from("organizations")
    .select("id, name, street, zip, city, phone, email, logo_path, slug")
    .eq("slug", slug)
    .maybeSingle();
  if (!org || !org.slug) return null;

  const { data: siteRow } = await admin
    .from("sites")
    .select("*")
    .eq("org_id", org.id)
    .eq("published", true) // Zugriffskontrolle: nur veröffentlichte Sites
    .maybeSingle();
  if (!siteRow) return null;

  const site: Site = { ...siteRow, theme: coerceTheme(siteRow.theme) };

  const { data: pages } = await admin
    .from("site_pages")
    .select("*")
    .eq("site_id", site.id)
    .eq("org_id", org.id)
    .order("sort", { ascending: true });
  if (!pages || pages.length === 0) return null;

  const page = pages.find((p) => p.path === path);
  if (!page) return null;

  const { data: blocks } = await admin
    .from("site_blocks")
    .select("*")
    .eq("page_id", page.id)
    .eq("org_id", org.id)
    .order("sort", { ascending: true });

  return {
    org,
    site,
    pages,
    page,
    blocks: (blocks ?? []) as SiteBlock[],
  };
};

// Öffentlich unbedenkliche Fahrzeugfelder, org-scoped. NIE Kosten/Margen/EK.
export const loadPublicVehicles = async (
  orgId: string,
  vehicleIds?: string[],
  limit = 12
): Promise<PublicVehicle[]> => {
  const admin = createAdminClient();
  let query = admin
    .from("vehicles")
    .select(
      "id, vehicle_type, manufacturer, model, body_type, fuel_type, transmission, seats, doors, daily_rate"
    )
    .eq("org_id", orgId)
    .eq("status", "aktiv")
    .order("manufacturer", { ascending: true });

  if (vehicleIds && vehicleIds.length > 0) {
    query = query.in("id", vehicleIds);
  }
  query = query.limit(limit);

  const { data } = await query;
  return (data ?? []) as PublicVehicle[];
};

// Öffentliche URL des Org-Logos (Bucket "brand" ist public, Migration 023).
export const publicLogoUrl = (logoPath: string | null): string | null => {
  if (!logoPath) return null;
  const admin = createAdminClient();
  const { data } = admin.storage.from("brand").getPublicUrl(logoPath);
  return data?.publicUrl ?? null;
};

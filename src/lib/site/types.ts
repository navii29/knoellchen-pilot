// Website-Builder ("Mietseite") — Typen für Datenmodell, Blöcke und Theme.
// Phase 1: Datenmodell + öffentlicher Renderer + 3 Templates. Der Block-Editor
// im Dashboard folgt in Phase 2.
//
// Sicherheit: Block-`content` enthält ausschließlich vom Vermieter gepflegte,
// für die Öffentlichkeit gedachte Felder. Kosten/Margen/EK/Partner-Preise eines
// Fahrzeugs landen NIE im content — der Fleet-Block referenziert nur neutrale
// Anzeigefelder (siehe PublicVehicle).

export type SiteTemplate = "modern" | "klassisch" | "bold";

export type BlockType =
  | "hero"
  | "richtext"
  | "fleet"
  | "gallery"
  | "features"
  | "contact"
  | "cta";

// Theme: vom Template gesetzt, vom Renderer als CSS-Variable angewandt.
export interface SiteTheme {
  primary: string; // Akzentfarbe (CSS-Farbe, z. B. "#0d9488")
  font: "sans" | "display"; // Schrift-Flavor (mappt auf font-sans / font-display)
  layout: "modern" | "klassisch" | "bold"; // Layout-Flavor (Abstände/Rundungen)
}

export interface Site {
  id: string;
  org_id: string;
  template: SiteTemplate;
  theme: SiteTheme;
  published: boolean;
  seo_title: string | null;
  seo_description: string | null;
  created_at: string;
  updated_at: string;
}

export interface SitePage {
  id: string;
  site_id: string;
  org_id: string;
  title: string;
  path: string; // Home = ''
  sort: number;
  created_at: string;
}

// ---------------------------------------------------------------------------
// Block-content Shapes (diskriminierte Union über `type`).
// ---------------------------------------------------------------------------

export interface HeroContent {
  headline: string;
  subline?: string;
  ctaLabel?: string;
  ctaPath?: string; // interner Seitenpfad, z. B. 'kontakt'
  showLogo?: boolean;
}

export interface RichTextContent {
  // Markdown-lite (Absätze, ## Überschriften, - Listen). KEIN roh-HTML —
  // der Renderer rendert als Text/Markdown, nie via dangerouslySetInnerHTML.
  title?: string;
  body: string;
}

export interface FleetContent {
  title?: string;
  subline?: string;
  // Leer = alle aktiven Fahrzeuge der Org (serverseitig, org-scoped, nur
  // neutrale Anzeigefelder). Optional eine kuratierte Auswahl an vehicle_ids.
  vehicleIds?: string[];
  limit?: number;
}

export interface GalleryImage {
  path: string; // Storage-Pfad oder absolute URL
  alt?: string;
}
export interface GalleryContent {
  title?: string;
  images: GalleryImage[];
}

export interface FeatureItem {
  icon?: string; // lucide-Icon-Name
  title: string;
  text?: string;
}
export interface FeaturesContent {
  title?: string;
  items: FeatureItem[];
}

export interface ContactContent {
  title?: string;
  name?: string;
  street?: string;
  zip?: string;
  city?: string;
  phone?: string;
  email?: string;
}

export interface CtaContent {
  headline: string;
  text?: string;
  ctaLabel?: string;
  ctaPath?: string;
}

// Diskriminierte Union: jeder Block trägt seinen passenden content.
export type SiteBlock =
  | { id: string; page_id: string; site_id: string; org_id: string; sort: number; created_at: string; type: "hero"; content: HeroContent }
  | { id: string; page_id: string; site_id: string; org_id: string; sort: number; created_at: string; type: "richtext"; content: RichTextContent }
  | { id: string; page_id: string; site_id: string; org_id: string; sort: number; created_at: string; type: "fleet"; content: FleetContent }
  | { id: string; page_id: string; site_id: string; org_id: string; sort: number; created_at: string; type: "gallery"; content: GalleryContent }
  | { id: string; page_id: string; site_id: string; org_id: string; sort: number; created_at: string; type: "features"; content: FeaturesContent }
  | { id: string; page_id: string; site_id: string; org_id: string; sort: number; created_at: string; type: "contact"; content: ContactContent }
  | { id: string; page_id: string; site_id: string; org_id: string; sort: number; created_at: string; type: "cta"; content: CtaContent };

export type BlockContent =
  | HeroContent
  | RichTextContent
  | FleetContent
  | GalleryContent
  | FeaturesContent
  | ContactContent
  | CtaContent;

// ---------------------------------------------------------------------------
// Seed-Formen: was buildSeed() in den Templates zurückgibt (vor dem Insert,
// also noch ohne DB-IDs). Page-`path` ist der Schlüssel; Blöcke hängen an der
// Seite über ihren Array-Index/sort.
// ---------------------------------------------------------------------------

export interface SeedBlock {
  type: BlockType;
  content: BlockContent;
}

export interface SeedPage {
  title: string;
  path: string; // Home = ''
  blocks: SeedBlock[];
}

export interface SiteSeed {
  pages: SeedPage[];
}

// Nur die öffentlich unbedenklichen Fahrzeugfelder. Bewusst OHNE Kosten/Margen/
// EK/Partner-Preise/interne Felder — der Renderer darf ausschließlich diese
// Felder anzeigen.
export interface PublicVehicle {
  id: string;
  vehicle_type: string | null;
  manufacturer: string | null;
  model: string | null;
  body_type: string | null;
  fuel_type: string | null;
  transmission: string | null;
  seats: number | null;
  doors: string | null;
  daily_rate: number | null; // öffentlicher Tagespreis (NICHT cost/target/base)
}

// Minimaler Org-Ausschnitt, den die Templates zum Vorbefüllen brauchen.
export interface SeedOrg {
  name: string;
  street: string | null;
  zip: string | null;
  city: string | null;
  phone: string | null;
  email: string | null;
  logo_path: string | null;
}

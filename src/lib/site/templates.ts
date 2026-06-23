// Website-Builder ("Mietseite") — die 3 wählbaren Templates.
//
// Jedes Template liefert:
//   - theme:    Akzentfarbe, Schrift-Flavor, Layout-Flavor
//   - buildSeed: Default-Seiten + Blöcke, VORBEFÜLLT aus den eigenen Org-Daten
//               (Name, Logo, Adresse, Telefon, E-Mail, Fahrzeuge).
//
// Die Templates unterscheiden sich in Theme + Block-Reihenfolge + Copy, NICHT
// in grundsätzlich anderen Daten. Der Seed wird beim Initialisieren eines
// Templates in sites/site_pages/site_blocks eingefügt.

import type {
  SeedOrg,
  SiteSeed,
  SiteTheme,
  PublicVehicle,
  SeedPage,
} from "./types";

export interface SiteTemplateDef {
  key: "modern" | "klassisch" | "bold";
  label: string;
  description: string;
  theme: SiteTheme;
  buildSeed: (org: SeedOrg, vehicles: PublicVehicle[]) => SiteSeed;
}

// Gemeinsame Bausteine, damit sich die Templates auf Theme + Reihenfolge + Copy
// konzentrieren statt Boilerplate zu duplizieren.

const contactBlock = (org: SeedOrg, title: string) => ({
  type: "contact" as const,
  content: {
    title,
    name: org.name,
    street: org.street ?? undefined,
    zip: org.zip ?? undefined,
    city: org.city ?? undefined,
    phone: org.phone ?? undefined,
    email: org.email ?? undefined,
  },
});

const fleetBlock = (title: string, subline: string, vehicles: PublicVehicle[]) => ({
  type: "fleet" as const,
  content: {
    title,
    subline,
    // Leere vehicleIds = alle aktiven Fahrzeuge serverseitig laden. Wir setzen
    // die IDs trotzdem, damit der Seed die zum Zeitpunkt vorhandene Flotte
    // abbildet (der Renderer fällt bei leerer Liste auf "alle" zurück).
    vehicleIds: vehicles.map((v) => v.id),
    limit: 12,
  },
});

const contactPage = (org: SeedOrg): SeedPage => ({
  title: "Kontakt",
  path: "kontakt",
  blocks: [contactBlock(org, "So erreichen Sie uns")],
});

const fleetPage = (vehicles: PublicVehicle[]): SeedPage => ({
  title: "Fahrzeuge",
  path: "fahrzeuge",
  blocks: [
    fleetBlock(
      "Unsere Fahrzeuge",
      "Aktuelle Auswahl aus unserer Flotte.",
      vehicles
    ),
  ],
});

export const templates: Record<string, SiteTemplateDef> = {
  // -----------------------------------------------------------------------
  // MODERN — luftig, Teal-Akzent, Display-Schrift. Hero zuerst, dann Vorteile,
  // dann Flotte, dann Kontakt, abschließend CTA.
  // -----------------------------------------------------------------------
  modern: {
    key: "modern",
    label: "Modern",
    description: "Luftig, hell, Teal-Akzent. Klare Hierarchie, viel Weißraum.",
    theme: { primary: "#0d9488", font: "display", layout: "modern" },
    buildSeed: (org, vehicles) => ({
      pages: [
        {
          title: "Start",
          path: "",
          blocks: [
            {
              type: "hero",
              content: {
                headline: org.name,
                subline:
                  "Zuverlassige Mietfahrzeuge fur jeden Anlass — fair, flexibel und personlich vor Ort.",
                ctaLabel: "Fahrzeuge ansehen",
                ctaPath: "fahrzeuge",
                showLogo: true,
              },
            },
            {
              type: "features",
              content: {
                title: "Warum bei uns mieten",
                items: [
                  { icon: "ShieldCheck", title: "Voll versichert", text: "Jedes Fahrzeug ist umfassend versichert." },
                  { icon: "Clock", title: "Flexible Laufzeiten", text: "Tagesweise, wochenweise oder langfristig." },
                  { icon: "MapPin", title: "Personlich vor Ort", text: "Ubergabe und Beratung direkt bei uns." },
                ],
              },
            },
            fleetBlock(
              "Unsere Flotte",
              "Eine Auswahl unserer aktuell verfugbaren Fahrzeuge.",
              vehicles
            ),
            contactBlock(org, "Kontakt"),
            {
              type: "cta",
              content: {
                headline: "Bereit fur die nachste Fahrt?",
                text: "Schreiben Sie uns — wir finden das passende Fahrzeug.",
                ctaLabel: "Jetzt anfragen",
                ctaPath: "kontakt",
              },
            },
          ],
        },
        fleetPage(vehicles),
        contactPage(org),
      ],
    }),
  },

  // -----------------------------------------------------------------------
  // KLASSISCH — seriös, gedecktes Blau, klassische Schrift. Begrüßungstext
  // zuerst (richtext), dann Flotte, dann Vorteile, dann Kontakt. Kein lauter
  // CTA-Abschluss — zurückhaltender Auftritt.
  // -----------------------------------------------------------------------
  klassisch: {
    key: "klassisch",
    label: "Klassisch",
    description: "Serios und ruhig, gedecktes Blau, klassische Anmutung.",
    theme: { primary: "#1d4ed8", font: "sans", layout: "klassisch" },
    buildSeed: (org, vehicles) => ({
      pages: [
        {
          title: "Start",
          path: "",
          blocks: [
            {
              type: "hero",
              content: {
                headline: org.name,
                subline:
                  "Ihre Autovermietung mit Tradition und Verlasslichkeit.",
                showLogo: true,
              },
            },
            {
              type: "richtext",
              content: {
                title: "Willkommen",
                body:
                  "Seit Jahren stehen wir fur faire Konditionen und einen verlasslichen Service.\n\nObs der kurze Stadtflitzer oder der gerumige Transporter ist — bei uns finden Sie das passende Fahrzeug. Sprechen Sie uns gerne an.",
              },
            },
            fleetBlock(
              "Unsere Fahrzeuge",
              "Solide Fahrzeuge, gepflegt und einsatzbereit.",
              vehicles
            ),
            {
              type: "features",
              content: {
                title: "Unser Versprechen",
                items: [
                  { icon: "Handshake", title: "Faire Preise", text: "Transparent und ohne versteckte Kosten." },
                  { icon: "Wrench", title: "Gepflegte Flotte", text: "Regelmaig gewartet und gereinigt." },
                  { icon: "PhoneCall", title: "Personliche Beratung", text: "Wir nehmen uns Zeit fur Sie." },
                ],
              },
            },
            contactBlock(org, "Kontakt"),
          ],
        },
        fleetPage(vehicles),
        contactPage(org),
      ],
    }),
  },

  // -----------------------------------------------------------------------
  // BOLD — kräftig, dunkler Akzent (Amber/Orange), große Display-Headline.
  // CTA gleich nach dem Hero, dann Flotte, dann Vorteile, dann Kontakt. Lauter,
  // verkaufsorientierter Aufbau.
  // -----------------------------------------------------------------------
  bold: {
    key: "bold",
    label: "Bold",
    description: "Kraftig und kontrastreich, warmer Akzent, groe Headlines.",
    theme: { primary: "#ea580c", font: "display", layout: "bold" },
    buildSeed: (org, vehicles) => ({
      pages: [
        {
          title: "Start",
          path: "",
          blocks: [
            {
              type: "hero",
              content: {
                headline: org.name,
                subline:
                  "Schnell, unkompliziert, startklar. Ihr Fahrzeug wartet.",
                ctaLabel: "Jetzt mieten",
                ctaPath: "kontakt",
                showLogo: true,
              },
            },
            {
              type: "cta",
              content: {
                headline: "In wenigen Minuten startklar",
                text: "Anfragen, abholen, losfahren — so einfach geht es bei uns.",
                ctaLabel: "Fahrzeug anfragen",
                ctaPath: "kontakt",
              },
            },
            fleetBlock(
              "Diese Fahrzeuge gibt es jetzt",
              "Frisch verfugbar — sichern Sie sich Ihren Wagen.",
              vehicles
            ),
            {
              type: "features",
              content: {
                title: "Darum wir",
                items: [
                  { icon: "Zap", title: "Sofort verfugbar", text: "Kurze Wege, schnelle Ubergabe." },
                  { icon: "BadgeEuro", title: "Top Preis-Leistung", text: "Starke Konditionen, keine Uberraschungen." },
                  { icon: "Star", title: "Beste Bewertungen", text: "Kunden kommen gerne wieder." },
                ],
              },
            },
            contactBlock(org, "Kontakt"),
          ],
        },
        fleetPage(vehicles),
        contactPage(org),
      ],
    }),
  },
};

export const templateKeys = Object.keys(templates) as Array<
  "modern" | "klassisch" | "bold"
>;

export const isTemplateKey = (
  v: unknown
): v is "modern" | "klassisch" | "bold" =>
  typeof v === "string" && v in templates;

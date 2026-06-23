import { describe, it, expect } from "vitest";
import { templates, templateKeys } from "./templates";
import type { SeedOrg, PublicVehicle } from "./types";

const org: SeedOrg = {
  name: "Müller Autovermietung",
  street: "Hauptstraße 1",
  zip: "10115",
  city: "Berlin",
  phone: "030 123456",
  email: "info@mueller-mietwagen.de",
  logo_path: "brand/abc/logo.png",
};

const vehicles: PublicVehicle[] = [
  {
    id: "v1",
    vehicle_type: "VW Golf",
    manufacturer: "VW",
    model: "Golf",
    body_type: "Limousine",
    fuel_type: "Benzin",
    transmission: "Schaltung",
    seats: 5,
    doors: "5",
    daily_rate: 39,
  },
  {
    id: "v2",
    vehicle_type: "Mercedes Sprinter",
    manufacturer: "Mercedes",
    model: "Sprinter",
    body_type: "Transporter",
    fuel_type: "Diesel",
    transmission: "Schaltung",
    seats: 3,
    doors: "4",
    daily_rate: 89,
  },
];

describe("site templates", () => {
  it("exposes exactly the three expected templates", () => {
    expect(templateKeys.sort()).toEqual(["bold", "klassisch", "modern"]);
  });

  for (const key of ["modern", "klassisch", "bold"] as const) {
    describe(`template: ${key}`, () => {
      const def = templates[key];
      const seed = def.buildSeed(org, vehicles);

      it("returns a home page (path '') with at least one block", () => {
        const home = seed.pages.find((p) => p.path === "");
        expect(home).toBeDefined();
        expect(home!.blocks.length).toBeGreaterThanOrEqual(1);
      });

      it("prefills the org name into the home hero", () => {
        const home = seed.pages.find((p) => p.path === "")!;
        const hero = home.blocks.find((b) => b.type === "hero");
        expect(hero).toBeDefined();
        expect(JSON.stringify(hero!.content)).toContain(org.name);
      });

      it("seeds a fahrzeuge and a kontakt page", () => {
        const paths = seed.pages.map((p) => p.path);
        expect(paths).toContain("fahrzeuge");
        expect(paths).toContain("kontakt");
      });

      it("references the org's vehicles in a fleet block", () => {
        const fleet = seed.pages
          .flatMap((p) => p.blocks)
          .find((b) => b.type === "fleet");
        expect(fleet).toBeDefined();
        const ids = (fleet!.content as { vehicleIds?: string[] }).vehicleIds;
        expect(ids).toEqual(["v1", "v2"]);
      });

      it("prefills contact details from the org", () => {
        const contact = seed.pages
          .flatMap((p) => p.blocks)
          .find((b) => b.type === "contact");
        expect(contact).toBeDefined();
        expect(JSON.stringify(contact!.content)).toContain(org.email!);
      });
    });
  }

  it("produces three distinct themes (color + layout)", () => {
    const primaries = templateKeys.map((k) => templates[k].theme.primary);
    expect(new Set(primaries).size).toBe(3);
    const layouts = templateKeys.map((k) => templates[k].theme.layout);
    expect(new Set(layouts).size).toBe(3);
  });
});

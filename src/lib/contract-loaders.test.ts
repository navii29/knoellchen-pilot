import { describe, it, expect } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { loadLogoBase64 } from "./contract-loaders";

// Minimaler Mock: storage.from("brand").download() liefert ein Objekt mit
// arrayBuffer(). bytes [1,2,3] → base64 "AQID". Kein Netz/Supabase nötig.
const mockAdmin = (opts: { bytes?: Uint8Array; error?: boolean } = {}): SupabaseClient =>
  ({
    storage: {
      from: () => ({
        download: async () =>
          opts.error
            ? { data: null, error: { message: "x" } }
            : {
                data: {
                  arrayBuffer: async () => (opts.bytes ?? new Uint8Array([1, 2, 3])).buffer,
                },
                error: null,
              },
      }),
    },
  }) as unknown as SupabaseClient;

describe("loadLogoBase64 — mime-Mapping", () => {
  it("PNG → image/png", async () => {
    expect(await loadLogoBase64(mockAdmin(), "org/logo.png")).toBe("data:image/png;base64,AQID");
  });

  it("JPG/JPEG → image/jpeg", async () => {
    expect(await loadLogoBase64(mockAdmin(), "org/logo.jpg")).toMatch(/^data:image\/jpeg;base64,/);
    expect(await loadLogoBase64(mockAdmin(), "org/logo.jpeg")).toMatch(/^data:image\/jpeg;base64,/);
  });

  it("SVG → image/svg+xml (NICHT mehr übersprungen)", async () => {
    const out = await loadLogoBase64(mockAdmin(), "org/logo.svg");
    expect(out).toBe("data:image/svg+xml;base64,AQID");
    expect(out).not.toBeNull();
  });

  it("Groß-/Kleinschreibung der Endung egal", async () => {
    expect(await loadLogoBase64(mockAdmin(), "ORG/LOGO.SVG")).toMatch(/^data:image\/svg\+xml;base64,/);
    expect(await loadLogoBase64(mockAdmin(), "ORG/LOGO.PNG")).toMatch(/^data:image\/png;base64,/);
  });

  it("unbekannte Endung → image/png (Verhalten unverändert)", async () => {
    expect(await loadLogoBase64(mockAdmin(), "org/logo.webp")).toMatch(/^data:image\/png;base64,/);
  });

  it("null/undefined Pfad → null", async () => {
    expect(await loadLogoBase64(mockAdmin(), null)).toBeNull();
    expect(await loadLogoBase64(mockAdmin(), undefined)).toBeNull();
  });

  it("Download-Fehler → null", async () => {
    expect(await loadLogoBase64(mockAdmin({ error: true }), "org/logo.png")).toBeNull();
  });
});

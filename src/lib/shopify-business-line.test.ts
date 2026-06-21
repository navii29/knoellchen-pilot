import { describe, it, expect } from "vitest";
import { deriveBusinessLine, type ShopifyProduct } from "./shopify";
import { CATEGORIES } from "./vehicle";

const p = (o: Partial<ShopifyProduct>): ShopifyProduct => ({ id: 1, ...o });

describe("deriveBusinessLine", () => {
  it("erkennt Sportwagen aus product_type", () => {
    expect(deriveBusinessLine(p({ product_type: "Sportwagen" }), false)).toBe("Sportwagen");
  });

  it("erkennt Auto-Abo aus Tags (Array)", () => {
    expect(deriveBusinessLine(p({ tags: ["Auto-Abo", "neu"] }), false)).toBe("Auto-Abo");
  });

  it("erkennt Auto-Abo aus Tags (komma-String)", () => {
    expect(deriveBusinessLine(p({ tags: "premium, abo" }), false)).toBe("Auto-Abo");
  });

  it("erkennt Langzeitmiete aus dem Titel", () => {
    expect(deriveBusinessLine(p({ title: "Langzeitmiete VW Passat" }), false)).toBe(
      "Langzeitmiete"
    );
  });

  it("erkennt Tagesmiete", () => {
    expect(deriveBusinessLine(p({ product_type: "Tagesmiete" }), false)).toBe("Tagesmiete");
  });

  it("erkennt Fuhrpark", () => {
    expect(deriveBusinessLine(p({ tags: "fuhrpark" }), false)).toBe("Fuhrpark");
  });

  it("Abo-Modell ohne Kennzeichen (Platzhalter) → Auto-Abo als Default", () => {
    expect(deriveBusinessLine(p({ title: "Irgendein Modell" }), true)).toBe("Auto-Abo");
  });

  it("normales Produkt ohne Hinweise → null (Nutzer setzt selbst)", () => {
    expect(deriveBusinessLine(p({ title: "VW Golf", product_type: "" }), false)).toBeNull();
  });

  it("liefert immer einen gültigen Geschäftslinien-Wert oder null (Fuzz)", () => {
    const words = ["", "sportwagen", "abo", "tagesmiete", "langzeit", "fuhrpark", "golf", "x"];
    for (let i = 0; i < 1000; i++) {
      const pick = () => words[Math.floor(Math.random() * words.length)];
      const res = deriveBusinessLine(
        p({ product_type: pick(), tags: `${pick()} ${pick()}`, title: pick() }),
        Math.random() < 0.5
      );
      expect(res === null || CATEGORIES.includes(res)).toBe(true);
    }
  });
});

import { describe, it, expect } from "vitest";
import { normalizeHexColor } from "./brand-color";

describe("normalizeHexColor", () => {
  it("gültiges #rrggbb → kleingeschrieben", () => {
    expect(normalizeHexColor("#0d9488")).toBe("#0d9488");
    expect(normalizeHexColor("#0D9488")).toBe("#0d9488");
    expect(normalizeHexColor("  #ABCDEF  ")).toBe("#abcdef");
  });

  it("gültiges #rgb → erlaubt (kleingeschrieben)", () => {
    expect(normalizeHexColor("#abc")).toBe("#abc");
    expect(normalizeHexColor("#ABC")).toBe("#abc");
  });

  it("ohne # / falsche Länge / Farbname → null", () => {
    expect(normalizeHexColor("0d9488")).toBeNull();
    expect(normalizeHexColor("#12345")).toBeNull();
    expect(normalizeHexColor("#1234567")).toBeNull();
    expect(normalizeHexColor("red")).toBeNull();
  });

  it("Nicht-Hex-Zeichen / Injection → null", () => {
    expect(normalizeHexColor("#0d9488; }")).toBeNull();
    expect(normalizeHexColor("#zzzzzz")).toBeNull();
    expect(normalizeHexColor("#0d94 88")).toBeNull();
  });

  it("leer / null / Nicht-String → null", () => {
    expect(normalizeHexColor("")).toBeNull();
    expect(normalizeHexColor("   ")).toBeNull();
    expect(normalizeHexColor(null)).toBeNull();
    expect(normalizeHexColor(undefined)).toBeNull();
    expect(normalizeHexColor(123)).toBeNull();
  });
});

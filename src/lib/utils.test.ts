import { describe, it, expect } from "vitest";
import { hasInk, isPngDataUrl } from "./utils";

describe("hasInk", () => {
  const pngOf = (bytes: number) => "data:image/png;base64," + Buffer.alloc(bytes).toString("base64");

  it("genügend Daten (>1024 dekodierte Bytes) → true", () => {
    expect(hasInk(pngOf(2000))).toBe(true);
  });

  it("zu wenig Daten (≤1024) → false (leere Canvas)", () => {
    expect(hasInk(pngOf(500))).toBe(false);
  });

  it("Grenze: exakt 1024 → false, 1025 → true", () => {
    expect(hasInk(pngOf(1024))).toBe(false);
    expect(hasInk(pngOf(1025))).toBe(true);
  });
});

describe("isPngDataUrl", () => {
  it("akzeptiert PNG-Data-URL", () => {
    expect(isPngDataUrl("data:image/png;base64,AQID")).toBe(true);
  });
  it("lehnt Nicht-PNG / Breakout ab", () => {
    expect(isPngDataUrl("data:image/jpeg;base64,AQID")).toBe(false);
    expect(isPngDataUrl('data:image/png;base64,AA"><img')).toBe(false);
    expect(isPngDataUrl(null)).toBe(false);
  });
});

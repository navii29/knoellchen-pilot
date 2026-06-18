import { describe, it, expect } from "vitest";
import { normalizePlate, platesEqual } from "./plate";

describe("normalizePlate", () => {
  // Regression: 2-stellige Erkennungsbuchstaben wurden falsch getrennt
  // ("M-QA 1234" -> "MQ-A1234"). Fix vom 15.06.2026.
  it.each([
    ["M-QA 1234", "M-QA1234"],
    ["M-C 3116", "M-C3116"],
    ["M-KP2847", "M-KP2847"],
    ["HH-AB 1234", "HH-AB1234"],
    ["B-XY 99", "B-XY99"],
    ["K-PD 777E", "K-PD777E"],
    ["M QA 1234", "M-QA1234"],
    ["m - c 3116", "M-C3116"],
    ["M-KP-2847", "M-KP2847"],
    ["  m-kp 2847 ", "M-KP2847"],
    ["MQA1234", "M-QA1234"],
    ["HHAB1234", "HH-AB1234"],
    ["BORAB123", "BOR-AB123"],
  ])("normalisiert %s -> %s", (input, expected) => {
    expect(normalizePlate(input)).toBe(expected);
  });

  it("liefert leeren String für leere Eingaben", () => {
    expect(normalizePlate("")).toBe("");
    expect(normalizePlate(null)).toBe("");
    expect(normalizePlate(undefined)).toBe("");
  });
});

describe("platesEqual", () => {
  it("matcht verschiedene Schreibweisen desselben Kennzeichens", () => {
    expect(platesEqual("M-QA 1234", "m qa 1234")).toBe(true);
    expect(platesEqual("M-KP2847", "M KP 2847")).toBe(true);
    expect(platesEqual("HH-AB 1234", "hh-ab-1234")).toBe(true);
  });

  it("matcht unterschiedliche Kennzeichen nicht", () => {
    expect(platesEqual("M-QA 1234", "M-QA 1235")).toBe(false);
    expect(platesEqual("", "")).toBe(false); // leere matchen nie
  });
});

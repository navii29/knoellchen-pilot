import { describe, it, expect } from "vitest";
import { normalizeValue } from "./csv-import";

describe("normalizeValue — Zahlen (Dezimal/Tausender-Heuristik)", () => {
  const n = (raw: string) => normalizeValue("daily_rate", raw);

  it("Punkt-Dezimal bleibt erhalten (vorher 0.35 -> 35)", () => {
    expect(n("0.35")).toBe(0.35);
    expect(n("0.5")).toBe(0.5);
    expect(n("49.9")).toBe(49.9);
    expect(n("1234.5")).toBe(1234.5);
  });

  it("Komma-Dezimal (deutsch)", () => {
    expect(n("0,5")).toBe(0.5);
    expect(n("25,00")).toBe(25);
    expect(n("1234,56")).toBe(1234.56);
  });

  it("gemischte Tausender + Dezimal", () => {
    expect(n("1.234,56")).toBe(1234.56); // de
    expect(n("1,234.56")).toBe(1234.56); // en
    expect(n("1.234.567")).toBe(1234567);
  });

  it("Punkt als Tausender (3 Nachkommastellen, deutsch)", () => {
    expect(n("1.234")).toBe(1234);
    expect(n("2.000")).toBe(2000);
  });

  it("führende Null => Dezimalpunkt, nie Tausender (vorher 0.350 -> 350)", () => {
    expect(n("0.350")).toBe(0.35);
    expect(n("0.500")).toBe(0.5);
  });

  it("Währungssymbole/Leerzeichen werden ignoriert", () => {
    expect(n("25,00 €")).toBe(25);
    expect(n("€ 1.299,00")).toBe(1299);
  });

  it("negative Werte", () => {
    expect(n("-25")).toBe(-25);
    expect(n("-0,5")).toBe(-0.5);
  });

  it("leer -> null", () => {
    expect(n("")).toBeNull();
    expect(n("  ")).toBeNull();
  });
});

describe("normalizeValue — Datum (Kalender-Validierung)", () => {
  const d = (raw: string) => normalizeValue("first_registration", raw);

  it("gültige Daten werden ins ISO-Format gebracht", () => {
    expect(d("15.03.2023")).toBe("2023-03-15");
    expect(d("2023-03-15")).toBe("2023-03-15");
    expect(d("01/04/2024")).toBe("2024-04-01");
  });

  it("unmögliche Daten -> null statt Batch-Crash", () => {
    expect(d("31.02.2020")).toBeNull();
    expect(d("2020-02-31")).toBeNull();
    expect(d("32.13.2020")).toBeNull();
  });
});

describe("normalizeValue — Vertrags-Felder (Schlüssel-Sets)", () => {
  it("Vertrags-Datumsfelder werden als Datum normalisiert", () => {
    expect(normalizeValue("pickup_date", "15.03.2023")).toBe("2023-03-15");
    expect(normalizeValue("return_date", "20.03.2023")).toBe("2023-03-20");
    expect(normalizeValue("renter_license_expiry", "01.01.2030")).toBe("2030-01-01");
  });

  it("Gesamtbetrag als Zahl, Km als Ganzzahl", () => {
    expect(normalizeValue("total_amount", "1.299,90")).toBe(1299.9);
    expect(normalizeValue("km_pickup", "12.345")).toBe(12345);
    expect(normalizeValue("km_return", "13.020")).toBe(13020);
    expect(normalizeValue("km_limit", "2000")).toBe(2000);
  });
});

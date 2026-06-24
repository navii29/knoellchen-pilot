import { describe, it, expect } from "vitest";
import { vehicleMatchesSearch, buildVehicleType } from "./vehicle";

// Reales Beispiel aus dem gemeldeten Bug: Kennzeichen wird kanonisch OHNE
// Leerzeichen gespeichert, manufacturer/model/vehicle_type sind befüllt.
const peugeot = {
  plate: "M-S8271",
  manufacturer: "Peugeot",
  model: "2008",
  vehicle_type: "Peugeot 2008",
  color: "Schwarz",
  body_type: "SUV",
  category: null,
  fin_number: "VF3XXXXXXXXXXXXXX",
};

describe("vehicleMatchesSearch — Kennzeichen-Normalisierung (Bug-Regression)", () => {
  it("findet das Kennzeichen MIT Leerzeichen, obwohl es OHNE gespeichert ist", () => {
    // Das war der Bug: Eingabe "M-S 8271" fand das gespeicherte "M-S8271" nie.
    expect(vehicleMatchesSearch(peugeot, "M-S 8271")).toBe(true);
  });

  it("findet das Kennzeichen exakt (ohne Leerzeichen)", () => {
    expect(vehicleMatchesSearch(peugeot, "M-S8271")).toBe(true);
  });

  it("findet über ein Teil-Kennzeichen (Stadtcode)", () => {
    expect(vehicleMatchesSearch(peugeot, "M-S")).toBe(true);
  });

  it("findet über ein Teil-Kennzeichen MIT Leerzeichen", () => {
    expect(vehicleMatchesSearch(peugeot, "M-S 82")).toBe(true);
  });

  it("ist gegenüber Groß-/Kleinschreibung tolerant", () => {
    expect(vehicleMatchesSearch(peugeot, "m-s 8271")).toBe(true);
  });

  it("matcht ein FREMDES Kennzeichen NICHT", () => {
    expect(vehicleMatchesSearch(peugeot, "B-AB 1234")).toBe(false);
  });
});

describe("vehicleMatchesSearch — Hersteller/Text", () => {
  it("findet über den Hersteller (peugeot)", () => {
    expect(vehicleMatchesSearch(peugeot, "peugeot")).toBe(true);
  });

  it("findet über das Modell", () => {
    expect(vehicleMatchesSearch(peugeot, "2008")).toBe(true);
  });

  it("findet über Hersteller + Modell zusammen", () => {
    expect(vehicleMatchesSearch(peugeot, "Peugeot 2008")).toBe(true);
  });

  it("matcht einen fremden Hersteller NICHT", () => {
    expect(vehicleMatchesSearch(peugeot, "BMW")).toBe(false);
  });

  it("fällt auf vehicle_type zurück, wenn manufacturer/model fehlen", () => {
    const onlyType = { plate: "M-X1", vehicle_type: "VW Golf" };
    expect(vehicleMatchesSearch(onlyType, "golf")).toBe(true);
  });

  it("findet über Farbe und FIN", () => {
    expect(vehicleMatchesSearch(peugeot, "schwarz")).toBe(true);
    expect(vehicleMatchesSearch(peugeot, "VF3X")).toBe(true);
  });

  it("leere Eingabe matcht alles", () => {
    expect(vehicleMatchesSearch(peugeot, "")).toBe(true);
    expect(vehicleMatchesSearch(peugeot, "   ")).toBe(true);
  });
});

describe("buildVehicleType", () => {
  it("kombiniert Hersteller + Modell", () => {
    expect(buildVehicleType("Peugeot", "2008")).toBe("Peugeot 2008");
  });
  it("gibt null zurück, wenn beide leer", () => {
    expect(buildVehicleType(null, null)).toBeNull();
  });
});

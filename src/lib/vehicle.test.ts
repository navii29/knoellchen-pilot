import { describe, it, expect } from "vitest";
import { vehicleMatchesSearch, buildVehicleType, buildVehicleBackfillFromContracts } from "./vehicle";

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

describe("buildVehicleBackfillFromContracts", () => {
  const emptyVehicle = {
    manufacturer: null,
    model: null,
    vehicle_type: null,
    daily_rate: null,
    deposit: null,
  };

  it("füllt vehicle_type/Tagesmiete/Kaution aus dem jüngsten Vertrag + leitet Hersteller/Modell ab", () => {
    const contracts = [
      { pickup_date: "2025-06-01", vehicle_type: "Peugeot 2008", daily_rate: 55, deposit: 300 },
      { pickup_date: "2025-01-01", vehicle_type: "Peugeot 208", daily_rate: 40, deposit: 200 },
    ];
    const patch = buildVehicleBackfillFromContracts(emptyVehicle, contracts);
    expect(patch).toEqual({
      vehicle_type: "Peugeot 2008",
      daily_rate: 55,
      deposit: 300,
      manufacturer: "Peugeot",
      model: "2008",
    });
  });

  it("nimmt pro Feld den jüngsten Vertrag mit Wert (newest-wins)", () => {
    const contracts = [
      { pickup_date: "2025-06-01", vehicle_type: null, daily_rate: 60, deposit: null },
      { pickup_date: "2025-01-01", vehicle_type: "Fiat 500", daily_rate: null, deposit: 150 },
    ];
    const patch = buildVehicleBackfillFromContracts(emptyVehicle, contracts);
    expect(patch).toEqual({
      vehicle_type: "Fiat 500",
      daily_rate: 60,
      deposit: 150,
      manufacturer: "Fiat",
      model: "500",
    });
  });

  it("überschreibt bereits gesetzte Fahrzeug-Werte NICHT", () => {
    const vehicleWithRate = {
      manufacturer: "Audi",
      model: null,
      vehicle_type: null,
      daily_rate: 80,
      deposit: null,
    };
    const contracts = [
      { pickup_date: "2025-06-01", vehicle_type: "BMW 3er", daily_rate: 50, deposit: 300 },
    ];
    const patch = buildVehicleBackfillFromContracts(vehicleWithRate, contracts);
    expect(patch.daily_rate).toBeUndefined(); // war schon gesetzt
    expect(patch.manufacturer).toBeUndefined(); // Audi bleibt
    expect(patch.vehicle_type).toBe("BMW 3er");
    expect(patch.model).toBe("3er"); // model war leer → abgeleitet
    expect(patch.deposit).toBe(300);
  });

  it("leitet Hersteller/Modell auch aus einem BEREITS gesetzten vehicle_type ab (ohne Verträge)", () => {
    const v = {
      manufacturer: null,
      model: null,
      vehicle_type: "Toyota Yaris",
      daily_rate: 30,
      deposit: 50,
    };
    const patch = buildVehicleBackfillFromContracts(v, []);
    expect(patch).toEqual({ manufacturer: "Toyota", model: "Yaris" });
  });

  it("leitet Hersteller-Alias 'VW' zu 'Volkswagen' ab (Bug-Regression)", () => {
    const v = {
      manufacturer: null,
      model: null,
      vehicle_type: "VW Golf VIII",
      daily_rate: 30,
      deposit: 50,
    };
    const patch = buildVehicleBackfillFromContracts(v, []);
    expect(patch).toEqual({ manufacturer: "Volkswagen", model: "Golf VIII" });
  });

  it("leitet Hersteller-Alias 'Mercedes' zu 'Mercedes-Benz' ab", () => {
    const v = {
      manufacturer: null,
      model: null,
      vehicle_type: "Mercedes C 200",
      daily_rate: 30,
      deposit: 50,
    };
    const patch = buildVehicleBackfillFromContracts(v, []);
    expect(patch).toEqual({ manufacturer: "Mercedes-Benz", model: "C 200" });
  });

  it("leitet nichts ab, wenn der vehicle_type keinen bekannten Hersteller enthält", () => {
    const contracts = [
      { pickup_date: "2025-06-01", vehicle_type: "Foobar X1", daily_rate: 20, deposit: 100 },
    ];
    const patch = buildVehicleBackfillFromContracts(emptyVehicle, contracts);
    expect(patch.vehicle_type).toBe("Foobar X1");
    expect(patch.manufacturer).toBeUndefined();
    expect(patch.model).toBeUndefined();
  });

  it("gibt {} zurück, wenn keine Verträge und vehicle_type leer", () => {
    expect(buildVehicleBackfillFromContracts(emptyVehicle, [])).toEqual({});
  });

  it("gibt {} zurück, wenn alle Felder schon gesetzt sind", () => {
    const fullVehicle = {
      manufacturer: "Toyota",
      model: "Yaris",
      vehicle_type: "Toyota Yaris",
      daily_rate: 40,
      deposit: 100,
    };
    const contracts = [
      { pickup_date: "2025-06-01", vehicle_type: "BMW X5", daily_rate: 100, deposit: 500 },
    ];
    expect(buildVehicleBackfillFromContracts(fullVehicle, contracts)).toEqual({});
  });

  it("ignoriert Zahlenwerte <= 0", () => {
    const contracts = [
      { pickup_date: "2025-06-01", vehicle_type: "Fiat 500", daily_rate: 0, deposit: -1 },
      { pickup_date: "2025-01-01", vehicle_type: null, daily_rate: 30, deposit: 100 },
    ];
    const patch = buildVehicleBackfillFromContracts(emptyVehicle, contracts);
    expect(patch.daily_rate).toBe(30);
    expect(patch.deposit).toBe(100);
  });
});

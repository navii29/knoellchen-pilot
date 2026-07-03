import { describe, it, expect } from "vitest";
import { computeVehicleMargin } from "./margin";
import type { Contract } from "./types";

// Regressionstest zum Abrechnungsmodell: Wochen-/Monatsverträge tragen KEINEN
// daily_rate mehr — der Umsatz muss trotzdem über den effektiven Tagessatz
// (Monat ÷ 29, Woche ÷ 7) gezählt werden, nicht als 0 €.

const vehicle = {
  id: "veh-1",
  plate: "M-XX1234",
  manufacturer: "VW",
  model: "Golf",
  vehicle_type: "VW Golf",
  cost_daily: 20,
  cost_monthly: null,
  target_daily_rate: 60,
  daily_rate: null,
  weekly_rate: null,
  monthly_rate: null,
  onetime_cost_supplier: null,
  onetime_cost_pickup: null,
  onetime_cost_return: null,
  first_registration: null,
  decommission_date: null,
} as unknown as Parameters<typeof computeVehicleMargin>[0]["vehicle"];

const mkContract = (over: Partial<Contract>): Contract =>
  ({
    id: "c-1",
    plate: "M-XX1234",
    vehicle_id: "veh-1",
    pickup_date: "2026-07-01",
    return_date: "2026-07-30", // 30 Tage im Fenster
    actual_return_date: null,
    daily_rate: null,
    weekly_rate: null,
    monthly_rate: null,
    status: "aktiv",
    ...over,
  }) as unknown as Contract;

const period = { from: "2026-07-01", to: "2026-07-30" };

describe("computeVehicleMargin — Umsatz mit Abrechnungsmodell", () => {
  it("Monatsvertrag (monthly 1450, daily null): Umsatz = Tage × 1450/29, NICHT 0", () => {
    const m = computeVehicleMargin({
      vehicle,
      contracts: [mkContract({ monthly_rate: 1450 })],
      ...period,
    });
    expect(m.rented_days).toBe(30);
    // 30 × round-free 50 = 1500
    expect(m.ist_vk_total).toBe(1500);
    expect(m.ist_vk_total).not.toBe(0);
  });

  it("Wochenvertrag (weekly 490, daily null): Umsatz = Tage × 490/7 = 70", () => {
    const m = computeVehicleMargin({
      vehicle,
      contracts: [mkContract({ weekly_rate: 490 })],
      ...period,
    });
    expect(m.ist_vk_total).toBe(2100); // 30 × 70
  });

  it("klassischer Tagesvertrag (daily 60) unverändert", () => {
    const m = computeVehicleMargin({
      vehicle,
      contracts: [mkContract({ daily_rate: 60 })],
      ...period,
    });
    expect(m.ist_vk_total).toBe(1800); // 30 × 60
  });

  it("stornierter Vertrag zählt nicht", () => {
    const m = computeVehicleMargin({
      vehicle,
      contracts: [mkContract({ monthly_rate: 1450, status: "storniert" })],
      ...period,
    });
    expect(m.ist_vk_total).toBe(0);
    expect(m.rented_days).toBe(0);
  });
});

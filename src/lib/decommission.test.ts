import { describe, it, expect } from "vitest";
import { computeDecommission, isDecommissionAlertWindow } from "./decommission";

// Lokales Datum N Tage von heute, als YYYY-MM-DD.
const isoInDays = (n: number): string => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + n);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;
};

describe("computeDecommission", () => {
  it("ohne Datum → ok / 'Keine Aussteuerung gesetzt'", () => {
    const r = computeDecommission({ decommission_date: null });
    expect(r.level).toBe("ok");
    expect(r.daysLeft).toBeNull();
  });

  it("heute → due (0 Tage)", () => {
    const r = computeDecommission({ decommission_date: isoInDays(0) });
    expect(r.level).toBe("due");
    expect(r.daysLeft).toBe(0);
  });

  it("überfällig → due, negative Tage", () => {
    const r = computeDecommission({ decommission_date: isoInDays(-5) });
    expect(r.level).toBe("due");
    expect(r.daysLeft).toBeLessThan(0);
  });

  it("in 3 Tagen → urgent", () => {
    expect(computeDecommission({ decommission_date: isoInDays(3) }).level).toBe("urgent");
  });

  it("in 14 Tagen → warn", () => {
    expect(computeDecommission({ decommission_date: isoInDays(14) }).level).toBe("warn");
  });

  it("in 40 Tagen → ok", () => {
    expect(computeDecommission({ decommission_date: isoInDays(40) }).level).toBe("ok");
  });
});

describe("isDecommissionAlertWindow", () => {
  it("innerhalb 21 Tagen → true", () => {
    expect(isDecommissionAlertWindow({ decommission_date: isoInDays(10) }, 21)).toBe(true);
  });
  it("weit weg → false", () => {
    expect(isDecommissionAlertWindow({ decommission_date: isoInDays(40) }, 21)).toBe(false);
  });
  it("ohne Datum → false", () => {
    expect(isDecommissionAlertWindow({ decommission_date: null }, 21)).toBe(false);
  });
});

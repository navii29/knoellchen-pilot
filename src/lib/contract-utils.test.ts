import { describe, it, expect } from "vitest";
import { isContractOverdue, localTodayIso } from "./contract-utils";

const TODAY = "2026-06-21";

describe("isContractOverdue", () => {
  it("aktiv, nicht zurückgegeben, Rückgabe in der Vergangenheit → überfällig", () => {
    expect(
      isContractOverdue(
        { status: "aktiv", return_date: "2026-06-10", actual_return_date: null },
        TODAY
      )
    ).toBe(true);
  });

  it("Rückgabe in der Zukunft → nicht überfällig", () => {
    expect(
      isContractOverdue(
        { status: "aktiv", return_date: "2026-06-30", actual_return_date: null },
        TODAY
      )
    ).toBe(false);
  });

  it("bereits zurückgegeben → nicht überfällig", () => {
    expect(
      isContractOverdue(
        { status: "aktiv", return_date: "2026-06-10", actual_return_date: "2026-06-09" },
        TODAY
      )
    ).toBe(false);
  });

  it("abgeschlossen → nie überfällig", () => {
    expect(
      isContractOverdue(
        { status: "abgeschlossen", return_date: "2026-06-10", actual_return_date: null },
        TODAY
      )
    ).toBe(false);
  });

  it("storniert → nie überfällig", () => {
    expect(
      isContractOverdue(
        { status: "storniert", return_date: "2026-06-01", actual_return_date: null },
        TODAY
      )
    ).toBe(false);
  });

  it("Rückgabe = heute → nicht überfällig (erst ab Folgetag)", () => {
    expect(
      isContractOverdue(
        { status: "aktiv", return_date: TODAY, actual_return_date: null },
        TODAY
      )
    ).toBe(false);
  });
});

describe("localTodayIso", () => {
  it("liefert YYYY-MM-DD", () => {
    expect(localTodayIso()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

import { describe, it, expect } from "vitest";
import { buildExtensionNotification } from "./extension-notify";
import { fmtDate } from "./utils";

describe("buildExtensionNotification", () => {
  const base = {
    customerId: "cust-1",
    orgId: "org-1",
    contractId: "contract-9",
    requestedReturnDate: "2026-08-01",
  };

  it("approve: bestätigt-Notification mit Typ, Titel, Link und Datum im Body", () => {
    const n = buildExtensionNotification({ action: "approve", ...base });
    expect(n).not.toBeNull();
    expect(n!.type).toBe("extension");
    expect(n!.title).toBe("Verlängerung bestätigt");
    expect(n!.customer_id).toBe("cust-1");
    expect(n!.org_id).toBe("org-1");
    expect(n!.link).toBe("/portal/contracts/contract-9");
    expect(n!.body).toContain(fmtDate("2026-08-01"));
  });

  it("decline: abgelehnt-Notification (Titel + Datum im Body)", () => {
    const n = buildExtensionNotification({ action: "decline", ...base });
    expect(n!.title).toBe("Verlängerung abgelehnt");
    expect(n!.type).toBe("extension");
    expect(n!.link).toBe("/portal/contracts/contract-9");
    expect(n!.body).toContain(fmtDate("2026-08-01"));
  });

  it("customer_id null → null (kein Empfänger, notify wird übersprungen)", () => {
    expect(buildExtensionNotification({ action: "approve", ...base, customerId: null })).toBeNull();
    expect(
      buildExtensionNotification({ action: "decline", ...base, customerId: undefined })
    ).toBeNull();
  });
});

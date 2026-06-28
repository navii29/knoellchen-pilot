import { describe, it, expect } from "vitest";
import { buildOperatorExtensionNotification } from "./operator-notify";

describe("buildOperatorExtensionNotification", () => {
  it("baut ein vollständiges Payload (type/title/link/org_id/Bezug)", () => {
    const p = buildOperatorExtensionNotification({
      orgId: "org-1",
      contractId: "c-9",
      extensionId: "ext-3",
    });
    expect(p.org_id).toBe("org-1");
    expect(p.type).toBe("extension_request");
    expect(p.title).toBe("Neue Verlängerungs-Anfrage");
    expect(p.link).toBe("/dashboard/contracts/c-9");
    expect(p.contract_id).toBe("c-9");
    expect(p.extension_id).toBe("ext-3");
    // Body ist statisch — kein PII.
    expect(p.body).not.toMatch(/null|undefined/);
  });

  it("wirft, wenn org_id fehlt — Zeile wird gar nicht erst gebaut", () => {
    expect(() =>
      buildOperatorExtensionNotification({ orgId: "", contractId: "c-9", extensionId: "ext-3" })
    ).toThrow();
  });

  it("erlaubt extension_id = null (nullable Bezug)", () => {
    const p = buildOperatorExtensionNotification({
      orgId: "org-1",
      contractId: "c-9",
      extensionId: null,
    });
    expect(p.extension_id).toBeNull();
    expect(p.contract_id).toBe("c-9");
  });
});

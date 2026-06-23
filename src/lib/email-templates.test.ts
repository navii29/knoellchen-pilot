import { describe, it, expect } from "vitest";
import {
  EMAIL_TEMPLATE_CATALOG,
  DEFAULT_EMAIL_TEMPLATES,
  resolveTemplate,
  isEmailTemplateKey,
  type EmailTemplateKey,
} from "./email-templates";
import {
  DEFAULT_CONTRACT_EMAIL_SUBJECT,
  DEFAULT_CONTRACT_EMAIL_BODY,
} from "./email";

const ALL_KEYS: EmailTemplateKey[] = [
  "contract",
  "checkin_invite",
  "invoice",
  "payment_reminder",
  "return_reminder",
  "deposit_release",
  "general",
];

// ---------------------------------------------------------------------------
// Katalog — vollständig, eindeutig, deutsch
// ---------------------------------------------------------------------------
describe("EMAIL_TEMPLATE_CATALOG", () => {
  it("enthält genau die sieben erwarteten Schlüssel", () => {
    expect(EMAIL_TEMPLATE_CATALOG.map((e) => e.key).sort()).toEqual(
      [...ALL_KEYS].sort()
    );
  });

  it("hat eindeutige Schlüssel", () => {
    const keys = EMAIL_TEMPLATE_CATALOG.map((e) => e.key);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("hat für jeden Eintrag Label und Beschreibung", () => {
    for (const e of EMAIL_TEMPLATE_CATALOG) {
      expect(e.label.length).toBeGreaterThan(0);
      expect(e.description.length).toBeGreaterThan(0);
    }
  });

  it("hängt nur bei Vertrag und Rechnung ein PDF an", () => {
    const attaches = EMAIL_TEMPLATE_CATALOG.filter((e) => e.attachesPdf).map(
      (e) => e.key
    );
    expect(attaches.sort()).toEqual(["contract", "invoice"].sort());
  });
});

// ---------------------------------------------------------------------------
// Defaults — vollständig pro Katalog-Schlüssel
// ---------------------------------------------------------------------------
describe("DEFAULT_EMAIL_TEMPLATES", () => {
  it("hat einen Default für jeden Katalog-Schlüssel", () => {
    for (const { key } of EMAIL_TEMPLATE_CATALOG) {
      expect(DEFAULT_EMAIL_TEMPLATES[key]).toBeDefined();
      expect(typeof DEFAULT_EMAIL_TEMPLATES[key].subject).toBe("string");
      expect(typeof DEFAULT_EMAIL_TEMPLATES[key].body).toBe("string");
    }
  });

  it("contract-Default ist DRY identisch zu DEFAULT_CONTRACT_*", () => {
    expect(DEFAULT_EMAIL_TEMPLATES.contract.subject).toBe(
      DEFAULT_CONTRACT_EMAIL_SUBJECT
    );
    expect(DEFAULT_EMAIL_TEMPLATES.contract.body).toBe(
      DEFAULT_CONTRACT_EMAIL_BODY
    );
  });

  it("checkin_invite enthält den {{checkin_link}}-Platzhalter", () => {
    expect(DEFAULT_EMAIL_TEMPLATES.checkin_invite.body).toContain(
      "{{checkin_link}}"
    );
  });

  it("payment_reminder verwendet {{betrag}}", () => {
    expect(DEFAULT_EMAIL_TEMPLATES.payment_reminder.body).toContain("{{betrag}}");
  });

  it("return_reminder verwendet {{rueckgabedatum}}", () => {
    expect(DEFAULT_EMAIL_TEMPLATES.return_reminder.body).toContain(
      "{{rueckgabedatum}}"
    );
  });

  it("deposit_release verwendet {{kaution}}", () => {
    expect(DEFAULT_EMAIL_TEMPLATES.deposit_release.body).toContain("{{kaution}}");
  });

  it("general hat einen Betreff, aber einen (fast) leeren Body zum Ausfüllen", () => {
    expect(DEFAULT_EMAIL_TEMPLATES.general.subject.length).toBeGreaterThan(0);
    // bewusst knapp/leer, damit der Betreiber frei formuliert
    expect(DEFAULT_EMAIL_TEMPLATES.general.body.trim().length).toBeLessThan(160);
  });
});

// ---------------------------------------------------------------------------
// resolveTemplate — pur: Override wo gesetzt, sonst Default
// ---------------------------------------------------------------------------
describe("resolveTemplate", () => {
  it("liefert den Default, wenn Override null ist", () => {
    expect(resolveTemplate(null, "invoice")).toEqual(
      DEFAULT_EMAIL_TEMPLATES.invoice
    );
  });

  it("liefert den Default, wenn Override-Felder leer/whitespace sind", () => {
    expect(
      resolveTemplate({ subject: "", body: "   " }, "payment_reminder")
    ).toEqual(DEFAULT_EMAIL_TEMPLATES.payment_reminder);
  });

  it("liefert den Default, wenn Override-Felder null sind", () => {
    expect(
      resolveTemplate({ subject: null, body: null }, "return_reminder")
    ).toEqual(DEFAULT_EMAIL_TEMPLATES.return_reminder);
  });

  it("nutzt gesetzte Override-Felder", () => {
    const out = resolveTemplate(
      { subject: "Mein Betreff", body: "Mein Text {{mieter}}" },
      "general"
    );
    expect(out.subject).toBe("Mein Betreff");
    expect(out.body).toBe("Mein Text {{mieter}}");
  });

  it("mischt: Override-Betreff + Default-Body", () => {
    const out = resolveTemplate({ subject: "Nur Betreff", body: null }, "contract");
    expect(out.subject).toBe("Nur Betreff");
    expect(out.body).toBe(DEFAULT_EMAIL_TEMPLATES.contract.body);
  });

  it("ist rein — verändert das Override-Objekt nicht", () => {
    const ov = { subject: "X", body: "Y" };
    resolveTemplate(ov, "general");
    expect(ov).toEqual({ subject: "X", body: "Y" });
  });
});

// ---------------------------------------------------------------------------
// isEmailTemplateKey — Whitelist-Guard
// ---------------------------------------------------------------------------
describe("isEmailTemplateKey", () => {
  it("akzeptiert jeden Katalog-Schlüssel", () => {
    for (const k of ALL_KEYS) expect(isEmailTemplateKey(k)).toBe(true);
  });

  it("lehnt Unbekanntes ab", () => {
    expect(isEmailTemplateKey("nope")).toBe(false);
    expect(isEmailTemplateKey("")).toBe(false);
    expect(isEmailTemplateKey(null)).toBe(false);
    expect(isEmailTemplateKey(123)).toBe(false);
  });
});

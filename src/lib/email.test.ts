import { describe, it, expect } from "vitest";
import {
  renderTemplate,
  createSendingDomain,
  DEFAULT_CONTRACT_EMAIL_SUBJECT,
  DEFAULT_CONTRACT_EMAIL_BODY,
} from "./email";

// ---------------------------------------------------------------------------
// renderTemplate — pur, ersetzt {{key}}-Platzhalter, Unbekanntes → leer
// ---------------------------------------------------------------------------
describe("renderTemplate", () => {
  it("ersetzt einen einfachen Platzhalter", () => {
    expect(renderTemplate("Hallo {{name}}", { name: "Anna" })).toBe("Hallo Anna");
  });

  it("ersetzt mehrere Platzhalter", () => {
    const out = renderTemplate("{{a}} und {{b}}", { a: "X", b: "Y" });
    expect(out).toBe("X und Y");
  });

  it("ersetzt jedes Vorkommen desselben Platzhalters", () => {
    const out = renderTemplate("{{x}}-{{x}}-{{x}}", { x: "1" });
    expect(out).toBe("1-1-1");
  });

  it("lässt unbekannte Platzhalter leer (nicht stehen)", () => {
    expect(renderTemplate("Hallo {{fehlt}}!", {})).toBe("Hallo !");
  });

  it("toleriert Leerzeichen innerhalb der geschweiften Klammern", () => {
    expect(renderTemplate("Hallo {{ name }}", { name: "Bo" })).toBe("Hallo Bo");
  });

  it("lässt Text ohne Platzhalter unverändert", () => {
    expect(renderTemplate("nur Text", { a: "x" })).toBe("nur Text");
  });

  it("ist rein — verändert das Eingabe-Objekt nicht", () => {
    const vars = { name: "Anna" };
    renderTemplate("{{name}}", vars);
    expect(vars).toEqual({ name: "Anna" });
  });
});

// ---------------------------------------------------------------------------
// Default-Vorlage — enthält die erwarteten Platzhalter
// ---------------------------------------------------------------------------
describe("DEFAULT_CONTRACT_EMAIL_SUBJECT / _BODY", () => {
  it("Betreff enthält Mieter- und Firmen-Platzhalter", () => {
    expect(DEFAULT_CONTRACT_EMAIL_SUBJECT).toContain("{{firma}}");
  });

  it("Body enthält alle erwarteten Platzhalter", () => {
    for (const ph of [
      "{{mieter}}",
      "{{firma}}",
      "{{kennzeichen}}",
      "{{fahrzeug}}",
      "{{vertragsnummer}}",
      "{{abholdatum}}",
      "{{rueckgabedatum}}",
    ]) {
      expect(DEFAULT_CONTRACT_EMAIL_BODY).toContain(ph);
    }
  });

  it("Default-Vorlage rendert ohne übrig gebliebene Platzhalter", () => {
    const vars = {
      mieter: "Anna Beispiel",
      firma: "Muster Autovermietung",
      kennzeichen: "M-AB 123",
      fahrzeug: "VW Golf",
      vertragsnummer: "MV-2026-0001",
      abholdatum: "01.07.2026",
      rueckgabedatum: "05.07.2026",
    };
    const rendered =
      renderTemplate(DEFAULT_CONTRACT_EMAIL_SUBJECT, vars) +
      "\n" +
      renderTemplate(DEFAULT_CONTRACT_EMAIL_BODY, vars);
    expect(rendered).not.toMatch(/\{\{.*?\}\}/);
    expect(rendered).toContain("Anna Beispiel");
    expect(rendered).toContain("MV-2026-0001");
  });
});

// ---------------------------------------------------------------------------
// createSendingDomain — Mock (ohne RESEND_API_KEY) ist deterministisch
// ---------------------------------------------------------------------------
describe("createSendingDomain (Mock-Modus)", () => {
  // Sicherstellen, dass kein Key gesetzt ist → Mock-Pfad greift.
  const prev = process.env.RESEND_API_KEY;
  delete process.env.RESEND_API_KEY;
  if (prev !== undefined) process.env.RESEND_API_KEY = prev;

  it("liefert deterministisch dieselbe Domain für denselben Namen", async () => {
    delete process.env.RESEND_API_KEY;
    const a = await createSendingDomain("example.de");
    const b = await createSendingDomain("example.de");
    expect(a).toEqual(b);
    if (prev !== undefined) process.env.RESEND_API_KEY = prev;
  });

  it("Mock-ID leitet sich vom Namen ab, Status 'pending'", async () => {
    delete process.env.RESEND_API_KEY;
    const d = await createSendingDomain("meine-firma.de");
    expect(d.id).toBe("mock-meine-firma.de");
    expect(d.name).toBe("meine-firma.de");
    expect(d.status).toBe("pending");
    if (prev !== undefined) process.env.RESEND_API_KEY = prev;
  });

  it("liefert mindestens einen DKIM-CNAME-Record (resend._domainkey.<name>)", async () => {
    delete process.env.RESEND_API_KEY;
    const d = await createSendingDomain("example.de");
    expect(d.records.length).toBeGreaterThan(0);
    const cnames = d.records.filter((r) => r.type === "CNAME");
    expect(cnames.length).toBeGreaterThan(0);
    expect(d.records.some((r) => r.name.includes("resend._domainkey.example.de"))).toBe(true);
    if (prev !== undefined) process.env.RESEND_API_KEY = prev;
  });
});

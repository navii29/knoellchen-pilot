import { describe, it, expect } from "vitest";
import { buildNachtragHtml, type NachtragInput } from "./nachtrag-html";

const base: NachtragInput = {
  orgName: "Muster Autovermietung GmbH",
  logoDataUri: null,
  brandColor: "#1d4ed8",
  contractNr: "KP-2026-0042",
  renterName: "Erika Musterfrau",
  vehicleModel: "VW Golf VIII",
  plate: "M-AB 1234",
  fin: "WVWZZZ1KZAW000000",
  originalReturnDate: "2026-07-08",
  newReturnDate: "2026-07-15",
  extraDays: 7,
  dailyRate: 69,
  extraCost: 483,
  city: "München",
  dateStr: "15.07.2026",
};

describe("buildNachtragHtml", () => {
  it("enthält Titel, Bezug, Verlängerung und Zusatzkosten", () => {
    const html = buildNachtragHtml(base);
    expect(html).toContain("Nachtrag zum Mietvertrag");
    expect(html).toContain("KP-2026-0042");
    expect(html).toContain("Erika Musterfrau");
    expect(html).toContain("VW Golf VIII");
    expect(html).toContain("M-AB 1234");
    expect(html).toContain("7 Tage");
    expect(html).toContain("483"); // fmtEur(483)
  });

  it("enthält den Platzhalter-Rechtstext und die neutrale Hinweiszeile", () => {
    const html = buildNachtragHtml(base);
    expect(html).toContain("[Klauseltext Verlängerung — wird durch den Vermieter/Anwalt ergänzt]");
    expect(html).toContain("Alle übrigen Bestimmungen des Mietvertrags bleiben unberührt.");
  });

  it("setzt die Markenfarbe als CSS-Variable am Root", () => {
    expect(buildNachtragHtml(base)).toContain('style="--brand-color: #1d4ed8"');
  });

  it("brandColor null → Default-Teal", () => {
    expect(buildNachtragHtml({ ...base, brandColor: null })).toContain('style="--brand-color: #0d9488"');
  });

  it("ohne FIN wird die FIN-Zeile weggelassen", () => {
    const html = buildNachtragHtml({ ...base, fin: null });
    expect(html).not.toContain("Fahrzeug-Ident-Nr.");
  });

  it("Logo-Data-URI wird als <img> gerendert, sonst Org-Name-Fallback", () => {
    expect(buildNachtragHtml({ ...base, logoDataUri: "data:image/png;base64,AAA" })).toContain(
      '<img src="data:image/png;base64,AAA"'
    );
    expect(buildNachtragHtml({ ...base, logoDataUri: null })).toContain("logo-fallback");
  });

  it("Einzahl bei genau einem Zusatztag", () => {
    expect(buildNachtragHtml({ ...base, extraDays: 1 })).toContain("1 Tag");
  });
});

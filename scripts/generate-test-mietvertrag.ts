// Erzeugt eine realistische Beispiel-Mietvertrag-PDF zum Testen des
// Upload + KI-Parser-Flusses unter /dashboard/contracts/new.
//
// Run: npx tsx scripts/generate-test-mietvertrag.ts
// Output: test-fixtures/mietvertrag-sample.pdf
//
// Alle Felder, die der CONTRACT_PROMPT in src/lib/anthropic.ts erwartet,
// sind hier deutlich beschriftet vorhanden.

import { mkdirSync, writeFileSync } from "fs";
import { dirname, resolve } from "path";
import { jsPDF } from "jspdf";

const OUT = resolve(process.cwd(), "test-fixtures/mietvertrag-sample.pdf");

const PAGE = { w: 210, h: 297 };
const M = { left: 22, right: 18, top: 18 };
const TEAL: [number, number, number] = [13, 148, 136];
const INK: [number, number, number] = [38, 38, 36];
const GRAY: [number, number, number] = [120, 120, 116];
const LIGHT: [number, number, number] = [225, 225, 222];

const DATA = {
  vermieter: {
    name: "Stadtflotte München GmbH",
    street: "Bayerstraße 12",
    zip: "80335",
    city: "München",
    phone: "+49 89 12345678",
    email: "kontakt@stadtflotte.de",
    tax: "DE123456789",
  },
  contract: {
    nr: "MV-2026-0184",
    issued: "05.05.2026",
  },
  mieter: {
    salutation: "Herr",
    name: "Lukas Becker",
    street: "Sonnenstraße 24",
    zip: "80331",
    city: "München",
    birthday: "15.09.1992",
    license_nr: "B 8765 432109",
    license_class: "B",
    license_expiry: "12.06.2031",
    email: "lukas.becker@example.de",
    phone: "+49 175 8765432",
  },
  fahrzeug: {
    plate: "M-AV 5678",
    type: "VW Polo Style 1.0 TSI",
    fin: "WVWZZZ1KZAW123456",
    color: "Pure White",
    first_reg: "12.03.2023",
    fuel: "Benzin",
    transmission: "Manuell",
    km_at_pickup: 24812,
  },
  mietzeitraum: {
    pickup_date: "20.04.2026",
    pickup_time: "09:30",
    return_date: "23.04.2026",
    return_time: "18:00",
    days: 3,
  },
  preise: {
    daily_rate: 49.0,
    total_amount: 147.0,
    deposit: 250.0,
    km_inclusive: 300,
    extra_km_price: 0.18,
  },
};

const doc = new jsPDF({ unit: "mm", format: "a4" });
doc.setFont("helvetica", "normal");

const setColor = (c: [number, number, number]) => doc.setTextColor(c[0], c[1], c[2]);
const setDraw = (c: [number, number, number]) => doc.setDrawColor(c[0], c[1], c[2]);

let y = M.top;

// ============================================
// Briefkopf
// ============================================
setColor(TEAL);
doc.setFontSize(14);
doc.setFont("helvetica", "bold");
doc.text(DATA.vermieter.name, M.left, y);

setColor(GRAY);
doc.setFontSize(8.5);
doc.setFont("helvetica", "normal");
doc.text(
  `${DATA.vermieter.street} · ${DATA.vermieter.zip} ${DATA.vermieter.city}`,
  M.left,
  y + 5
);
doc.text(
  `Tel. ${DATA.vermieter.phone} · ${DATA.vermieter.email} · USt-IdNr. ${DATA.vermieter.tax}`,
  M.left,
  y + 9.5
);

setDraw(LIGHT);
doc.setLineWidth(0.3);
doc.line(M.left, y + 13, PAGE.w - M.right, y + 13);

y += 22;

// ============================================
// Titel + Vertragsnummer
// ============================================
setColor(INK);
doc.setFontSize(18);
doc.setFont("helvetica", "bold");
doc.text("Mietvertrag Kraftfahrzeug", M.left, y);

setColor(GRAY);
doc.setFontSize(9);
doc.setFont("helvetica", "normal");
doc.text(
  `Vertragsnummer: ${DATA.contract.nr}    ·    Ausgestellt am ${DATA.contract.issued}`,
  M.left,
  y + 6
);

y += 14;

// ============================================
// Helper: Zwei-Spalten-Box
// ============================================
type Row = [string, string];
const drawBox = (
  title: string,
  rows: Row[],
  startY: number,
  columns = 2
): number => {
  const headerH = 7;
  const rowH = 5.2;
  const lineCount = Math.ceil(rows.length / columns);
  const boxH = headerH + lineCount * rowH + 4;

  setDraw(LIGHT);
  doc.setLineWidth(0.3);
  doc.roundedRect(M.left, startY, PAGE.w - M.left - M.right, boxH, 2, 2);

  setColor(TEAL);
  doc.setFontSize(8.5);
  doc.setFont("helvetica", "bold");
  doc.text(title.toUpperCase(), M.left + 3, startY + 5);

  doc.setFontSize(9.5);
  doc.setFont("helvetica", "normal");
  const colW = (PAGE.w - M.left - M.right) / columns;

  rows.forEach((row, i) => {
    const col = i % columns;
    const line = Math.floor(i / columns);
    const x = M.left + 3 + col * colW;
    const ry = startY + headerH + 4 + line * rowH;

    setColor(GRAY);
    doc.setFontSize(8);
    doc.text(row[0], x, ry);

    setColor(INK);
    doc.setFontSize(9.5);
    doc.setFont("helvetica", "bold");
    doc.text(row[1], x, ry + 3.4);
    doc.setFont("helvetica", "normal");
  });

  return startY + boxH + 4;
};

// ============================================
// Mieter
// ============================================
y = drawBox(
  "Mieter / Fahrer",
  [
    ["Name", `${DATA.mieter.salutation} ${DATA.mieter.name}`],
    ["E-Mail", DATA.mieter.email],
    ["Anschrift", `${DATA.mieter.street}, ${DATA.mieter.zip} ${DATA.mieter.city}`],
    ["Telefon", DATA.mieter.phone],
    ["Geburtsdatum", DATA.mieter.birthday],
    ["Führerschein-Nr.", DATA.mieter.license_nr],
    ["Führerschein-Klasse", `${DATA.mieter.license_class}    (gültig bis ${DATA.mieter.license_expiry})`],
    ["", ""],
  ],
  y
);

// ============================================
// Fahrzeug
// ============================================
y = drawBox(
  "Mietfahrzeug",
  [
    ["Kennzeichen", DATA.fahrzeug.plate],
    ["Fahrzeugtyp", DATA.fahrzeug.type],
    ["FIN", DATA.fahrzeug.fin],
    ["Farbe", DATA.fahrzeug.color],
    ["Erstzulassung", DATA.fahrzeug.first_reg],
    ["Kraftstoff / Getriebe", `${DATA.fahrzeug.fuel} · ${DATA.fahrzeug.transmission}`],
    ["Km-Stand bei Übergabe", DATA.fahrzeug.km_at_pickup.toLocaleString("de-DE")],
    ["Tankfüllung bei Übergabe", "Voll"],
  ],
  y
);

// ============================================
// Mietzeitraum
// ============================================
y = drawBox(
  "Mietzeitraum",
  [
    ["Übernahme am", `${DATA.mietzeitraum.pickup_date} um ${DATA.mietzeitraum.pickup_time} Uhr`],
    ["Rückgabe am", `${DATA.mietzeitraum.return_date} um ${DATA.mietzeitraum.return_time} Uhr`],
    ["Geplante Mietdauer", `${DATA.mietzeitraum.days} Tage`],
    ["Übergabeort", "Bayerstraße 12, 80335 München"],
  ],
  y
);

// ============================================
// Preise
// ============================================
const fmt = (n: number) =>
  n.toLocaleString("de-DE", { style: "currency", currency: "EUR" });

y = drawBox(
  "Preise und Konditionen",
  [
    ["Tagespreis (brutto)", fmt(DATA.preise.daily_rate)],
    ["Mietdauer", `${DATA.mietzeitraum.days} Tage`],
    ["Inklusive Kilometer", `${DATA.preise.km_inclusive} km / Tag`],
    ["Mehrkilometer", `${DATA.preise.extra_km_price.toFixed(2).replace(".", ",")} € / km`],
    ["Gesamtbetrag (brutto)", fmt(DATA.preise.total_amount)],
    ["Kaution", fmt(DATA.preise.deposit)],
  ],
  y
);

// ============================================
// AGB-Hinweis + Selbstbeteiligung
// ============================================
setDraw(LIGHT);
doc.setLineWidth(0.3);
doc.roundedRect(M.left, y, PAGE.w - M.left - M.right, 22, 2, 2);

setColor(TEAL);
doc.setFontSize(8.5);
doc.setFont("helvetica", "bold");
doc.text("VERSICHERUNG · HAFTUNG · AGB", M.left + 3, y + 5);

setColor(INK);
doc.setFontSize(8.5);
doc.setFont("helvetica", "normal");
const agb =
  "Vollkasko mit Selbstbeteiligung 1.000 €, Teilkasko mit SB 300 €. Es gelten die Allgemeinen " +
  "Geschäftsbedingungen der Stadtflotte München GmbH (siehe Anlage 1), die der Mieter durch seine " +
  "Unterschrift anerkennt. Strafzettel, Bußgelder und Verkehrsverstöße werden gemäß Ziffer 9 AGB an den " +
  "Mieter weiterbelastet, zuzüglich Bearbeitungspauschale von 25,00 € netto.";
doc.text(doc.splitTextToSize(agb, PAGE.w - M.left - M.right - 6) as string[], M.left + 3, y + 9.5, {
  lineHeightFactor: 1.35,
});

y += 28;

// ============================================
// Unterschriften
// ============================================
const sigW = (PAGE.w - M.left - M.right - 8) / 2;

setDraw(GRAY);
doc.setLineWidth(0.4);
doc.line(M.left, y + 14, M.left + sigW, y + 14);
doc.line(M.left + sigW + 8, y + 14, M.left + 2 * sigW + 8, y + 14);

setColor(GRAY);
doc.setFontSize(8);
doc.text("Ort, Datum, Unterschrift Vermieter", M.left, y + 18);
doc.text("Ort, Datum, Unterschrift Mieter", M.left + sigW + 8, y + 18);

setColor(INK);
doc.setFontSize(8.5);
doc.text(`München, ${DATA.contract.issued}`, M.left, y + 11);
doc.text(`München, ${DATA.contract.issued}`, M.left + sigW + 8, y + 11);

// Footer
setColor(GRAY);
doc.setFontSize(7.5);
doc.text(
  `Stadtflotte München GmbH · ${DATA.vermieter.street} · ${DATA.vermieter.zip} ${DATA.vermieter.city} · ` +
    `USt-IdNr. ${DATA.vermieter.tax} · ${DATA.contract.nr}`,
  PAGE.w / 2,
  PAGE.h - 12,
  { align: "center" }
);

// ============================================
// Speichern
// ============================================
mkdirSync(dirname(OUT), { recursive: true });
const buf = Buffer.from(doc.output("arraybuffer"));
writeFileSync(OUT, buf);
console.log(`✓ ${OUT}`);
console.log(`  Größe: ${(buf.length / 1024).toFixed(1)} KB`);

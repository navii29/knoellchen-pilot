// Test-Mietvertrag #2: Maria Hofmann, Audi A3, M-OL 1001, 22.-25.04.2026
// Run: node scripts/gen-test-contract-hofmann.js
const { jsPDF } = require("jspdf");

const out = process.argv[2] || "/tmp/testvertrag-hofmann.pdf";
const doc = new jsPDF({ unit: "mm", format: "a4" });
const W = doc.internal.pageSize.getWidth();

doc.setFont("helvetica", "bold");
doc.setFontSize(16);
doc.setTextColor(13, 148, 136);
doc.text("Stadtflotte München GmbH", 20, 22);
doc.setFont("helvetica", "normal");
doc.setFontSize(9);
doc.setTextColor(80);
doc.text(
  ["Bayerstraße 12", "80335 München", "Tel.: +49 89 12345678", "kontakt@stadtflotte.de"],
  20, 28, { lineHeightFactor: 1.4 }
);
doc.setTextColor(0);

doc.setFont("helvetica", "bold");
doc.setFontSize(11);
doc.text("Mietvertrag", W - 20, 22, { align: "right" });
doc.setFont("helvetica", "normal");
doc.setFontSize(9);
doc.setTextColor(80);
doc.text(["Vertrags-Nr.: MV-2026-0058", "Erstellt am: 22.04.2026"], W - 20, 28, {
  align: "right", lineHeightFactor: 1.4,
});
doc.setTextColor(0);

doc.setFontSize(14);
doc.setFont("helvetica", "bold");
doc.text("Mietvertrag über die Vermietung eines Kraftfahrzeugs", 20, 58);

let y = 72;
doc.setFontSize(10);
doc.setFont("helvetica", "bold");
doc.text("Zwischen", 20, y); y += 6;
doc.setFont("helvetica", "normal");
doc.text("Stadtflotte München GmbH, Bayerstraße 12, 80335 München", 20, y); y += 5;
doc.setFont("helvetica", "italic");
doc.setTextColor(110);
doc.text("— nachfolgend „Vermieter\" —", 20, y); y += 8;

doc.setTextColor(0);
doc.setFont("helvetica", "bold");
doc.text("und", 20, y); y += 6;
doc.setFont("helvetica", "normal");
doc.text("Maria Hofmann, Türkenstraße 47, 80799 München", 20, y); y += 5;
doc.setFont("helvetica", "italic");
doc.setTextColor(110);
doc.text("— nachfolgend „Mieter\" —", 20, y); y += 6;
doc.setTextColor(0);
doc.setFont("helvetica", "normal");
doc.text("wird folgender Mietvertrag geschlossen:", 20, y); y += 12;

doc.setFont("helvetica", "bold");
doc.setFontSize(11);
doc.text("§ 1  Angaben zum Mieter", 20, y); y += 6;
doc.setFontSize(10);
doc.setFont("helvetica", "normal");

const row = (k, v) => {
  doc.setTextColor(110);
  doc.text(k, 22, y);
  doc.setTextColor(0);
  doc.text(v, 70, y);
  y += 5.5;
};

row("Name, Vorname:", "Hofmann, Maria");
row("Anschrift:", "Türkenstraße 47, 80799 München");
row("Geburtsdatum:", "22.03.1985");
row("Telefon:", "+49 160 1234567");
row("E-Mail:", "maria.hofmann@example.de");
row("Führerschein-Nr.:", "B 1234567890");
row("Führerscheinklasse:", "B");
row("ausgestellt:", "08.05.2003, gültig bis 08.05.2028");
y += 4;

doc.setFont("helvetica", "bold");
doc.setFontSize(11);
doc.text("§ 2  Mietgegenstand", 20, y); y += 6;
doc.setFontSize(10);
doc.setFont("helvetica", "normal");
row("Fahrzeug:", "Audi A3 Sportback, grau");
row("Kennzeichen:", "M-OL 1001");
row("Fahrgestell-Nr.:", "WAUZZZ8VXNAB12345");
row("Erstzulassung:", "06.2024");
row("km bei Übergabe:", "8.420");
y += 4;

doc.setFont("helvetica", "bold");
doc.setFontSize(11);
doc.text("§ 3  Mietzeit", 20, y); y += 6;
doc.setFontSize(10);
doc.setFont("helvetica", "normal");
row("Übernahmedatum:", "22.04.2026, 16:00 Uhr");
row("Vereinbarte Rückgabe:", "25.04.2026, 12:00 Uhr");
row("Übergabeort:", "Bayerstraße 12, 80335 München");
y += 4;

doc.setFont("helvetica", "bold");
doc.setFontSize(11);
doc.text("§ 4  Mietpreis und Kaution", 20, y); y += 6;
doc.setFontSize(10);
doc.setFont("helvetica", "normal");
row("Tagespreis:", "65,00 EUR");
row("Mietdauer:", "3 Tage");
row("Gesamtbetrag:", "195,00 EUR");
row("Kaution (bar/EC):", "300,00 EUR");
row("Inkl. Vollkasko:", "300 EUR Selbstbeteiligung");
y += 6;

doc.setFont("helvetica", "bold");
doc.setFontSize(11);
doc.text("§ 5  Vertragsbedingungen", 20, y); y += 6;
doc.setFontSize(9);
doc.setFont("helvetica", "normal");
const para = (txt) => {
  const lines = doc.splitTextToSize(txt, W - 40);
  doc.text(lines, 20, y, { lineHeightFactor: 1.45 });
  y += lines.length * 4.4 + 3;
};
para(
  "Der Mieter haftet für sämtliche während der Mietzeit verursachten Verkehrsverstöße, Strafzettel, Bußgelder und sonstige behördliche Verfahren. Bei Eingang eines Anhörungsbogens oder Bußgeldbescheids wird dem Mieter eine Bearbeitungsgebühr in Höhe von 25,00 EUR pro Vorgang in Rechnung gestellt."
);
para(
  "Das Fahrzeug ist im selben Zustand zurückzugeben, in dem es übergeben wurde. Schäden sind unverzüglich anzuzeigen. Der Mieter erkennt die Allgemeinen Geschäftsbedingungen des Vermieters an."
);

y = Math.max(y + 12, 248);
doc.line(20, y, 90, y);
doc.line(W - 90, y, W - 20, y);
y += 5;
doc.setFontSize(9);
doc.setTextColor(110);
doc.text("Ort, Datum, Vermieter", 20, y);
doc.text("Ort, Datum, Mieter", W - 20, y, { align: "right" });
doc.setTextColor(0);

doc.setFontSize(7);
doc.setTextColor(150);
doc.text(
  "Stadtflotte München GmbH · Bayerstraße 12 · 80335 München · Geschäftsführer: M. Lehmann · HRB 234567 · USt-IdNr. DE123456789",
  W / 2, 287, { align: "center" }
);

doc.save(out);
console.log("✓ Vertrag erstellt:", out);

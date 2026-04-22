// Erzeugt einen realistischen Test-Mietvertrag als PDF.
// Run: node scripts/gen-test-contract.js [output.pdf]
const { jsPDF } = require("jspdf");

const out = process.argv[2] || "/tmp/testvertrag.pdf";

const doc = new jsPDF({ unit: "mm", format: "a4" });
const W = doc.internal.pageSize.getWidth();

// ---- Briefkopf Vermieter
doc.setFont("helvetica", "bold");
doc.setFontSize(16);
doc.setTextColor(13, 148, 136); // teal
doc.text("Stadtflotte München GmbH", 20, 22);
doc.setFont("helvetica", "normal");
doc.setFontSize(9);
doc.setTextColor(80);
doc.text(
  ["Bayerstraße 12", "80335 München", "Tel.: +49 89 12345678", "kontakt@stadtflotte.de"],
  20,
  28,
  { lineHeightFactor: 1.4 }
);
doc.setTextColor(0);

// ---- Vertragsnr + Datum oben rechts
doc.setFont("helvetica", "bold");
doc.setFontSize(11);
doc.text("Mietvertrag", W - 20, 22, { align: "right" });
doc.setFont("helvetica", "normal");
doc.setFontSize(9);
doc.setTextColor(80);
doc.text(
  ["Vertrags-Nr.: MV-2026-0042", "Erstellt am: 20.04.2026"],
  W - 20,
  28,
  { align: "right", lineHeightFactor: 1.4 }
);
doc.setTextColor(0);

// ---- Vertragstitel
doc.setFontSize(14);
doc.setFont("helvetica", "bold");
doc.text("Mietvertrag über die Vermietung eines Kraftfahrzeugs", 20, 58);

// ---- Vertragsparteien
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
doc.text("Lukas Becker, Sonnenstraße 24, 80331 München", 20, y); y += 5;
doc.setFont("helvetica", "italic");
doc.setTextColor(110);
doc.text("— nachfolgend „Mieter\" —", 20, y); y += 6;
doc.setTextColor(0);
doc.setFont("helvetica", "normal");
doc.text("wird folgender Mietvertrag geschlossen:", 20, y); y += 12;

// ---- § 1 Mieterdaten
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

row("Name, Vorname:", "Becker, Lukas");
row("Anschrift:", "Sonnenstraße 24, 80331 München");
row("Geburtsdatum:", "15.09.1992");
row("Telefon:", "+49 175 8765432");
row("E-Mail:", "lukas.becker@example.de");
row("Führerschein-Nr.:", "B 8765432109");
row("Führerscheinklasse:", "B");
row("ausgestellt:", "12.06.2010, gültig bis 12.06.2025");
y += 4;

// ---- § 2 Fahrzeug
doc.setFont("helvetica", "bold");
doc.setFontSize(11);
doc.text("§ 2  Mietgegenstand", 20, y); y += 6;
doc.setFontSize(10);
doc.setFont("helvetica", "normal");
row("Fahrzeug:", "VW Polo, weiß");
row("Kennzeichen:", "M-AV 5678");
row("Fahrgestell-Nr.:", "WVWZZZ6RZNY123456");
row("Erstzulassung:", "03.2023");
row("km bei Übergabe:", "24.812");
y += 4;

// ---- § 3 Mietzeit
doc.setFont("helvetica", "bold");
doc.setFontSize(11);
doc.text("§ 3  Mietzeit", 20, y); y += 6;
doc.setFontSize(10);
doc.setFont("helvetica", "normal");
row("Übernahmedatum:", "20.04.2026, 09:30 Uhr");
row("Vereinbarte Rückgabe:", "23.04.2026, 18:00 Uhr");
row("Übergabeort:", "Bayerstraße 12, 80335 München");
y += 4;

// ---- § 4 Mietpreis
doc.setFont("helvetica", "bold");
doc.setFontSize(11);
doc.text("§ 4  Mietpreis und Kaution", 20, y); y += 6;
doc.setFontSize(10);
doc.setFont("helvetica", "normal");
row("Tagespreis:", "49,00 EUR");
row("Mietdauer:", "3 Tage");
row("Gesamtbetrag:", "147,00 EUR");
row("Kaution (bar/EC):", "250,00 EUR");
row("Inkl. Vollkasko:", "200 EUR Selbstbeteiligung");
y += 6;

// ---- § 5 Bedingungen
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

// ---- Unterschriften
y = Math.max(y + 12, 248);
doc.line(20, y, 90, y);
doc.line(W - 90, y, W - 20, y);
y += 5;
doc.setFontSize(9);
doc.setTextColor(110);
doc.text("Ort, Datum, Vermieter", 20, y);
doc.text("Ort, Datum, Mieter", W - 20, y, { align: "right" });
doc.setTextColor(0);

// ---- Footer
doc.setFontSize(7);
doc.setTextColor(150);
doc.text(
  "Stadtflotte München GmbH · Bayerstraße 12 · 80335 München · Geschäftsführer: M. Lehmann · HRB 234567 · USt-IdNr. DE123456789",
  W / 2,
  287,
  { align: "center" }
);

doc.save(out);
console.log("✓ Mietvertrag erstellt:", out);

// Erzeugt einen realistischen deutschen Anhörungsbogen als PDF.
// Run: node scripts/gen-test-ticket.js [output.pdf]
const { jsPDF } = require("jspdf");

const out = process.argv[2] || "/tmp/teststrafzettel.pdf";

const doc = new jsPDF({ unit: "mm", format: "a4" });
const W = doc.internal.pageSize.getWidth();

// Absender (Behörde)
doc.setFont("helvetica", "normal");
doc.setFontSize(7);
doc.setTextColor(80);
doc.text(
  "Landeshauptstadt München · Kreisverwaltungsreferat · Hauptabteilung III/2 · Bußgeldstelle · 80313 München",
  20,
  22
);

doc.setTextColor(0);
doc.setFontSize(11);
doc.setFont("helvetica", "bold");
doc.text("Kreisverwaltungsreferat", W - 20, 22, { align: "right" });
doc.setFont("helvetica", "normal");
doc.setFontSize(9);
doc.text(
  [
    "Bußgeldstelle",
    "Ruppertstraße 19",
    "80337 München",
    "Tel.: +49 89 233-96000",
    "buszgeldstelle@muenchen.de",
  ],
  W - 20,
  28,
  { align: "right", lineHeightFactor: 1.4 }
);

// Empfänger (Halter = Autovermietung)
doc.setFontSize(10);
doc.text(
  ["Stadtflotte München GmbH", "Bayerstraße 12", "80335 München"],
  20,
  60,
  { lineHeightFactor: 1.5 }
);

// Datum + Aktenzeichen
const today = new Date().toLocaleDateString("de-DE");
doc.setFontSize(9);
doc.text("München, " + today, W - 20, 60, { align: "right" });
doc.text("Aktenzeichen:  KVR-2026-04-15827", W - 20, 66, { align: "right" });
doc.text("Bei Antwort bitte angeben", W - 20, 71, { align: "right" });

// Betreff
doc.setFontSize(12);
doc.setFont("helvetica", "bold");
doc.text("Anhörungsbogen im Bußgeldverfahren", 20, 92);
doc.setFont("helvetica", "normal");
doc.setFontSize(10);
doc.text("Ordnungswidrigkeit nach §§ 24, 25 StVG i.V.m. StVO", 20, 99);

// Anrede + Einleitung
let y = 115;
const para = (txt, gap = 6) => {
  const lines = doc.splitTextToSize(txt, W - 40);
  doc.text(lines, 20, y, { lineHeightFactor: 1.5 });
  y += lines.length * 5 + gap;
};

para("Sehr geehrte Damen und Herren,");
para(
  "gegen die Halterin/den Halter des nachfolgend bezeichneten Fahrzeugs wird wegen einer Ordnungswidrigkeit ein Bußgeldverfahren eingeleitet. Wir geben Ihnen Gelegenheit, sich vor Erlass eines Bußgeldbescheids zur Sache zu äußern."
);

// Tatdaten Box
doc.setDrawColor(180);
doc.setFillColor(245, 245, 244);
doc.rect(20, y, W - 40, 56, "FD");
doc.setFont("helvetica", "bold");
doc.setFontSize(10);
doc.text("Daten zur Tat", 24, y + 7);
doc.setFont("helvetica", "normal");
doc.setFontSize(9);

const labelX = 24;
const valX = 70;
let by = y + 14;
const row = (k, v, bold = false) => {
  doc.setTextColor(110);
  doc.text(k, labelX, by);
  doc.setTextColor(0);
  if (bold) doc.setFont("helvetica", "bold");
  doc.text(v, valX, by);
  if (bold) doc.setFont("helvetica", "normal");
  by += 5.5;
};

row("Kennzeichen:", "M-KP 2847", true);
row("Tatzeit:", "15.04.2026, 11:23 Uhr");
row("Tatort:", "Leopoldstraße 82, 80802 München");
row("Tatvorwurf:", "Parken im eingeschränkten Halteverbot ohne Parkschein");
row("Vorschrift:", "§ 12 Abs. 3 Nr. 8e StVO; § 24 StVG; BKat-Nr. 112000");
row("Bußgeld:", "35,00 EUR", true);
row("Verwaltungsgebühr:", "28,50 EUR");
row("Auslagen (Zustellung):", "3,50 EUR");

y += 64;

// Hinweis Halterhaftung + Frist
para(
  "Falls nicht Sie persönlich, sondern eine andere Person Fahrer:in zum Tatzeitpunkt war (z.B. weil das Fahrzeug vermietet wurde), bitten wir Sie, uns Name, Anschrift und Geburtsdatum dieser Person mitzuteilen. Anderenfalls werden Ihnen die Verfahrenskosten nach § 25a StVG auferlegt.",
  4
);
para("Antwortfrist:  29.04.2026", 4);
para(
  "Sie können sich auch durch einen Rechtsbeistand vertreten lassen. Eine Aussage zur Sache ist freiwillig.",
  4
);
para("Mit freundlichen Grüßen", 2);
para("i.A. Schreiber, Sachbearbeiter:in", 0);

// Footer
doc.setFontSize(7);
doc.setTextColor(140);
doc.text(
  "Landeshauptstadt München · Kreisverwaltungsreferat · Bußgeldstelle · Ruppertstr. 19 · 80337 München · IBAN DE08 7015 0000 0000 0000 41 · BIC SSKMDEMM",
  W / 2,
  285,
  { align: "center" }
);

doc.save(out);
console.log("✓ PDF erstellt:", out);

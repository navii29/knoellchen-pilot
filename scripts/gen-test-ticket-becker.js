// Test-Strafzettel passend zum Lukas-Becker-Vertrag (M-AV 5678, 20.-23.04.2026).
// Run: node scripts/gen-test-ticket-becker.js [output.pdf]
const { jsPDF } = require("jspdf");

const out = process.argv[2] || "/tmp/teststrafzettel-becker.pdf";

const doc = new jsPDF({ unit: "mm", format: "a4" });
const W = doc.internal.pageSize.getWidth();

doc.setFont("helvetica", "normal");
doc.setFontSize(7);
doc.setTextColor(80);
doc.text(
  "Polizeipräsidium München · Bußgeldstelle · 80539 München",
  20,
  22
);

doc.setTextColor(0);
doc.setFontSize(11);
doc.setFont("helvetica", "bold");
doc.text("Polizeipräsidium München", W - 20, 22, { align: "right" });
doc.setFont("helvetica", "normal");
doc.setFontSize(9);
doc.text(
  [
    "Bußgeldstelle Verkehr",
    "Ettstraße 2",
    "80333 München",
    "Tel.: +49 89 2910-0",
    "bussgeld@polizei.muenchen.de",
  ],
  W - 20,
  28,
  { align: "right", lineHeightFactor: 1.4 }
);

doc.setFontSize(10);
doc.text(
  ["Stadtflotte München GmbH", "Bayerstraße 12", "80335 München"],
  20,
  60,
  { lineHeightFactor: 1.5 }
);

const today = new Date().toLocaleDateString("de-DE");
doc.setFontSize(9);
doc.text("München, " + today, W - 20, 60, { align: "right" });
doc.text("Aktenzeichen:  PP-VK-2026-04-29381", W - 20, 66, { align: "right" });
doc.text("Bei Antwort bitte angeben", W - 20, 71, { align: "right" });

doc.setFontSize(12);
doc.setFont("helvetica", "bold");
doc.text("Anhörungsbogen im Bußgeldverfahren", 20, 92);
doc.setFont("helvetica", "normal");
doc.setFontSize(10);
doc.text("Geschwindigkeitsüberschreitung — § 3 StVO i.V.m. § 24 StVG", 20, 99);

let y = 115;
const para = (txt, gap = 6) => {
  const lines = doc.splitTextToSize(txt, W - 40);
  doc.text(lines, 20, y, { lineHeightFactor: 1.5 });
  y += lines.length * 5 + gap;
};

para("Sehr geehrte Damen und Herren,");
para(
  "im Rahmen einer stationären Geschwindigkeitsmessung wurde am unten genannten Tag mit dem auf Sie zugelassenen Fahrzeug eine Ordnungswidrigkeit festgestellt. Wir geben Ihnen Gelegenheit zur Äußerung."
);

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

row("Kennzeichen:", "M-AV 5678", true);
row("Tatzeit:", "21.04.2026, 14:38 Uhr");
row("Tatort:", "Landsberger Straße 155, 80339 München");
row("Tatvorwurf:", "Geschwindigkeitsüberschreitung außerorts um 21 km/h");
row("Gemessen:", "71 km/h bei zulässigen 50 km/h (nach Toleranzabzug)");
row("Vorschrift:", "§ 3 StVO; § 24 StVG; BKat-Nr. 11.3.4");
row("Bußgeld:", "115,00 EUR", true);
row("Verwaltungsgebühr:", "28,50 EUR");
row("Auslagen (Zustellung):", "3,50 EUR");

y += 64;

para(
  "Falls nicht Sie persönlich, sondern eine andere Person Fahrer:in zum Tatzeitpunkt war (z.B. weil das Fahrzeug vermietet wurde), bitten wir Sie, uns Name, Anschrift und Geburtsdatum dieser Person mitzuteilen. Anderenfalls werden Ihnen die Verfahrenskosten nach § 25a StVG auferlegt.",
  4
);
para("Antwortfrist:  06.05.2026", 4);
para(
  "Eine Aussage zur Sache ist freiwillig. Sie können sich durch einen Rechtsbeistand vertreten lassen.",
  4
);
para("Mit freundlichen Grüßen", 2);
para("i.A. Petersen, Sachbearbeiter:in", 0);

doc.setFontSize(7);
doc.setTextColor(140);
doc.text(
  "Polizeipräsidium München · Bußgeldstelle Verkehr · Ettstraße 2 · 80333 München · IBAN DE12 7015 0000 0000 1234 56 · BIC SSKMDEMM",
  W / 2,
  285,
  { align: "center" }
);

doc.save(out);
console.log("✓ PDF erstellt:", out);

import { jsPDF } from "jspdf";
import type { Contract, Organization, Ticket } from "./types";
import { fmtDate, fmtEur } from "./utils";

// ============================================
// DIN 5008 Form B — Layout-Konstanten (mm)
// ============================================
const PAGE = { w: 210, h: 297 };
const M = { left: 25, right: 20, top: 20, bottom: 20 };

// Anschriftfeld
const SENDER_LINE_Y = 45;        // Absenderzeile über Empfänger
const RECIPIENT_Y = 50.5;        // Empfänger-Adresse Start (3 Zeilen Absender unten + Empfänger oben)

// Bezugszeichenzeile (Form B)
const REF_LABEL_Y = 98.46;
const REF_VALUE_Y = 103.46;
const REF_LINE_Y_END = 108;

// Betreff + Brieftext
const SUBJECT_Y = 116;
const SALUT_Y = 130;
const BODY_START_Y = 138;

// Logo + Info-Block oben rechts
const INFO_X = 130;
const INFO_Y_TOP = 22;

// Fußzeile
const FOOTER_Y = PAGE.h - 28;

// Farben
const TEAL: [number, number, number] = [13, 148, 136];
const INK: [number, number, number] = [38, 38, 36];
const GRAY_60: [number, number, number] = [113, 113, 109];
const GRAY_30: [number, number, number] = [180, 180, 178];
const GRAY_15: [number, number, number] = [220, 220, 218];

// ============================================
// Primitives
// ============================================

const newDoc = (): jsPDF => {
  const doc = new jsPDF({ unit: "mm", format: "a4", compress: true });
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...INK);
  doc.setFontSize(10);
  return doc;
};

const setColor = (doc: jsPDF, c: [number, number, number]) => doc.setTextColor(...c);
const setFill = (doc: jsPDF, c: [number, number, number]) => doc.setFillColor(...c);
const setStroke = (doc: jsPDF, c: [number, number, number]) => doc.setDrawColor(...c);

// Falzmarken + Lochmarke (DIN 5008)
const drawFoldMarks = (doc: jsPDF) => {
  setStroke(doc, GRAY_30);
  doc.setLineWidth(0.15);
  doc.line(4, 105, 7, 105);     // Erste Falzmarke
  doc.line(3, 148.5, 7, 148.5); // Lochmarke (Mitte)
  doc.line(4, 210, 7, 210);     // Zweite Falzmarke
};

// Logo-Block oben rechts: Teal-Quadrat mit Initial + Firmenname + Stammdaten
const drawLetterhead = (doc: jsPDF, org: Organization) => {
  // Logo-Square
  setFill(doc, TEAL);
  doc.roundedRect(INFO_X, INFO_Y_TOP, 11, 11, 1.5, 1.5, "F");
  setColor(doc, [255, 255, 255]);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  const initial = org.name.charAt(0).toUpperCase() || "K";
  doc.text(initial, INFO_X + 5.5, INFO_Y_TOP + 7.6, { align: "center" });

  // Firmenname rechts vom Logo
  setColor(doc, INK);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text(org.name, INFO_X + 14, INFO_Y_TOP + 7);

  // Info-Liste darunter (Adresse + Kontakt)
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  setColor(doc, GRAY_60);
  let y = INFO_Y_TOP + 16;
  const lines: Array<[string, string] | null> = [
    org.street ? ["Anschrift", org.street] : null,
    org.zip || org.city ? ["", `${org.zip || ""} ${org.city || ""}`.trim()] : null,
    org.phone ? ["Telefon", org.phone] : null,
    org.email ? ["E-Mail", org.email] : null,
  ];
  for (const item of lines) {
    if (!item) continue;
    const [label, value] = item;
    if (label) {
      setColor(doc, GRAY_60);
      doc.text(label, INFO_X, y);
    }
    setColor(doc, INK);
    doc.text(value, INFO_X + 16, y);
    y += 4.2;
  }
  setColor(doc, INK);
};

// Absenderzeile (klein, über Anschriftfeld)
const drawSenderLine = (doc: jsPDF, org: Organization) => {
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  setColor(doc, GRAY_60);
  const parts = [org.name, org.street, [org.zip, org.city].filter(Boolean).join(" ")].filter(Boolean);
  doc.text(parts.join(" · "), M.left, SENDER_LINE_Y);
  setStroke(doc, GRAY_30);
  doc.setLineWidth(0.1);
  doc.line(M.left, SENDER_LINE_Y + 0.8, M.left + 85, SENDER_LINE_Y + 0.8);
  setColor(doc, INK);
};

// Empfängeradresse (max 6 Zeilen, im Anschriftfeld)
const drawRecipient = (doc: jsPDF, addressLines: string[]) => {
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  setColor(doc, INK);
  const lines = addressLines.filter(Boolean).slice(0, 6);
  doc.text(lines, M.left, RECIPIENT_Y, { lineHeightFactor: 1.45 });
};

// Bezugszeichenzeile — 4 Spalten DIN-konform
const drawReferenceLine = (
  doc: jsPDF,
  refs: { ihrZeichen?: string; unserZeichen?: string; telefon?: string; datum?: string }
) => {
  const cols: Array<{ x: number; label: string; value: string }> = [
    { x: M.left, label: "Ihr Zeichen", value: refs.ihrZeichen || "—" },
    { x: M.left + 42, label: "Unser Zeichen", value: refs.unserZeichen || "—" },
    { x: M.left + 92, label: "Telefon", value: refs.telefon || "—" },
    { x: M.left + 132, label: "Datum", value: refs.datum || "" },
  ];
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  setColor(doc, GRAY_60);
  for (const c of cols) doc.text(c.label, c.x, REF_LABEL_Y);

  doc.setFontSize(10);
  setColor(doc, INK);
  for (const c of cols) doc.text(c.value, c.x, REF_VALUE_Y);

  setStroke(doc, GRAY_15);
  doc.setLineWidth(0.15);
  doc.line(M.left, REF_LINE_Y_END, PAGE.w - M.right, REF_LINE_Y_END);
};

// Betreff (fett, ohne "Betreff:" Prefix gem. DIN 5008)
const drawSubject = (doc: jsPDF, subject: string) => {
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  setColor(doc, INK);
  const lines = doc.splitTextToSize(subject, PAGE.w - M.left - M.right);
  doc.text(lines, M.left, SUBJECT_Y);
};

// Anrede + Brieftext-Absätze. Liefert finalen y zurück.
const drawBody = (doc: jsPDF, salutation: string, paragraphs: string[]): number => {
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  setColor(doc, INK);

  doc.text(salutation, M.left, SALUT_Y);

  let y = BODY_START_Y;
  const w = PAGE.w - M.left - M.right;
  for (const p of paragraphs) {
    const lines = doc.splitTextToSize(p, w);
    doc.text(lines, M.left, y, { lineHeightFactor: 1.5 });
    y += lines.length * 5.2 + 4.5;
  }
  return y;
};

// Grußformel + Unterschrift-Linie + Name. Liefert finalen y zurück.
const drawSignature = (doc: jsPDF, startY: number, gruss: string, signer: string): number => {
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  setColor(doc, INK);
  let y = startY;
  doc.text(gruss, M.left, y);
  y += 16; // kompakterer Unterschrift-Platz
  setStroke(doc, GRAY_30);
  doc.setLineWidth(0.1);
  doc.line(M.left, y - 1, M.left + 60, y - 1);
  y += 4;
  doc.setFont("helvetica", "bold");
  doc.text(signer, M.left, y);
  doc.setFont("helvetica", "normal");
  return y;
};

// Kleine 2-Spalten Betragstabelle innerhalb des Brieftexts
const drawAmountSummary = (
  doc: jsPDF,
  startY: number,
  rows: Array<{ label: string; amount: number; bold?: boolean }>
): number => {
  const labelX = M.left;
  const amountX = M.left + 90;
  let y = startY;
  for (const r of rows) {
    if (r.bold) {
      doc.setFont("helvetica", "bold");
      setStroke(doc, GRAY_30);
      doc.setLineWidth(0.15);
      doc.line(labelX, y - 4, amountX + 35, y - 4);
    } else {
      doc.setFont("helvetica", "normal");
    }
    doc.setFontSize(11);
    setColor(doc, INK);
    doc.text(r.label, labelX, y);
    doc.text(fmtEur(r.amount), amountX + 35, y, { align: "right" });
    y += 6.2;
  }
  doc.setFont("helvetica", "normal");
  return y + 2;
};

// Mehrspaltige Fußzeile: Geschäft | Bank | Steuer
const drawFooter = (doc: jsPDF, org: Organization) => {
  setStroke(doc, GRAY_15);
  doc.setLineWidth(0.2);
  doc.line(M.left, FOOTER_Y, PAGE.w - M.right, FOOTER_Y);

  doc.setFontSize(7);
  doc.setFont("helvetica", "bold");
  setColor(doc, GRAY_60);
  const colW = (PAGE.w - M.left - M.right) / 3;

  const cols = [
    {
      title: org.name,
      lines: [
        org.street || "",
        [org.zip, org.city].filter(Boolean).join(" "),
        org.phone ? "Tel.  " + org.phone : "",
        org.email || "",
      ].filter(Boolean),
    },
    {
      title: "Bankverbindung",
      lines: ["Bitte Bankdaten in den Einstellungen ergänzen", "Verwendungszweck: Vorgangs-Nr."].filter(Boolean),
    },
    {
      title: "Steuerliche Angaben",
      lines: [
        org.tax_number ? "USt-IdNr.  " + org.tax_number : "USt-IdNr. nicht hinterlegt",
        "Erstellt mit Knöllchen-Pilot",
      ].filter(Boolean),
    },
  ];

  cols.forEach((col, i) => {
    const x = M.left + i * colW;
    doc.setFont("helvetica", "bold");
    doc.text(col.title, x, FOOTER_Y + 4);
    doc.setFont("helvetica", "normal");
    doc.text(col.lines, x, FOOTER_Y + 8, { lineHeightFactor: 1.4 });
  });
  setColor(doc, INK);
};

// Standard-Layout-Wrapper für alle Briefe
const drawLetterFrame = (
  doc: jsPDF,
  org: Organization,
  recipient: string[],
  refs: Parameters<typeof drawReferenceLine>[1]
) => {
  drawFoldMarks(doc);
  drawLetterhead(doc, org);
  drawSenderLine(doc, org);
  drawRecipient(doc, recipient);
  drawReferenceLine(doc, refs);
  drawFooter(doc, org);
};

const finalize = (doc: jsPDF): Uint8Array => new Uint8Array(doc.output("arraybuffer"));

// ============================================
// 1) ANSCHREIBEN AN MIETER
// ============================================
export const generateLetterPdf = (
  org: Organization,
  ticket: Ticket,
  contract: Contract | null
): Uint8Array => {
  const doc = newDoc();
  const renterName = contract?.renter_name || ticket.renter_name || "[Mieter:in]";
  const surname = renterName.split(" ").slice(-1)[0] || "";

  drawLetterFrame(
    doc,
    org,
    [renterName, contract?.renter_address || "—"],
    {
      ihrZeichen: ticket.reference_nr || undefined,
      unserZeichen: ticket.ticket_nr,
      telefon: org.phone || undefined,
      datum: new Date().toLocaleDateString("de-DE"),
    }
  );

  const subject = `Weiterbelastung Ordnungswidrigkeit ${ticket.plate ?? ""} — Aktenzeichen ${
    ticket.reference_nr || ticket.ticket_nr
  }`;
  drawSubject(doc, subject);

  const total = (ticket.fine_amount || 0) + Number(ticket.processing_fee || 0);
  const tatzeit = `${fmtDate(ticket.offense_date)}${
    ticket.offense_time ? ", " + ticket.offense_time + " Uhr" : ""
  }`;

  const paragraphsBefore: string[] = [
    `bezugnehmend auf den Ihnen überlassenen Mietwagen mit dem Kennzeichen ${ticket.plate || "—"}${
      contract?.contract_nr ? ` (Mietvertrag-Nr. ${contract.contract_nr})` : ""
    } liegt uns ein Vorgang der ${ticket.authority || "zuständigen Behörde"} vor.`,
    `Tatvorwurf: ${ticket.offense || "—"}${
      ticket.offense_details ? " — " + ticket.offense_details : ""
    }\nTatzeit: ${tatzeit}\nTatort: ${ticket.location || "—"}`,
    `Da Sie das Fahrzeug zum Tatzeitpunkt im Rahmen Ihres Mietvertrags geführt haben, leiten wir Ihre Daten an die Behörde weiter und stellen Ihnen das Bußgeld zuzüglich unserer vertraglich vereinbarten Bearbeitungsgebühr in Rechnung:`,
  ];

  let y = drawBody(doc, `Sehr geehrte:r ${surname},`, paragraphsBefore);

  // Saubere 2-Spalten-Aufstellung statt Spaces
  y = drawAmountSummary(doc, y + 2, [
    { label: "Bußgeld", amount: ticket.fine_amount || 0 },
    { label: "Bearbeitungsgebühr", amount: Number(ticket.processing_fee) },
    { label: "Gesamtbetrag", amount: total, bold: true },
  ]);

  // Knapper Schlusssatz (eine Zeile) statt zwei langer Paragraphen
  const restParagraphs: string[] = [
    `Bitte überweisen Sie den Gesamtbetrag innerhalb von 14 Tagen unter Angabe der Vorgangs-Nr. ${ticket.ticket_nr}. Details zur Bankverbindung finden Sie in der beigefügten Rechnung.`,
  ];
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  setColor(doc, INK);
  const w = PAGE.w - M.left - M.right;
  for (const p of restParagraphs) {
    const lines = doc.splitTextToSize(p, w);
    doc.text(lines, M.left, y, { lineHeightFactor: 1.5 });
    y += lines.length * 5.2 + 4.5;
  }

  drawSignature(doc, y + 4, "Mit freundlichen Grüßen", org.name);
  return finalize(doc);
};

// ============================================
// 2) RECHNUNG
// ============================================
export const generateInvoicePdf = (
  org: Organization,
  ticket: Ticket,
  contract: Contract | null
): Uint8Array => {
  const doc = newDoc();
  const renterName = contract?.renter_name || ticket.renter_name || "[Mieter:in]";

  drawLetterFrame(
    doc,
    org,
    [renterName, contract?.renter_address || "—"],
    {
      ihrZeichen: ticket.reference_nr || undefined,
      unserZeichen: ticket.ticket_nr,
      telefon: org.phone || undefined,
      datum: new Date().toLocaleDateString("de-DE"),
    }
  );

  // Betreff
  drawSubject(doc, `Rechnung Nr. ${ticket.ticket_nr}`);

  const fine = ticket.fine_amount || 0;
  const fee = Number(ticket.processing_fee || 0);
  const total = fine + fee;

  // Meta-Block (Rechnungs-Nr / Datum / Leistungsdatum)
  let y = SALUT_Y;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  setColor(doc, GRAY_60);
  const metaCols = [
    ["Rechnungsnummer", ticket.ticket_nr],
    ["Rechnungsdatum", new Date().toLocaleDateString("de-DE")],
    ["Leistungsdatum", fmtDate(ticket.offense_date)],
  ];
  metaCols.forEach((m, i) => {
    const x = M.left + i * 55;
    doc.setFontSize(7);
    setColor(doc, GRAY_60);
    doc.text(m[0], x, y);
    doc.setFontSize(10);
    setColor(doc, INK);
    doc.text(m[1] || "—", x, y + 4.5);
  });

  // Positionstabelle
  y += 16;
  drawInvoiceTable(doc, y, [
    {
      pos: "1",
      desc: `Bußgeld nach § 24 StVG${ticket.offense ? "  ·  " + ticket.offense : ""}${
        ticket.location ? "\n" + ticket.location : ""
      }${ticket.offense_date ? "  ·  " + fmtDate(ticket.offense_date) : ""}`,
      amount: fine,
      hint: "Durchlaufender Posten",
    },
    {
      pos: "2",
      desc: `Bearbeitungsgebühr nach Mietvertrag${
        contract?.contract_nr ? "  ·  " + contract.contract_nr : ""
      }`,
      amount: fee,
      hint: "Schadensersatz, nicht steuerbar",
    },
  ]);

  // Summen-Block
  y += 50; // unter Tabelle
  drawTotalsBlock(doc, y, total);

  // Zahlungshinweise
  y += 30;
  setColor(doc, INK);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text("Zahlungsbedingungen", M.left, y);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  setColor(doc, GRAY_60);
  y += 5;
  const payNote = doc.splitTextToSize(
    `Bitte überweisen Sie den Gesamtbetrag innerhalb von 14 Tagen ohne Abzug. Verwendungszweck: ${ticket.ticket_nr}. Bei Rückfragen kontaktieren Sie uns gerne über die oben genannten Kontaktdaten.`,
    PAGE.w - M.left - M.right
  );
  doc.text(payNote, M.left, y, { lineHeightFactor: 1.5 });

  // Steuerlicher Hinweis
  y += payNote.length * 4.5 + 5;
  const taxNote = doc.splitTextToSize(
    `Hinweis: Das weiterbelastete Bußgeld stellt einen durchlaufenden Posten gem. § 10 Abs. 1 Satz 6 UStG dar und unterliegt nicht der Umsatzsteuer. Die Bearbeitungsgebühr ist umsatzsteuerlicher Schadensersatz und nach § 1 Abs. 1 UStG nicht steuerbar.`,
    PAGE.w - M.left - M.right
  );
  setColor(doc, GRAY_60);
  doc.setFontSize(8);
  doc.text(taxNote, M.left, y, { lineHeightFactor: 1.5 });

  return finalize(doc);
};

// Positionstabelle für Rechnung
const drawInvoiceTable = (
  doc: jsPDF,
  startY: number,
  rows: Array<{ pos: string; desc: string; amount: number; hint?: string }>
) => {
  const cols = {
    pos: M.left,
    desc: M.left + 14,
    amount: PAGE.w - M.right,
  };

  // Header-Zeile mit Akzent
  setFill(doc, [248, 250, 250]);
  doc.rect(M.left, startY, PAGE.w - M.left - M.right, 7, "F");
  setStroke(doc, TEAL);
  doc.setLineWidth(0.4);
  doc.line(M.left, startY + 7, PAGE.w - M.right, startY + 7);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  setColor(doc, INK);
  doc.text("Pos.", cols.pos, startY + 4.8);
  doc.text("Bezeichnung", cols.desc, startY + 4.8);
  doc.text("Betrag", cols.amount, startY + 4.8, { align: "right" });

  // Datenzeilen
  doc.setFont("helvetica", "normal");
  let y = startY + 12;
  for (const r of rows) {
    doc.setFontSize(10);
    setColor(doc, INK);
    doc.text(r.pos, cols.pos, y);
    const descLines = doc.splitTextToSize(r.desc, 110);
    doc.text(descLines, cols.desc, y, { lineHeightFactor: 1.45 });
    doc.text(fmtEur(r.amount), cols.amount, y, { align: "right" });
    if (r.hint) {
      doc.setFontSize(7);
      setColor(doc, GRAY_60);
      doc.text(r.hint, cols.desc, y + descLines.length * 4.7);
    }
    y += descLines.length * 4.7 + (r.hint ? 5 : 4) + 4;
    setStroke(doc, GRAY_15);
    doc.setLineWidth(0.1);
    doc.line(M.left, y - 2, PAGE.w - M.right, y - 2);
  }
};

// Summen-Block rechts
const drawTotalsBlock = (doc: jsPDF, startY: number, total: number) => {
  const labelX = PAGE.w - M.right - 60;
  const valueX = PAGE.w - M.right;

  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  setColor(doc, INK);
  doc.text("Gesamtbetrag", labelX, startY);
  setColor(doc, TEAL);
  doc.setFontSize(14);
  doc.text(fmtEur(total), valueX, startY, { align: "right" });

  // Akzent-Linie unter Total
  setStroke(doc, TEAL);
  doc.setLineWidth(0.6);
  doc.line(labelX, startY + 2.5, valueX, startY + 2.5);
};

// ============================================
// 3) ZEUGENFRAGEBOGEN AN BEHÖRDE
// ============================================
export const generateQuestionnairePdf = (
  org: Organization,
  ticket: Ticket,
  contract: Contract | null
): Uint8Array => {
  const doc = newDoc();
  const renterName = contract?.renter_name || ticket.renter_name || "—";
  const renterBirthday = contract?.renter_birthday || "—";
  const renterAddress = contract?.renter_address || "—";

  drawLetterFrame(
    doc,
    org,
    [ticket.authority || "Zuständige Bußgeldstelle", "", ""],
    {
      ihrZeichen: ticket.reference_nr || undefined,
      unserZeichen: ticket.ticket_nr,
      telefon: org.phone || undefined,
      datum: new Date().toLocaleDateString("de-DE"),
    }
  );

  drawSubject(
    doc,
    `Fahrerermittlung — Aktenzeichen ${ticket.reference_nr || ticket.ticket_nr} — Kennzeichen ${
      ticket.plate ?? ""
    }`
  );

  const tatzeit = `${fmtDate(ticket.offense_date)}${
    ticket.offense_time ? ", " + ticket.offense_time + " Uhr" : ""
  }`;

  const paragraphs: string[] = [
    `wir nehmen Bezug auf den Anhörungsbogen zum oben genannten Aktenzeichen.`,
    `Das Fahrzeug mit dem amtlichen Kennzeichen ${ticket.plate || "—"} wurde zum Tatzeitpunkt (${tatzeit}, Tatort ${
      ticket.location || "—"
    }) im Rahmen eines Mietvertrags an folgende Person überlassen:`,
  ];

  let y = drawBody(doc, `Sehr geehrte Damen und Herren,`, paragraphs);

  // Datentabelle direkt nach Body
  const rows = [
    ["Name", renterName, true],
    ["Anschrift", renterAddress, false],
    ["Geburtsdatum", renterBirthday, false],
    contract?.renter_license_nr ? ["Führerschein-Nr.", contract.renter_license_nr, false] : null,
    contract?.contract_nr ? ["Mietvertrag-Nr.", contract.contract_nr, false] : null,
    contract
      ? [
          "Mietzeitraum",
          `${fmtDate(contract.pickup_date)} – ${fmtDate(contract.actual_return_date || contract.return_date)}`,
          false,
        ]
      : null,
  ].filter(Boolean) as Array<[string, string, boolean]>;
  drawDataBlock(doc, y + 2, rows);
  y = y + 2 + rows.length * 6.8 + 4;

  // Schlusssatz
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  setColor(doc, INK);
  const closingPara = doc.splitTextToSize(
    `Wir bitten höflich, sämtliche weitere Korrespondenz und das Bußgeldverfahren direkt an die oben genannte Person zu richten. Auf den beigefügten Zeugenfragebogen verweisen wir.`,
    PAGE.w - M.left - M.right
  );
  doc.text(closingPara, M.left, y, { lineHeightFactor: 1.5 });
  y += closingPara.length * 5.2 + 4.5;

  drawSignature(doc, y + 4, "Mit freundlichen Grüßen", org.name);
  return finalize(doc);
};

// Datentabelle (Schlüssel/Wert) mit linker Akzentlinie
const drawDataBlock = (doc: jsPDF, startY: number, rows: Array<[string, string, boolean]>) => {
  setStroke(doc, TEAL);
  doc.setLineWidth(0.6);
  doc.line(M.left, startY, M.left, startY + rows.length * 6.8);

  let y = startY + 4.5;
  for (const [k, v, bold] of rows) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    setColor(doc, GRAY_60);
    doc.text(k, M.left + 3, y);
    doc.setFont(bold ? "helvetica" : "helvetica", bold ? "bold" : "normal");
    doc.setFontSize(11);
    setColor(doc, INK);
    doc.text(v, M.left + 38, y);
    y += 6.8;
  }
};

import { jsPDF } from "jspdf";
import type { Contract, Organization, Ticket } from "./types";
import { fmtDate, fmtEur } from "./utils";

const setupDoc = (doc: jsPDF) => {
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
};

const drawHeader = (doc: jsPDF, org: Organization) => {
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.setTextColor(13, 148, 136);
  doc.text(org.name, 20, 22);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(100);
  const lines = [
    org.street || "",
    [org.zip, org.city].filter(Boolean).join(" "),
    org.phone ? "Tel.: " + org.phone : "",
    org.email ? "E-Mail: " + org.email : "",
  ].filter(Boolean);
  doc.text(lines, 20, 28, { lineHeightFactor: 1.4 });
  doc.setTextColor(0);
};

const drawFooter = (doc: jsPDF, org: Organization) => {
  const w = doc.internal.pageSize.getWidth();
  const h = doc.internal.pageSize.getHeight();
  doc.setFontSize(8);
  doc.setTextColor(150);
  const footer = [
    org.name,
    org.tax_number ? "USt-IdNr.: " + org.tax_number : "",
    "Erstellt mit Knöllchen-Pilot",
  ]
    .filter(Boolean)
    .join("  ·  ");
  doc.text(footer, w / 2, h - 12, { align: "center" });
  doc.setTextColor(0);
};

const drawAddress = (doc: jsPDF, lines: string[]) => {
  doc.setFontSize(10);
  doc.text(lines, 20, 60, { lineHeightFactor: 1.4 });
};

const drawDateLine = (doc: jsPDF, city: string | null) => {
  const w = doc.internal.pageSize.getWidth();
  const today = new Date().toLocaleDateString("de-DE");
  doc.setFontSize(10);
  doc.text(`${city || ""}, ${today}`, w - 20, 90, { align: "right" });
};

const drawSubject = (doc: jsPDF, subject: string) => {
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text(subject, 20, 105);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
};

const drawParagraphs = (doc: jsPDF, paragraphs: string[], startY = 118): number => {
  let y = startY;
  const w = doc.internal.pageSize.getWidth() - 40;
  for (const p of paragraphs) {
    const lines = doc.splitTextToSize(p, w);
    doc.text(lines, 20, y, { lineHeightFactor: 1.5 });
    y += lines.length * 5 + 4;
  }
  return y;
};

export const generateLetterPdf = (
  org: Organization,
  ticket: Ticket,
  contract: Contract | null
): Uint8Array => {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  setupDoc(doc);
  drawHeader(doc, org);

  const renterName = contract?.renter_name || ticket.renter_name || "[Mieter:in]";
  const addressLines = [renterName, contract?.renter_address || "", ""].filter(Boolean);
  drawAddress(doc, addressLines);
  drawDateLine(doc, org.city);
  drawSubject(
    doc,
    `Strafzettel Aktenzeichen ${ticket.reference_nr || ticket.ticket_nr} — Weiterbelastung`
  );

  const total = (ticket.fine_amount || 0) + Number(ticket.processing_fee || 0);

  drawParagraphs(doc, [
    `Sehr geehrte:r ${renterName.split(" ").slice(-1)[0] || ""},`,
    `gegen das von Ihnen am ${fmtDate(ticket.offense_date)}${
      ticket.offense_time ? " um " + ticket.offense_time + " Uhr" : ""
    } gemietete Fahrzeug mit dem Kennzeichen ${ticket.plate || "—"} liegt uns ein Vorgang der ${
      ticket.authority || "zuständigen Behörde"
    } vor.${contract ? ` Mietvertrag-Nr. ${contract.contract_nr}.` : ""}`,
    `Tatvorwurf: ${ticket.offense || "—"}${ticket.offense_details ? " — " + ticket.offense_details : ""}`,
    `Tatort: ${ticket.location || "—"}`,
    `Da Sie zum Tatzeitpunkt verantwortliche:r Fahrzeugführer:in waren, leiten wir Ihre Daten an die Behörde weiter und stellen Ihnen die Bearbeitungsgebühr in Rechnung.`,
    `Bußgeld:                          ${fmtEur(ticket.fine_amount)}`,
    `Bearbeitungsgebühr:    ${fmtEur(Number(ticket.processing_fee))}`,
    `Gesamtbetrag:                ${fmtEur(total)}`,
    `Bitte überweisen Sie den Betrag innerhalb von 14 Tagen unter Angabe der Vorgangsnummer ${ticket.ticket_nr}.`,
    `Mit freundlichen Grüßen`,
    org.name,
  ]);

  drawFooter(doc, org);
  return new Uint8Array(doc.output("arraybuffer"));
};

export const generateInvoicePdf = (
  org: Organization,
  ticket: Ticket,
  contract: Contract | null
): Uint8Array => {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  setupDoc(doc);
  drawHeader(doc, org);

  const renterName = contract?.renter_name || ticket.renter_name || "[Mieter:in]";
  drawAddress(doc, [renterName, contract?.renter_address || ""].filter(Boolean));
  drawDateLine(doc, org.city);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text("Rechnung", 20, 105);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);

  doc.text(`Rechnungsnummer: ${ticket.ticket_nr}`, 20, 115);
  doc.text(`Vorgang: ${ticket.reference_nr || "—"}`, 20, 121);
  if (contract) doc.text(`Mietvertrag: ${contract.contract_nr}`, 20, 127);

  const fine = ticket.fine_amount || 0;
  const fee = Number(ticket.processing_fee || 0);
  const total = fine + fee;

  let y = contract ? 146 : 140;
  doc.setFont("helvetica", "bold");
  doc.text("Position", 20, y);
  doc.text("Betrag", 180, y, { align: "right" });
  doc.setFont("helvetica", "normal");
  y += 3;
  doc.line(20, y, 190, y);
  y += 8;

  doc.text(`Bußgeld (${ticket.offense || "Verstoß"})`, 20, y);
  doc.text(fmtEur(fine), 180, y, { align: "right" });
  y += 7;
  doc.text(`Bearbeitungsgebühr ${org.name}`, 20, y);
  doc.text(fmtEur(fee), 180, y, { align: "right" });
  y += 4;
  doc.line(20, y, 190, y);
  y += 8;
  doc.setFont("helvetica", "bold");
  doc.text("Gesamtbetrag", 20, y);
  doc.text(fmtEur(total), 180, y, { align: "right" });
  doc.setFont("helvetica", "normal");

  y += 18;
  doc.setFontSize(9);
  doc.setTextColor(100);
  const w = doc.internal.pageSize.getWidth() - 40;
  const note = doc.splitTextToSize(
    `Diese Rechnung umfasst das von der Behörde geforderte Bußgeld sowie die Bearbeitungsgebühr nach Mietvertrag. Die Bearbeitungsgebühr ist gemäß § 4 Nr. 8a UStG umsatzsteuerfrei.`,
    w
  );
  doc.text(note, 20, y, { lineHeightFactor: 1.5 });

  doc.setTextColor(0);
  drawFooter(doc, org);
  return new Uint8Array(doc.output("arraybuffer"));
};

export const generateQuestionnairePdf = (
  org: Organization,
  ticket: Ticket,
  contract: Contract | null
): Uint8Array => {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  setupDoc(doc);
  drawHeader(doc, org);

  drawAddress(doc, [ticket.authority || "Zuständige Behörde", "", ""]);
  drawDateLine(doc, org.city);
  drawSubject(
    doc,
    `Antwort Zeugenfragebogen — Aktenzeichen ${ticket.reference_nr || ticket.ticket_nr}`
  );

  const renterName = contract?.renter_name || ticket.renter_name || "—";
  const renterBirthday = contract?.renter_birthday || "—";
  const renterAddress = contract?.renter_address || "—";
  const renterLicense = contract?.renter_license_nr || "—";

  drawParagraphs(doc, [
    `Sehr geehrte Damen und Herren,`,
    `bezugnehmend auf Ihren Anhörungsbogen vom ${fmtDate(ticket.offense_date)} (Tatzeit ${
      ticket.offense_time || "—"
    } Uhr, Tatort ${ticket.location || "—"}, Kennzeichen ${ticket.plate || "—"}) teilen wir mit, dass das Fahrzeug zum Tatzeitpunkt im Rahmen eines Mietvertrags vermietet war.`,
    contract ? `Mietvertrag-Nr.: ${contract.contract_nr}` : `Mietvertrag-Nr.: —`,
    `Verantwortliche:r Fahrzeugführer:in zum Tatzeitpunkt:`,
    `Name:                          ${renterName}`,
    `Geburtsdatum:           ${renterBirthday}`,
    `Anschrift:                     ${renterAddress}`,
    `Führerschein-Nr.:      ${renterLicense}`,
    `Mietzeitraum:            ${fmtDate(contract?.pickup_date)} – ${fmtDate(contract?.actual_return_date || contract?.return_date)}`,
    `Wir bitten, sämtliche weitere Korrespondenz und das Bußgeldverfahren direkt an die oben genannte Person zu richten.`,
    `Mit freundlichen Grüßen`,
    org.name,
  ]);

  drawFooter(doc, org);
  return new Uint8Array(doc.output("arraybuffer"));
};

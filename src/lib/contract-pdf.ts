import { jsPDF } from "jspdf";
import type { Contract, Customer, Organization, Vehicle } from "./types";
import { fmtDate, fmtEur } from "./utils";
import { DEFAULT_RENTAL_TERMS } from "./rental-terms";

// =====================================================
// Layout-Konstanten (mm)
// =====================================================
const PAGE = { w: 210, h: 297 };
const M = { left: 22, right: 18, top: 18, bottom: 18 };
const TEAL: [number, number, number] = [13, 148, 136];
const INK: [number, number, number] = [38, 38, 36];
const GRAY: [number, number, number] = [120, 120, 116];
const LIGHT: [number, number, number] = [225, 225, 222];

const setColor = (doc: jsPDF, c: [number, number, number]) =>
  doc.setTextColor(c[0], c[1], c[2]);
const setDraw = (doc: jsPDF, c: [number, number, number]) =>
  doc.setDrawColor(c[0], c[1], c[2]);

const newDoc = (): jsPDF => {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  doc.setFont("helvetica", "normal");
  return doc;
};

// =====================================================
// Header (auf jeder Seite)
// =====================================================
const drawHeader = (doc: jsPDF, org: Organization, contractNr: string) => {
  setColor(doc, TEAL);
  doc.setFontSize(13);
  doc.setFont("helvetica", "bold");
  doc.text(org.name, M.left, M.top);

  setColor(doc, GRAY);
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  const sub = [
    [org.street, `${org.zip ?? ""} ${org.city ?? ""}`.trim()].filter(Boolean).join(" · "),
    [org.phone, org.email, org.tax_number ? `USt-IdNr. ${org.tax_number}` : null]
      .filter(Boolean)
      .join(" · "),
  ];
  let y = M.top + 5;
  for (const line of sub) {
    if (line) {
      doc.text(line, M.left, y);
      y += 4;
    }
  }

  setColor(doc, GRAY);
  doc.setFontSize(8);
  doc.text(`Mietvertrag ${contractNr}`, PAGE.w - M.right, M.top, { align: "right" });

  setDraw(doc, LIGHT);
  doc.setLineWidth(0.3);
  doc.line(M.left, y + 2, PAGE.w - M.right, y + 2);

  return y + 6;
};

// =====================================================
// Footer (auf jeder Seite)
// =====================================================
const drawFooter = (doc: jsPDF, org: Organization, page: number, total: number) => {
  setColor(doc, GRAY);
  doc.setFontSize(7.5);
  doc.text(
    `${org.name} · ${org.street ?? ""} · ${org.zip ?? ""} ${org.city ?? ""}`.trim(),
    M.left,
    PAGE.h - 10
  );
  doc.text(`Seite ${page} von ${total}`, PAGE.w - M.right, PAGE.h - 10, {
    align: "right",
  });
};

// =====================================================
// Helper: Box mit Label/Value-Reihen
// =====================================================
type Row = [string, string];

const drawSectionBox = (
  doc: jsPDF,
  title: string,
  rows: Row[],
  startY: number,
  columns = 2
): number => {
  const headerH = 7;
  const rowH = 5.2;
  const lineCount = Math.ceil(rows.length / columns);
  const boxH = headerH + lineCount * rowH + 4;

  setDraw(doc, LIGHT);
  doc.setLineWidth(0.3);
  doc.roundedRect(M.left, startY, PAGE.w - M.left - M.right, boxH, 2, 2);

  setColor(doc, TEAL);
  doc.setFontSize(8.5);
  doc.setFont("helvetica", "bold");
  doc.text(title.toUpperCase(), M.left + 3, startY + 5);

  doc.setFont("helvetica", "normal");
  const colW = (PAGE.w - M.left - M.right) / columns;

  rows.forEach((row, i) => {
    const col = i % columns;
    const line = Math.floor(i / columns);
    const x = M.left + 3 + col * colW;
    const ry = startY + headerH + 4 + line * rowH;

    setColor(doc, GRAY);
    doc.setFontSize(7.5);
    doc.text(row[0], x, ry);

    setColor(doc, INK);
    doc.setFontSize(9.5);
    doc.setFont("helvetica", "bold");
    doc.text(row[1] || "—", x, ry + 3.4);
    doc.setFont("helvetica", "normal");
  });

  return startY + boxH + 4;
};

// =====================================================
// Computed values
// =====================================================
const computeDays = (pickup: string, returnDate: string): number => {
  const a = new Date(pickup);
  const b = new Date(returnDate);
  if (isNaN(a.getTime()) || isNaN(b.getTime())) return 0;
  const ms = b.setHours(0, 0, 0, 0) - a.setHours(0, 0, 0, 0);
  return Math.max(1, Math.ceil(ms / 86_400_000));
};

const customerName = (c: Customer | null, fallback: string) => {
  if (!c) return fallback;
  return [c.first_name, c.last_name].filter(Boolean).join(" ") || fallback;
};

const customerAddress = (c: Customer | null, fallback: string | null) => {
  if (!c) return fallback ?? "—";
  const street = [c.street, c.house_nr].filter(Boolean).join(" ");
  const cityLine = [c.zip, c.city].filter(Boolean).join(" ");
  return [street, cityLine].filter(Boolean).join(", ") || fallback || "—";
};

const vehicleLabel = (v: Vehicle | null, fallback: string | null) => {
  if (v) {
    const make = [v.manufacturer, v.model].filter(Boolean).join(" ");
    if (make) return make;
    if (v.vehicle_type) return v.vehicle_type;
  }
  return fallback ?? "Fahrzeug";
};

// =====================================================
// Seite 1: Vertragsdaten
// =====================================================
const drawPage1 = (
  doc: jsPDF,
  org: Organization,
  contract: Contract,
  customer: Customer | null,
  vehicle: Vehicle | null
) => {
  let y = drawHeader(doc, org, contract.contract_nr);

  setColor(doc, INK);
  doc.setFontSize(20);
  doc.setFont("helvetica", "bold");
  doc.text("Mietvertrag Kraftfahrzeug", M.left, y + 8);

  setColor(doc, GRAY);
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text(
    `Vertragsnummer: ${contract.contract_nr}    ·    Erstellt am ${fmtDate(
      new Date().toISOString()
    )}`,
    M.left,
    y + 14
  );

  y += 22;

  // Vermieter
  y = drawSectionBox(
    doc,
    "Vermieter",
    [
      ["Firma", org.name],
      ["E-Mail", org.email ?? ""],
      ["Anschrift", `${org.street ?? ""}, ${org.zip ?? ""} ${org.city ?? ""}`.trim()],
      ["Telefon", org.phone ?? ""],
      ["Steuernummer / USt-IdNr.", org.tax_number ?? ""],
      ["", ""],
    ],
    y
  );

  // Mieter
  const renterName = customerName(customer, contract.renter_name);
  y = drawSectionBox(
    doc,
    "Mieter / Fahrer",
    [
      ["Name", renterName],
      ["E-Mail", customer?.email ?? contract.renter_email ?? ""],
      ["Anschrift", customerAddress(customer, contract.renter_address)],
      ["Telefon", customer?.phone ?? contract.renter_phone ?? ""],
      [
        "Geburtsdatum",
        customer?.birthday
          ? fmtDate(customer.birthday)
          : contract.renter_birthday
          ? fmtDate(contract.renter_birthday)
          : "",
      ],
      [
        "Führerschein-Nr.",
        customer?.license_nr ?? contract.renter_license_nr ?? "",
      ],
      [
        "Führerschein-Klasse",
        customer?.license_class ?? contract.renter_license_class ?? "",
      ],
      ["Ausweis-Nr.", customer?.id_card_nr ?? ""],
    ],
    y
  );

  // Fahrzeug
  y = drawSectionBox(
    doc,
    "Mietfahrzeug",
    [
      ["Kennzeichen", contract.plate],
      ["Fahrzeugtyp", vehicleLabel(vehicle, contract.vehicle_type)],
      ["FIN", vehicle?.fin_number ?? ""],
      ["Farbe", vehicle?.color ?? ""],
      ["Erstzulassung", vehicle?.first_registration ? fmtDate(vehicle.first_registration) : ""],
      [
        "Km-Stand bei Übergabe",
        contract.km_pickup != null ? contract.km_pickup.toLocaleString("de-DE") : "",
      ],
    ],
    y
  );

  // Mietzeitraum
  const days = computeDays(contract.pickup_date, contract.return_date);
  y = drawSectionBox(
    doc,
    "Mietzeitraum",
    [
      [
        "Übernahme",
        `${fmtDate(contract.pickup_date)}${
          contract.pickup_time ? ` um ${contract.pickup_time} Uhr` : ""
        }`,
      ],
      [
        "Rückgabe (geplant)",
        `${fmtDate(contract.return_date)}${
          contract.return_time ? ` um ${contract.return_time} Uhr` : ""
        }`,
      ],
      ["Geplante Mietdauer", `${days} ${days === 1 ? "Tag" : "Tage"}`],
      [
        "Inklusivkilometer",
        contract.km_limit != null
          ? `${contract.km_limit.toLocaleString("de-DE")} km`
          : "",
      ],
    ],
    y
  );

  // Kosten
  y = drawSectionBox(
    doc,
    "Kosten und Konditionen",
    [
      ["Tagespreis (brutto)", contract.daily_rate != null ? fmtEur(contract.daily_rate) : ""],
      [
        "Gesamtbetrag (brutto)",
        contract.total_amount != null
          ? fmtEur(contract.total_amount)
          : contract.daily_rate != null
          ? fmtEur(contract.daily_rate * days)
          : "",
      ],
      ["Kaution", contract.deposit != null ? fmtEur(contract.deposit) : ""],
      ["", ""],
    ],
    y
  );

  drawFooter(doc, org, 1, 3);
};

// =====================================================
// Seite 2: AGB / Mietbedingungen
// =====================================================
const drawPage2 = (doc: jsPDF, org: Organization, contract: Contract) => {
  doc.addPage();
  let y = drawHeader(doc, org, contract.contract_nr);

  setColor(doc, INK);
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text("Mietbedingungen", M.left, y + 6);
  y += 14;

  const terms = (org.rental_terms ?? DEFAULT_RENTAL_TERMS).trim();
  const paragraphs = terms.split(/\n\s*\n/);

  setColor(doc, INK);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);

  const colWidth = (PAGE.w - M.left - M.right - 6) / 2; // 2 Spalten mit 6mm Gap
  let col = 0;
  let xCol = M.left;
  let yCol = y;
  const colTop = y;
  const colBottom = PAGE.h - M.bottom - 6;

  for (const para of paragraphs) {
    const lines = para.split("\n");
    if (lines.length === 0) continue;
    const heading = lines[0];
    const rest = lines.slice(1).join(" ").trim();

    // Höhe abschätzen
    doc.setFont("helvetica", "bold");
    const headingLines = doc.splitTextToSize(heading, colWidth) as string[];
    doc.setFont("helvetica", "normal");
    const restLines = rest
      ? (doc.splitTextToSize(rest, colWidth) as string[])
      : [];
    const blockH = (headingLines.length + restLines.length) * 3.4 + 3;

    if (yCol + blockH > colBottom) {
      // nächste Spalte oder neue Seite
      if (col === 0) {
        col = 1;
        xCol = M.left + colWidth + 6;
        yCol = colTop;
      } else {
        // beide Spalten voll → neue Seite
        drawFooter(doc, org, 2, 3);
        doc.addPage();
        const newY = drawHeader(doc, org, contract.contract_nr);
        col = 0;
        xCol = M.left;
        yCol = newY;
      }
    }

    doc.setFont("helvetica", "bold");
    setColor(doc, INK);
    doc.text(headingLines, xCol, yCol);
    yCol += headingLines.length * 3.4 + 0.5;

    if (restLines.length) {
      doc.setFont("helvetica", "normal");
      setColor(doc, INK);
      doc.text(restLines, xCol, yCol, { lineHeightFactor: 1.4 });
      yCol += restLines.length * 3.4;
    }
    yCol += 2;
  }

  drawFooter(doc, org, 2, 3);
};

// =====================================================
// Seite 3: Unterschriften
// =====================================================
const drawPage3 = (
  doc: jsPDF,
  org: Organization,
  contract: Contract,
  customer: Customer | null,
  signaturePngBase64: string | null
) => {
  doc.addPage();
  let y = drawHeader(doc, org, contract.contract_nr);

  setColor(doc, INK);
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text("Bestätigung und Unterschrift", M.left, y + 6);
  y += 16;

  setColor(doc, INK);
  doc.setFontSize(9.5);
  doc.setFont("helvetica", "normal");
  const confirm =
    "Ich bestätige die Richtigkeit der auf Seite 1 angegebenen Daten und akzeptiere " +
    "die in diesem Vertrag (Seite 2) abgedruckten Mietbedingungen. Mir ist bekannt, " +
    "dass die digitale Unterschrift dieselbe Rechtswirkung hat wie eine handschriftliche " +
    "Unterschrift.";
  const confirmLines = doc.splitTextToSize(confirm, PAGE.w - M.left - M.right) as string[];
  doc.text(confirmLines, M.left, y, { lineHeightFactor: 1.45 });
  y += confirmLines.length * 4 + 6;

  // Ort, Datum
  setDraw(doc, GRAY);
  doc.setLineWidth(0.4);
  const fieldW = (PAGE.w - M.left - M.right - 8) / 2;

  // Mieter-Block
  const sigBoxH = 38;
  setColor(doc, GRAY);
  doc.setFontSize(8);
  doc.text("Unterschrift Mieter", M.left, y);

  setDraw(doc, LIGHT);
  doc.roundedRect(M.left, y + 2, fieldW, sigBoxH, 2, 2);

  if (signaturePngBase64) {
    try {
      doc.addImage(
        signaturePngBase64,
        "PNG",
        M.left + 2,
        y + 4,
        fieldW - 4,
        sigBoxH - 4,
        undefined,
        "FAST"
      );
    } catch {
      // ignore — falls die Image-Daten ungültig sind, bleibt das Feld leer
    }
  }

  setColor(doc, INK);
  doc.setFontSize(8.5);
  const renterName = customerName(customer, contract.renter_name);
  doc.text(renterName, M.left, y + 2 + sigBoxH + 5);

  // Vermieter-Block
  const xRight = M.left + fieldW + 8;
  setColor(doc, GRAY);
  doc.setFontSize(8);
  doc.text("Unterschrift Vermieter", xRight, y);

  setDraw(doc, LIGHT);
  doc.roundedRect(xRight, y + 2, fieldW, sigBoxH, 2, 2);

  setColor(doc, INK);
  doc.setFontSize(8.5);
  doc.text(org.name, xRight, y + 2 + sigBoxH + 5);

  // Ort + Datum
  y = y + 2 + sigBoxH + 14;
  setColor(doc, GRAY);
  doc.setFontSize(8);
  const orderLabels = "Ort, Datum";
  doc.text(orderLabels, M.left, y);

  setColor(doc, INK);
  doc.setFontSize(9.5);
  const today = fmtDate(new Date().toISOString());
  doc.text(`${org.city ?? "—"}, ${today}`, M.left, y + 5);

  // Audit-Hinweis
  if (contract.signed_at) {
    setColor(doc, GRAY);
    doc.setFontSize(7.5);
    const audit = `Digital signiert am ${fmtDate(contract.signed_at)} ${
      contract.signed_ip ? `(IP ${contract.signed_ip})` : ""
    }`;
    doc.text(audit, M.left, PAGE.h - M.bottom - 4);
  }

  drawFooter(doc, org, 3, 3);
};

// =====================================================
// Public API
// =====================================================
export const generateContractPdf = (args: {
  org: Organization;
  contract: Contract;
  customer: Customer | null;
  vehicle: Vehicle | null;
  signaturePngBase64?: string | null;
}): ArrayBuffer => {
  const { org, contract, customer, vehicle, signaturePngBase64 } = args;
  const doc = newDoc();
  drawPage1(doc, org, contract, customer, vehicle);
  drawPage2(doc, org, contract);
  drawPage3(doc, org, contract, customer, signaturePngBase64 ?? null);
  return doc.output("arraybuffer");
};

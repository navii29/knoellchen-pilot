import { jsPDF } from "jspdf";
import type {
  Contract,
  ContractInsuranceType,
  ContractPaymentMethod,
  Customer,
  Organization,
  Vehicle,
} from "./types";
import { INSURANCE_TYPE_LABEL, PAYMENT_METHOD_LABEL } from "./types";
import type { VehicleTire } from "./tires";
import { fmtDate, fmtEur } from "./utils";
import { DEFAULT_RENTAL_TERMS } from "./rental-terms";

// =====================================================
// Layout-Konstanten (mm)
// =====================================================
const PAGE = { w: 210, h: 297 };
const M = { left: 18, right: 18, top: 15, bottom: 14 };
const INK: [number, number, number] = [30, 30, 30];
const GRAY: [number, number, number] = [110, 110, 110];
const LIGHT: [number, number, number] = [200, 200, 200];
const ACCENT: [number, number, number] = [13, 148, 136]; // teal
const RED: [number, number, number] = [200, 40, 40];

const setColor = (doc: jsPDF, c: [number, number, number]) =>
  doc.setTextColor(c[0], c[1], c[2]);
const setDraw = (doc: jsPDF, c: [number, number, number]) =>
  doc.setDrawColor(c[0], c[1], c[2]);
const setFill = (doc: jsPDF, c: [number, number, number]) =>
  doc.setFillColor(c[0], c[1], c[2]);

const newDoc = (): jsPDF => {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  doc.setFont("helvetica", "normal");
  return doc;
};

const fmtNum = (v: number | null | undefined): string =>
  v == null ? "" : v.toLocaleString("de-DE");

const today = () => new Date().toISOString();

// =====================================================
// Helpers — Daten
// =====================================================
const customerFullName = (c: Customer | null, fallback: string): string => {
  if (!c) return fallback;
  const parts = [c.title, c.first_name, c.last_name].filter(Boolean);
  return parts.length > 0 ? parts.join(" ") : c.last_name || fallback;
};

const customerStreet = (c: Customer | null, fallback: string | null): string => {
  if (!c) return fallback ?? "";
  return [c.street, c.house_nr].filter(Boolean).join(" ");
};

const vehicleModel = (v: Vehicle | null, fallback: string | null): string => {
  if (v) {
    const make = [v.manufacturer, v.model].filter(Boolean).join(" ");
    if (make) return make;
    if (v.vehicle_type) return v.vehicle_type;
  }
  return fallback ?? "";
};

const computeDays = (pickup: string, returnDate: string): number => {
  const a = new Date(pickup);
  const b = new Date(returnDate);
  if (isNaN(a.getTime()) || isNaN(b.getTime())) return 0;
  const ms = b.setHours(0, 0, 0, 0) - a.setHours(0, 0, 0, 0);
  return Math.max(1, Math.ceil(ms / 86_400_000));
};

const grossToNet = (gross: number): { net: number; vat: number } => {
  const net = Math.round((gross / 1.19) * 100) / 100;
  const vat = Math.round((gross - net) * 100) / 100;
  return { net, vat };
};

const dateTimeLabel = (date: string | null, time: string | null): string => {
  if (!date) return "";
  const d = fmtDate(date);
  return time ? `${d}, ${time} Uhr` : d;
};

// =====================================================
// Helpers — Zeichnen
// =====================================================
const drawLine = (
  doc: jsPDF,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  color: [number, number, number] = LIGHT,
  width = 0.3
) => {
  setDraw(doc, color);
  doc.setLineWidth(width);
  doc.line(x1, y1, x2, y2);
};

const drawCheckbox = (doc: jsPDF, x: number, y: number, size = 3) => {
  setDraw(doc, INK);
  doc.setLineWidth(0.3);
  doc.rect(x, y - size + 0.5, size, size);
};

const drawLabel = (
  doc: jsPDF,
  text: string,
  x: number,
  y: number,
  size = 8,
  color: [number, number, number] = INK
) => {
  doc.setFont("helvetica", "normal");
  doc.setFontSize(size);
  setColor(doc, color);
  doc.text(text, x, y);
};

const drawBold = (
  doc: jsPDF,
  text: string,
  x: number,
  y: number,
  size = 8,
  color: [number, number, number] = INK
) => {
  doc.setFont("helvetica", "bold");
  doc.setFontSize(size);
  setColor(doc, color);
  doc.text(text, x, y);
  doc.setFont("helvetica", "normal");
};

const drawFooterPageNr = (doc: jsPDF, page: number, total: number) => {
  setColor(doc, GRAY);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.text(`${page} / ${total}`, PAGE.w / 2, PAGE.h - 8, { align: "center" });
};

// Aus data:image/...;base64 das Format ableiten — jsPDF kann nur PNG/JPEG.
// SVG kann jsPDF nicht rendern → Text-Fallback.
const detectImageFormat = (
  dataUri: string | null
): "PNG" | "JPEG" | null => {
  if (!dataUri) return null;
  if (dataUri.startsWith("data:image/png")) return "PNG";
  if (dataUri.startsWith("data:image/jpeg")) return "JPEG";
  if (dataUri.startsWith("data:image/jpg")) return "JPEG";
  return null;
};

// Logo-Header (zentriert, fett) — fällt auf Text zurück wenn kein Bild da
const drawLogo = (
  doc: jsPDF,
  org: Organization,
  logoDataUri: string | null,
  y = M.top,
  width = 60
) => {
  const format = detectImageFormat(logoDataUri);
  if (logoDataUri && format) {
    try {
      // Aspect ratio ~3.5:1 ist üblich; Höhe ergibt sich
      const h = width / 3.5;
      doc.addImage(
        logoDataUri,
        format,
        (PAGE.w - width) / 2,
        y,
        width,
        h,
        undefined,
        "FAST"
      );
      return y + h + 4;
    } catch {
      // Bild ungültig → Fallback auf Text
    }
  }
  setColor(doc, ACCENT);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.text(org.name, PAGE.w / 2, y + 8, { align: "center" });
  doc.setFont("helvetica", "normal");
  return y + 14;
};

// =====================================================
// Form-Reihe (Label links, Wert rechts auf gleicher Linie)
// =====================================================
// `rightValue` sitzt — falls gesetzt — rechtsbündig in derselben Zeile
// (für Konstruktionen wie "Haftpflicht, TK + VK     2.500,00 € SB").
type FormRow = { label: string; value: string; rightValue?: string };

const drawFormRows = (
  doc: jsPDF,
  rows: FormRow[],
  startX: number,
  startY: number,
  labelW: number,
  valueW: number,
  rowH: number,
  labelSize = 8,
  valueSize = 8.5
): number => {
  let y = startY;
  const rightX = startX + labelW + valueW;
  for (const r of rows) {
    drawLabel(doc, r.label, startX, y, labelSize, INK);
    if (r.value || r.rightValue) {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(valueSize);
      setColor(doc, INK);
      // Wert ggf. umbrechen (nur wenn keine rechte Spalte — sonst halbe Breite)
      const effValueW = r.rightValue ? valueW * 0.55 : valueW;
      const lines = r.value
        ? (doc.splitTextToSize(r.value, effValueW) as string[])
        : [];
      if (lines.length) doc.text(lines, startX + labelW, y);
      if (r.rightValue) {
        doc.text(r.rightValue, rightX, y, { align: "right" });
      }
      y += Math.max(rowH, lines.length * (rowH - 0.5));
    } else {
      y += rowH;
    }
  }
  return y;
};

// Section-Gap
const sectionGap = (y: number, gap = 3): number => y + gap;

// =====================================================
// Seite 1 — Vertragsdaten
// =====================================================
const drawPage1 = (
  doc: jsPDF,
  org: Organization,
  contract: Contract,
  customer: Customer | null,
  vehicle: Vehicle | null,
  logoPngBase64: string | null
) => {
  // Logo oben
  drawLogo(doc, org, logoPngBase64, M.top, 55);

  // Vertragsnummer + Datum rechts
  const dateStr = fmtDate(today());
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  setColor(doc, INK);
  doc.text("Mietvertrag-Nr.:", M.left, 42);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text(`${contract.contract_nr} / ${dateStr}`, M.left + 38, 42);

  // Subtitle
  drawLabel(doc, "Langzeitmiete/Dauermiete/Langzeitüberlassung", M.left, 48, 9);

  // ===== Form rows =====
  const labelW = 50;
  const valueW = PAGE.w - M.left - M.right - labelW - 2;
  const rowH = 4.4;
  let y = 56;

  const fullName = customerFullName(customer, contract.renter_name);
  const street = customerStreet(customer, contract.renter_address);
  const zip = customer?.zip ?? "";
  const city = customer?.city ?? "";
  const country = customer?.country ?? "";
  const phone = customer?.phone ?? contract.renter_phone ?? "";
  const email = customer?.email ?? contract.renter_email ?? "";
  const license = customer?.license_nr ?? contract.renter_license_nr ?? "";
  const idCard = customer?.id_card_nr ?? "";

  // Mieter
  y = drawFormRows(
    doc,
    [
      { label: "Mieter - Name, Vorname:", value: fullName },
      { label: "Straße:", value: street },
      { label: "Postleitzahl:", value: zip },
      { label: "Ort:", value: city },
      { label: "Land:", value: country },
      { label: "Telefonnummer:", value: phone },
      { label: "E-Mail:", value: email },
    ],
    M.left,
    y,
    labelW,
    valueW,
    rowH
  );
  y = sectionGap(y);

  // Fahrer
  y = drawFormRows(
    doc,
    [
      { label: "Fahrer:", value: fullName },
      { label: "Führerschein-Nr.:", value: license },
      { label: "Ausweisnummer:", value: idCard },
      { label: "Fahrer 2:", value: contract.driver2_name ?? "" },
      { label: "Führerschein-Nr. Fahrer 2:", value: contract.driver2_license ?? "" },
    ],
    M.left,
    y,
    labelW,
    valueW,
    rowH
  );
  y = sectionGap(y);

  // Fahrzeug
  y = drawFormRows(
    doc,
    [
      { label: "Mietobjekt:", value: vehicleModel(vehicle, contract.vehicle_type) },
      {
        label: "Leistung:",
        value: vehicle?.power_ps != null ? `${vehicle.power_ps} PS` : "",
      },
      { label: "Treibstoff:", value: vehicle?.fuel_type ?? "" },
      { label: "FIN:", value: vehicle?.fin_number ?? "" },
      { label: "Amtl. Kennzeichen:", value: contract.plate },
      { label: "Zubehör:", value: vehicle?.accessories ?? "" },
    ],
    M.left,
    y,
    labelW,
    valueW,
    rowH
  );
  y = sectionGap(y);

  // Übergabe
  const days = computeDays(contract.pickup_date, contract.return_date);
  const kmInclusive =
    contract.km_limit ??
    (vehicle?.inclusive_km_month
      ? Math.round((vehicle.inclusive_km_month * days) / 30)
      : null);
  const returnLocation =
    [org.street, [org.zip, org.city].filter(Boolean).join(" ")]
      .filter(Boolean)
      .join(", ") || "Vermieter-Adresse";

  y = drawFormRows(
    doc,
    [
      {
        label: "Lieferkosten:",
        value: fmtEur(Number(contract.delivery_cost ?? 0)),
      },
      {
        label: "Abholkosten:",
        value: fmtEur(Number(contract.pickup_cost ?? 0)),
      },
      {
        label: "Fahrzeugschlüssel:",
        value: `${contract.keys_count ?? 1} Fahrzeugschlüssel`,
      },
      {
        label: "Schäden bei Übergabe:",
        value: contract.damages_at_handover ?? "Keine",
      },
      {
        label: "KM-Stand bei Übergabe:",
        value:
          contract.km_pickup != null ? `${fmtNum(contract.km_pickup)} Km` : "",
      },
      {
        label: "Tankfüllstand bei Übergabe:",
        value: contract.fuel_level_pickup ?? "",
      },
      {
        label: "Übergabe an Mieter:",
        value: dateTimeLabel(contract.pickup_date, contract.pickup_time),
      },
      {
        label: "Mietdauer:",
        value: `${days} ${days === 1 ? "Tag" : "Tage"}`,
      },
      {
        label: "Rückgabe an Vermieter:",
        value: dateTimeLabel(contract.return_date, contract.return_time),
      },
      { label: "Rückgabeort:", value: returnLocation },
      {
        label: "Vereinbarte Laufleistung / KM:",
        value: kmInclusive != null ? `${fmtNum(kmInclusive)} Km` : "",
      },
    ],
    M.left,
    y,
    labelW,
    valueW,
    rowH
  );
  y = sectionGap(y);

  // Preise
  const gross =
    contract.total_amount != null
      ? Number(contract.total_amount)
      : contract.daily_rate != null
      ? Number(contract.daily_rate) * days
      : 0;
  const { net: priceNet, vat: priceVat } = grossToNet(gross);
  const paymentLabel =
    contract.payment_method != null
      ? PAYMENT_METHOD_LABEL[contract.payment_method as ContractPaymentMethod]
      : "—";
  const insLabelBase =
    contract.insurance_type != null
      ? INSURANCE_TYPE_LABEL[contract.insurance_type as ContractInsuranceType]
      : INSURANCE_TYPE_LABEL.full;
  const insRight =
    contract.insurance_deductible != null
      ? `${fmtEur(Number(contract.insurance_deductible))} SB`
      : undefined;

  drawFormRows(
    doc,
    [
      {
        label: "Vertragsbedingungen:",
        value: `AGB vom ${dateStr}`,
      },
      {
        label: "Preis Zusatztage:",
        value: contract.daily_rate != null ? fmtEur(Number(contract.daily_rate)) : "",
      },
      {
        label: "Sondervereinbarungen:",
        value: contract.special_terms ?? "—",
      },
      {
        label: "Einzelmietpreis netto:",
        value: gross > 0 ? fmtEur(priceNet) : "",
      },
      {
        label: "zzgl. 19% MwSt.:",
        value: gross > 0 ? fmtEur(priceVat) : "",
      },
      {
        label: "Einzelmietpreis brutto:",
        value: gross > 0 ? fmtEur(gross) : "",
      },
      { label: "Zahlungsart:", value: paymentLabel },
      {
        label: "Kaution:",
        value: contract.deposit != null ? fmtEur(Number(contract.deposit)) : "",
      },
      { label: "Versicherung:", value: insLabelBase, rightValue: insRight },
      {
        label: "Preis Mehrkilometer in Euro:",
        value:
          vehicle?.extra_km_price != null
            ? fmtEur(Number(vehicle.extra_km_price))
            : "",
      },
    ],
    M.left,
    y,
    labelW,
    valueW,
    rowH
  );

  // Unterschriften unten
  const sigY = PAGE.h - M.bottom - 30;
  const sigW = (PAGE.w - M.left - M.right - 10) / 2;
  const xLeft = M.left;
  const xRight = M.left + sigW + 10;

  // Ort, Datum über Linie (zentriert)
  const cityLabel = org.city?.trim();
  const cityDate = cityLabel ? `${cityLabel}, ${dateStr}` : dateStr;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  setColor(doc, INK);
  doc.text(cityDate, xLeft + sigW / 2, sigY - 2, { align: "center" });
  doc.text(cityDate, xRight + sigW / 2, sigY - 2, { align: "center" });
  drawLine(doc, xLeft, sigY, xLeft + sigW, sigY, GRAY, 0.4);
  drawLine(doc, xRight, sigY, xRight + sigW, sigY, GRAY, 0.4);
  drawLabel(doc, fullName, xLeft, sigY + 4, 8);
  drawLabel(doc, `Vermieter - ${org.name}`, xRight, sigY + 4, 8);

  drawFooterPageNr(doc, 1, 6);
};

// =====================================================
// Seite 2 — AGB (nur Mietbedingungen, 2-Spalten)
// =====================================================
const drawPageAGB = (
  doc: jsPDF,
  org: Organization,
  totalPages: number
) => {
  doc.addPage();
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  setColor(doc, INK);
  doc.text(
    `ALLGEMEINE VERMIETBEDINGUNGEN ${org.name}`,
    PAGE.w / 2,
    M.top + 5,
    { align: "center" }
  );
  doc.setFont("helvetica", "normal");

  const terms = (org.rental_terms ?? DEFAULT_RENTAL_TERMS).trim();
  const paragraphs = terms.split(/\n\s*\n/);

  const gap = 5;
  const colW = (PAGE.w - M.left - M.right - gap) / 2;
  const colTop = M.top + 14;
  const colBottom = PAGE.h - M.bottom - 6;
  const lineH = 3.1;

  doc.setFontSize(7.5);
  setColor(doc, INK);

  // Erst Höhen aller Blöcke vorberechnen, dann balanced auf 2 Spalten verteilen
  type Block = { heading: string[]; rest: string[]; h: number };
  const blocks: Block[] = [];
  let totalH = 0;
  for (const para of paragraphs) {
    const lines = para.split("\n");
    const heading = lines[0];
    const rest = lines.slice(1).join(" ").trim();

    doc.setFont("helvetica", "bold");
    const headingLines = doc.splitTextToSize(heading, colW) as string[];
    doc.setFont("helvetica", "normal");
    const restLines = rest ? (doc.splitTextToSize(rest, colW) as string[]) : [];
    const h = (headingLines.length + restLines.length) * lineH + 2;
    blocks.push({ heading: headingLines, rest: restLines, h });
    totalH += h;
  }

  // Bruchstelle finden: ersten Block, ab dem die linke Spalte über die Hälfte
  // läuft (geringfügig links lastig akzeptieren).
  const target = totalH / 2;
  let accumulated = 0;
  let splitAt = blocks.length;
  for (let i = 0; i < blocks.length; i++) {
    if (accumulated + blocks[i].h / 2 >= target) {
      splitAt = i;
      break;
    }
    accumulated += blocks[i].h;
  }

  const renderColumn = (start: number, end: number, xCol: number) => {
    let yCol = colTop;
    for (let i = start; i < end; i++) {
      const b = blocks[i];
      if (yCol + b.h > colBottom) break;
      doc.setFont("helvetica", "bold");
      doc.text(b.heading, xCol, yCol);
      yCol += b.heading.length * lineH;
      if (b.rest.length) {
        doc.setFont("helvetica", "normal");
        doc.text(b.rest, xCol, yCol);
        yCol += b.rest.length * lineH;
      }
      yCol += 2;
    }
  };

  renderColumn(0, splitAt, M.left);
  renderColumn(splitAt, blocks.length, M.left + colW + gap);

  drawFooterPageNr(doc, 2, totalPages);
};

// =====================================================
// Seite 3 — Sondervereinbarungen + nummerierte Standard-Liste
// =====================================================
const drawPageSpecialTerms = (
  doc: jsPDF,
  org: Organization,
  contract: Contract,
  totalPages: number
) => {
  doc.addPage();
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  setColor(doc, INK);
  doc.text(
    `ALLGEMEINE VERMIETBEDINGUNGEN ${org.name}`,
    PAGE.w / 2,
    M.top + 5,
    { align: "center" }
  );
  doc.setFont("helvetica", "normal");

  const gap = 5;
  const colW = (PAGE.w - M.left - M.right - gap) / 2;
  const colTop = M.top + 14;
  const sigArea = 30;
  const colBottom = PAGE.h - M.bottom - sigArea;

  // Linke Spalte: Sondervereinbarungen
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  setColor(doc, INK);
  doc.text("Sondervereinbarungen:", M.left, colTop);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  const specText = contract.special_terms?.trim() || "—";
  const specLines = doc.splitTextToSize(specText, colW) as string[];
  doc.text(specLines, M.left, colTop + 6);

  // Rechte Spalte: nummerierte Standard-Liste
  const xR = M.left + colW + gap;
  let yR = colTop;
  doc.setFontSize(7.5);
  for (let i = 0; i < STANDARD_SPECIAL_TERMS.length; i++) {
    const text = `${i + 1}. ${STANDARD_SPECIAL_TERMS[i]}`;
    const lines = doc.splitTextToSize(text, colW) as string[];
    const h = lines.length * 3.1 + 0.5;
    if (yR + h > colBottom) break;
    doc.text(lines, xR, yR);
    yR += h;
  }

  // Unterschriften unten
  const sigY = PAGE.h - M.bottom - 15;
  const sigW = (PAGE.w - M.left - M.right - 10) / 2;
  const xL = M.left;
  const xRSig = M.left + sigW + 10;
  const dateStr = fmtDate(today());
  const cityLabel = org.city?.trim();
  const cityDate = cityLabel ? `${cityLabel}, ${dateStr}` : dateStr;

  drawLabel(doc, cityDate, xL, sigY - 3, 9);
  drawLabel(doc, cityDate, xRSig, sigY - 3, 9);
  drawLine(doc, xL, sigY, xL + sigW, sigY, GRAY, 0.4);
  drawLine(doc, xRSig, sigY, xRSig + sigW, sigY, GRAY, 0.4);
  drawLabel(doc, contract.renter_name, xL, sigY + 4, 8);
  drawLabel(doc, `Vermieter - ${org.name}`, xRSig, sigY + 4, 8);

  drawFooterPageNr(doc, 3, totalPages);
};

const STANDARD_SPECIAL_TERMS = [
  "Nichtraucherfahrzeug",
  "Versicherungsschutz bei Diebstahl nur bei Vorhandensein des übergebenen original Fahrzeugschlüssels",
  "Im Falle einer Unterschlagung haftet der Mieter mit dem ursprünglichen Listenpreis",
  "Bei einer gewerblichen Miete haftet der Geschäftsführer der Mieterin für sämtliche Schäden, offene Zahlungen oder sonstige Ansprüche selbstschuldnerisch",
  "Der Mieter verpflichtet sich das Fahrzeug sorgfältig und gewissenhaft zu behandeln, dies bedeutet, dass er das Fahrzeug bei Fahrten im Ausland möglichst ausschließlich in gesicherten Garagen abstellen darf",
  "Versicherungsschutz nur in den Ländern gemäß Einreisebeschränkung",
  "Fahrzeugschein im Original übergeben",
  "Glasschäden fallen ausdrücklich in die Haftung des Mieters",
  "Der Mieter trägt die Pflicht zur Verwendung von einer der Witterung angepassten Bereifung",
  "Eine Verlängerung ist nur nach schriftlicher Vereinbarung möglich",
  "Mit der Verwendung von Launch-Control erlischt die Garantie und der Mieter haftet in vollem Umfang",
  "Nutzung ausschließlich auf öffentlichen Straßen, keine Rennstrecke (Rennstrecke = Vollhaftung)",
  "Eine Überlassung/Vermietung an Dritte ist untersagt",
  "Fahrzeug muss bei Rückgabe gereinigt sein",
  "Das Führen des Fahrzeuges ist ausschließlich im Vorhandensein der vollen Fahrtauglichkeit erlaubt. Das Führen unter Rauschmitteln ist ausdrücklich untersagt. Bei Missachtung haftet der Mieter in Höhe des vollen Listenpreises",
  "Der Vermieter behält sich das Recht vor, je nach Verfügbarkeit einen Tausch des Fahrzeuges durchzuführen",
  "Ich akzeptiere die ALLGEMEINEN VERMIETBEDINGUNGEN, sowie die Geschäftsbedingungen der Kreditkarteninstitute und verbundener Partner, Übergabeprotokoll sind Bestandteile des Mietvertrages",
  "Ich stimme zu, alle Kosten (Mietpreis, Zusatzleistungen, Kaution, Schäden, etc.) die durch diesen Vertrag entstehen über die oben aufgeführte Kreditkarte zu garantieren",
  "Der Vermieter ist berechtigt auch etwaige Kosten (z.B. Strafzettel, Schäden, Mautkosten, Mehrkilometer, Zusatzleistungen etc.) erhebliche Zeit nach der Rückgabe des Fahrzeuges über die Kreditkarte des Mieters einzuziehen",
  "Hinweis: Maut nicht im Mietpreis inkludiert",
  "Der Mieter leistet eine Sicherheit für die vertragsmäßige Behandlung des Fahrzeuges",
];

// =====================================================
// Seite 4 — Datenschutz
// =====================================================
const drawPagePrivacy = (
  doc: jsPDF,
  org: Organization,
  contract: Contract,
  customer: Customer | null,
  pageNr: number,
  totalPages: number
) => {
  doc.addPage();
  // Titel zentriert
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  setColor(doc, INK);
  doc.text(
    "Datenschutzrechtliche Einwilligungserklärung",
    PAGE.w / 2,
    M.top + 12,
    { align: "center" }
  );
  doc.setFont("helvetica", "normal");

  let y = M.top + 25;
  doc.setFontSize(9);
  setColor(doc, INK);
  const intro =
    "Die nachstehende Einwilligungserklärung erfolgt freiwillig und kann jederzeit für die Zukunft geändert oder widerrufen werden.";
  const introLines = doc.splitTextToSize(intro, PAGE.w - M.left - M.right) as string[];
  doc.text(introLines, M.left, y);
  y += introLines.length * 4 + 6;

  // 2-Spalten Form
  const colW = (PAGE.w - M.left - M.right - 6) / 2;
  const labelW = 25;
  const xL = M.left;
  const xR = M.left + colW + 6;

  const lastName = customer?.last_name ?? contract.renter_name;
  const firstName = customer?.first_name ?? "";
  const street = customerStreet(customer, contract.renter_address);
  const zipCity = [customer?.zip, customer?.city].filter(Boolean).join(" ");
  const email = customer?.email ?? contract.renter_email ?? "";
  const phone = customer?.phone ?? contract.renter_phone ?? "";

  const rowH = 8;
  doc.setFontSize(9);

  const drawPrivacyField = (
    x: number,
    rowY: number,
    label: string,
    value: string
  ) => {
    drawLabel(doc, label, x, rowY, 9, INK);
    doc.setFont("helvetica", "normal");
    setColor(doc, INK);
    doc.text(value, x + labelW, rowY);
    drawLine(doc, x + labelW, rowY + 1, x + colW - 2, rowY + 1, LIGHT, 0.3);
  };

  drawPrivacyField(xL, y, "Name:", lastName);
  drawPrivacyField(xR, y, "Vorname:", firstName);
  y += rowH;
  drawPrivacyField(xL, y, "Straße:", street);
  drawPrivacyField(xR, y, "PLZ, Ort:", zipCity);
  y += rowH;
  drawPrivacyField(xL, y, "E-Mail:", email);
  drawPrivacyField(xR, y, "Telefon:", phone);
  y += rowH;
  drawPrivacyField(xL, y, "Mobilfunk:", phone);
  drawPrivacyField(xR, y, "Telefax:", "");
  y += rowH + 6;

  // Body
  const body =
    "Sämtliche Personen- und Vertragsdaten aus diesem Vertrag und den mit diesem Vertrag zusammenhängenden Verträgen und Vereinbarungen werden zur Erfüllung und Abwicklung der Verträge und Vereinbarungen (z.B. Finanzierung, Mieten, Leasing, Einplanung und Produktion des Fahrzeuges, Sicherstellung des Preisschutzes, Garantieabwicklung, Kauf und Verkauf) verwendet.";
  const bodyLines = doc.splitTextToSize(body, PAGE.w - M.left - M.right) as string[];
  doc.text(bodyLines, M.left, y);
  y += bodyLines.length * 4 + 6;

  drawLabel(doc, "Unter der Nutzung der Daten ist folgendes zu verstehen:", M.left, y, 9);
  y += 6;
  drawLabel(
    doc,
    "Schriftliche, elektronische und telefonische Kontaktaufnahme im Rahmen der",
    M.left,
    y,
    9
  );
  y += 6;

  const bullets = [
    "Finanzierungsanfragen",
    "Leasinganfragen",
    "Kaufverträge",
    "Angebote",
    "Kundenbetreuung",
    "Kundeninformationen",
    "Werbung",
    "Mietverträge",
    "Sonstige vertragliche Unterlagen",
  ];
  for (const b of bullets) {
    drawLabel(doc, `•  ${b}`, M.left + 4, y, 9);
    y += 4.5;
  }
  y += 4;

  drawLabel(
    doc,
    "Ich willige für obige Zwecke in die Kontaktaufnahme über folgende Kontaktwege ein:",
    M.left,
    y,
    9
  );
  y += 6;
  drawLabel(doc, "Post, E-Mail, Telefon, Telefax, Whats-App, SMS", M.left, y, 9);
  y += 5;
  drawLabel(doc, "nicht gewünschtes bitte streichen.", M.left, y, 9);
  y += 12;

  // Unterschrift
  const dateStr = fmtDate(today());
  drawLabel(doc, "Datum:", M.left, y, 9);
  drawLabel(doc, dateStr, M.left + 18, y, 9);
  drawLabel(doc, "Unterschrift:", M.left + 70, y, 9);
  drawLine(doc, M.left + 95, y + 1, PAGE.w - M.right, y + 1, GRAY, 0.4);

  drawFooterPageNr(doc, pageNr, totalPages);
};

// =====================================================
// Seite 5 — AGB-Bestätigung
// =====================================================
const drawPageAGBConfirm = (
  doc: jsPDF,
  org: Organization,
  contract: Contract,
  customer: Customer | null,
  logoPngBase64: string | null,
  pageNr: number,
  totalPages: number
) => {
  doc.addPage();
  drawLogo(doc, org, logoPngBase64, M.top, 50);

  let y = M.top + 35;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  setColor(doc, INK);
  doc.text(
    "Bestätigung der allgemeinen Vermietbedingungen und Einreisebeschränkungen",
    M.left,
    y
  );
  doc.setFont("helvetica", "normal");
  y += 14;

  doc.setFontSize(9.5);
  const text = `Hiermit bestätige ich, dass ich die allgemeinen Vermietbedingungen sowie die Einreisebeschränkungen der ${org.name} vollständig erhalten und gelesen habe und diese vollumfänglich akzeptiere.`;
  const lines = doc.splitTextToSize(text, PAGE.w - M.left - M.right) as string[];
  doc.text(lines, M.left, y);
  y += lines.length * 4.5 + 30;

  // Name in Druckbuchstaben
  const fullName = customerFullName(customer, contract.renter_name);
  drawLine(doc, M.left, y, M.left + 70, y, GRAY, 0.4);
  drawLabel(doc, fullName, M.left, y - 2, 10);
  drawLabel(doc, "Name in Druckbuchstaben", M.left, y + 4, 8, GRAY);

  // Ort/Datum + Unterschrift
  y += 25;
  const dateStr = fmtDate(today());
  const cityLabel = org.city?.trim();
  const cityDate = cityLabel ? `${cityLabel}, ${dateStr}` : dateStr;
  drawLabel(doc, cityDate, M.left, y, 9);
  drawLine(doc, M.left, y + 1, M.left + 70, y + 1, GRAY, 0.4);
  drawLabel(doc, "Ort/Datum", M.left, y + 6, 8, GRAY);

  drawLine(doc, PAGE.w - M.right - 70, y + 1, PAGE.w - M.right, y + 1, GRAY, 0.4);
  drawLabel(doc, "Unterschrift", PAGE.w - M.right - 70, y + 6, 8, GRAY);

  drawFooterPageNr(doc, pageNr, totalPages);
};

// =====================================================
// Seite 6 — Übergabeprotokoll
// =====================================================
const drawPageHandover = (
  doc: jsPDF,
  org: Organization,
  contract: Contract,
  customer: Customer | null,
  vehicle: Vehicle | null,
  tires: VehicleTire | null,
  pageNr: number,
  totalPages: number
) => {
  doc.addPage();

  // Roter Trenner oben + Titel rechts
  setDraw(doc, RED);
  doc.setLineWidth(0.6);
  doc.line(M.left, M.top + 4, PAGE.w - M.right, M.top + 4);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  setColor(doc, INK);
  doc.text("ÜBERGABEPROTOKOLL", PAGE.w - M.right, M.top + 1, { align: "right" });
  doc.setFont("helvetica", "normal");

  // ===== Kopfdaten in 2 Spalten =====
  let y = M.top + 12;
  const colW = (PAGE.w - M.left - M.right - 6) / 2;
  const labelW = 42;
  const xL = M.left;
  const xR = M.left + colW + 6;
  const dateStr = fmtDate(today());

  const drawHandField = (
    x: number,
    rowY: number,
    label: string,
    value: string,
    customLabelW = labelW
  ) => {
    drawBold(doc, label, x, rowY, 8.5);
    doc.setFont("helvetica", "normal");
    setColor(doc, INK);
    doc.setFontSize(8.5);
    doc.text(value, x + customLabelW, rowY);
    drawLine(doc, x + customLabelW, rowY + 1, x + colW - 2, rowY + 1, LIGHT, 0.3);
  };

  const rowH = 6;
  drawHandField(xL, y, "Vertrags-Nr.:", `${contract.contract_nr} / ${dateStr}`, 28);
  drawHandField(
    xR,
    y,
    "Tachostand b. Übernahme:",
    contract.km_pickup != null ? `${fmtNum(contract.km_pickup)} Km` : ""
  );
  y += rowH;
  drawHandField(xL, y, "Leasingnehmer:", contract.renter_name, 28);
  drawHandField(xR, y, "Kennzeichen:", contract.plate, 28);
  y += rowH;
  const zipCity = [customer?.zip, customer?.city].filter(Boolean).join(" ");
  drawHandField(xL, y, "PLZ, Ort:", zipCity, 28);
  drawHandField(xR, y, "Herst., Typ:", vehicleModel(vehicle, contract.vehicle_type), 28);
  y += rowH;
  drawHandField(xL, y, "Nutzer:", contract.renter_name, 28);
  drawHandField(xR, y, "Fzg.-Ident-Nr.:", vehicle?.fin_number ?? "", 28);
  y += rowH + 2;

  // Beschreibungstext
  doc.setFontSize(7.5);
  setColor(doc, GRAY);
  const intro =
    "Der Fahrzeug-Abholer hat die Aufgabe, das o. g. Fahrzeug mit allen zugehörigen Schlüsseln, Unterlagen und Zubehör in Empfang zu nehmen. Er ist beauftragt, den Zustand des Fahrzeuges auf diesem Protokoll zu dokumentieren. Der Abholer ist nicht autorisiert Kostenbeträge festzulegen oder zu beurteilen, ob die Beschädigungen am Fahrzeug laufleistungsanalog sind.";
  const introLines = doc.splitTextToSize(intro, PAGE.w - M.left - M.right) as string[];
  doc.text(introLines, M.left, y);
  y += introLines.length * 3 + 4;
  setColor(doc, INK);

  // Fahrzeugbild + Legende
  drawBold(doc, "Fahrzeugbild", M.left, y, 9);
  doc.setFontSize(7.5);
  doc.setFont("helvetica", "normal");
  doc.text(
    "B = Beschädigung    D = Delle    K = Kratzer    R = Rost    S = Steinschlag/Rissbildung",
    M.left + 25,
    y
  );
  y += 4;

  // Zwei Auto-Ansichten nebeneinander
  drawCarTopView(doc, M.left, y, 75, 36);
  drawCarTopView(doc, M.left + 90, y, 75, 36);
  y += 40;

  // Erschwerte Übernahmebedingungen
  drawBold(doc, "Erschwerte Übernahmebedingungen durch", M.left, y, 8);
  let xCheck = M.left + 60;
  const condChecks = [
    "Verschmutzung",
    "Regen/Nässe",
    "Dunkelheit",
    "Parkhaus",
    "Schnee/Eis",
  ];
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  for (const c of condChecks) {
    drawCheckbox(doc, xCheck, y, 3);
    doc.text(c, xCheck + 4.5, y);
    xCheck += doc.getTextWidth(c) + 9;
  }
  y += 6;

  // Technik-Check
  drawBold(doc, "Technik-Check", M.left, y, 9);
  y += 3;
  drawLabel(doc, "Ist dem Übergebenden Folgendes bekannt?", M.left, y, 7.5, GRAY);
  y += 4;

  const techRows: Array<[string, string]> = [
    ["Unfall-Vorschäden", "Motorölstand in Ordnung"],
    ["Technische Mängel", "Kühlmittelstand in Ordnung"],
    ["Austauschmotor", "Tankfüllung"],
    ["Austauschgetriebe", "Warnanzeigen aktiv"],
    ["Austauschtacho", "Letzter Kundendienst bei Km"],
  ];
  doc.setFontSize(8);
  for (const [l, r] of techRows) {
    drawJaNein(doc, xL, y, l);
    drawJaNein(doc, xR, y, r);
    y += 5;
  }
  y += 2;

  // Bereifung
  drawBold(doc, "Bereifung", M.left, y, 9);
  y += 4;
  doc.setFontSize(8);
  drawLabel(doc, "vorhanden", M.left, y);
  drawCheckbox(doc, M.left + 18, y, 3);
  doc.text("Sommerreifen", M.left + 23, y);
  drawCheckbox(doc, M.left + 50, y, 3);
  doc.text("auf Stahlfelgen", M.left + 55, y);
  drawCheckbox(doc, M.left + 82, y, 3);
  doc.text("auf Alufelgen", M.left + 87, y);

  // Profiltiefen für Sommerreifen
  const isSummer = tires && tires.type === "summer";
  const treadS = {
    fl: isSummer ? tires?.tread_depth_fl : null,
    fr: isSummer ? tires?.tread_depth_fr : null,
    rl: isSummer ? tires?.tread_depth_rl : null,
    rr: isSummer ? tires?.tread_depth_rr : null,
  };
  drawLabel(
    doc,
    `Profiltiefe  vl ${treadS.fl ?? "____"}  vr ${treadS.fr ?? "____"}  hl ${treadS.rl ?? "____"}  hr ${treadS.rr ?? "____"}  Res ____`,
    M.left + 115,
    y,
    7.5
  );
  y += 5;

  drawLabel(doc, "vorhanden", M.left, y);
  drawCheckbox(doc, M.left + 18, y, 3);
  doc.text("Winterreifen", M.left + 23, y);
  drawCheckbox(doc, M.left + 50, y, 3);
  doc.text("auf Stahlfelgen", M.left + 55, y);
  drawCheckbox(doc, M.left + 82, y, 3);
  doc.text("auf Alufelgen", M.left + 87, y);

  const isWinter = tires && tires.type === "winter";
  const treadW = {
    fl: isWinter ? tires?.tread_depth_fl : null,
    fr: isWinter ? tires?.tread_depth_fr : null,
    rl: isWinter ? tires?.tread_depth_rl : null,
    rr: isWinter ? tires?.tread_depth_rr : null,
  };
  drawLabel(
    doc,
    `Profiltiefe  vl ${treadW.fl ?? "____"}  vr ${treadW.fr ?? "____"}  hl ${treadW.rl ?? "____"}  hr ${treadW.rr ?? "____"}`,
    M.left + 115,
    y,
    7.5
  );
  y += 6;

  // Innenraum
  drawBold(doc, "Innenraum", M.left, y, 9);
  doc.setFontSize(7.5);
  doc.setFont("helvetica", "normal");
  doc.text("B = Beschädigung    V = Verschmutzung    R = Riss", M.left + 25, y);
  y += 4;
  doc.setFontSize(8);

  const interiorRows: Array<[string, string]> = [
    ["Vordersitze", "Rücksitze"],
    ["Teppichboden", "Dachhimmel"],
    ["Kofferraum/Ladefläche", "Armaturentafel/Mittelkonsole"],
  ];
  for (const [l, r] of interiorRows) {
    drawBVR(doc, xL, y, l);
    drawBVR(doc, xR, y, r);
    y += 5;
  }
  y += 2;

  // Dokumente — 2 Spalten (statt 3, damit lange Labels passen)
  drawBold(doc, "Dokumente, Ausstattung, Anzeigen", M.left, y, 9);
  y += 4;
  doc.setFontSize(8);

  const docRows: Array<[string, string]> = [
    ["Fahrzeugschein/ZB Teil I", "Kundendienst-/Serviceheft"],
    ["EWG Übereinst.erklärung/CoC", "Bedienungsanleitung"],
    ["Letzte HU/AU-Bescheinigung", "Original-/Navigationsgerät"],
    ["Original-Navigations-DVD/CD", "Gepäckraumabdeckung"],
    ["Reserverad/Kompressor", "Bordwerkzeug"],
    ["Anhängerkupplung/Schlüssel", "Radio + Code-Card"],
  ];
  const cellW = (PAGE.w - M.left - M.right - 6) / 2;
  for (const [a, b] of docRows) {
    drawJaNein(doc, xL, y, a, cellW);
    drawJaNein(doc, xR, y, b, cellW);
    y += 4.5;
  }
  drawLabel(doc, `Anzahl Schlüssel: ${contract.keys_count ?? 1}`, xL, y + 2, 8);
  drawLabel(doc, "Anzahl Sitze: ____", xR, y + 2, 8);
  y += 6;

  // Hinweis-Zeile + Unterschriften unten
  const sigY = PAGE.h - M.bottom - 12;
  const sigW = (PAGE.w - M.left - M.right - 10) / 2;

  // Übernahmeort / Datum / Uhrzeit als kleine Felder oberhalb der Sigs
  const topRowY = sigY - 30;
  const fieldW = (PAGE.w - M.left - M.right - 10) / 3;
  drawLine(doc, M.left, topRowY, M.left + fieldW - 5, topRowY, LIGHT, 0.3);
  drawLabel(doc, "Übernahmeort", M.left, topRowY + 4, 7.5, GRAY);
  drawLine(
    doc,
    M.left + fieldW,
    topRowY,
    M.left + 2 * fieldW - 5,
    topRowY,
    LIGHT,
    0.3
  );
  drawLabel(doc, "Datum", M.left + fieldW, topRowY + 4, 7.5, GRAY);
  drawLine(doc, M.left + 2 * fieldW, topRowY, PAGE.w - M.right, topRowY, LIGHT, 0.3);
  drawLabel(doc, "Uhrzeit", M.left + 2 * fieldW, topRowY + 4, 7.5, GRAY);

  // Signaturblöcke
  drawBold(doc, "Bevollmächtigter", M.left, sigY - 14, 9);
  drawBold(doc, "Bevollmächtigter / Kunde", M.left + sigW + 10, sigY - 14, 9);

  drawLabel(doc, "Name des Abholers (in Druckschrift)", M.left, sigY - 9, 7.5, GRAY);
  drawLabel(
    doc,
    "Name des Bevollmächtigten (in Druckschrift)",
    M.left + sigW + 10,
    sigY - 9,
    7.5,
    GRAY
  );

  drawLabel(doc, contract.renter_name, M.left, sigY - 4, 8);
  drawLabel(doc, org.name, M.left + sigW + 10, sigY - 4, 8);

  drawLine(doc, M.left, sigY, M.left + sigW, sigY, GRAY, 0.4);
  drawLine(doc, M.left + sigW + 10, sigY, M.left + 2 * sigW + 10, sigY, GRAY, 0.4);

  drawLabel(doc, "Unterschrift des Abholers", M.left, sigY + 4, 7.5, GRAY);
  drawLabel(
    doc,
    "Unterschrift des Bevollmächtigten",
    M.left + sigW + 10,
    sigY + 4,
    7.5,
    GRAY
  );

  drawFooterPageNr(doc, pageNr, totalPages);
};

// =====================================================
// Hilfs-Renderer: ja/nein-Reihe, BVR-Reihe, Auto-Top-View
// =====================================================
const drawJaNein = (
  doc: jsPDF,
  x: number,
  y: number,
  label: string,
  width = 75
) => {
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  setColor(doc, INK);
  doc.text(label, x, y);
  const lx = x + width - 26;
  doc.text("ja", lx, y);
  drawCheckbox(doc, lx + 4, y, 2.8);
  doc.text("nein", lx + 12, y);
  drawCheckbox(doc, lx + 22, y, 2.8);
};

const drawBVR = (doc: jsPDF, x: number, y: number, label: string) => {
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  setColor(doc, INK);
  doc.text(label, x, y);
  const lx = x + 35;
  doc.text("B", lx, y);
  drawCheckbox(doc, lx + 2.5, y, 2.8);
  doc.text("V", lx + 10, y);
  drawCheckbox(doc, lx + 12.5, y, 2.8);
  doc.text("R", lx + 20, y);
  drawCheckbox(doc, lx + 22.5, y, 2.8);
};

// Draufsicht einer Limousine — Dach, Motorhaube, Kofferraum, 4 Türen,
// 4 Räder; Sektor-Boxen rundherum zum Eintragen von Schäden.
const drawCarTopView = (
  doc: jsPDF,
  x: number,
  y: number,
  w: number,
  h: number
) => {
  // Damage-Boxen am Rand (zuerst, damit Karosserie drüber liegt)
  setDraw(doc, INK);
  doc.setLineWidth(0.25);
  const boxSize = 2.8;
  for (let i = 0; i < 6; i++) {
    doc.rect(x + 4 + i * ((w - 8) / 6), y, boxSize, boxSize);
    doc.rect(x + 4 + i * ((w - 8) / 6), y + h - boxSize, boxSize, boxSize);
  }
  for (let i = 0; i < 3; i++) {
    doc.rect(x, y + 6 + i * ((h - 12) / 3), boxSize, boxSize);
    doc.rect(x + w - boxSize, y + 6 + i * ((h - 12) / 3), boxSize, boxSize);
  }

  // Karosserie-Bereich (innen, mit etwas Luft zu den Damage-Boxen)
  const padX = 5;
  const padY = 5;
  const bx = x + padX;
  const by = y + padY;
  const bw = w - 2 * padX;
  const bh = h - 2 * padY;

  // 4 Räder (Rechtecke, hauptsächlich außerhalb der Karosserie)
  setFill(doc, INK);
  const wheelW = bw * 0.06;
  const wheelH = bh * 0.22;
  // Vorderräder
  doc.rect(bx + bw * 0.18, by - wheelH * 0.65, wheelW, wheelH, "F");
  doc.rect(bx + bw * 0.18, by + bh - wheelH * 0.35, wheelW, wheelH, "F");
  // Hinterräder
  doc.rect(bx + bw * 0.74, by - wheelH * 0.65, wheelW, wheelH, "F");
  doc.rect(bx + bw * 0.74, by + bh - wheelH * 0.35, wheelW, wheelH, "F");

  // Karosserie-Außenlinie (abgerundetes Rechteck)
  setDraw(doc, INK);
  doc.setLineWidth(0.5);
  doc.roundedRect(bx, by, bw, bh, bh * 0.18, bh * 0.18);

  // Motorhaube (vorne links) — Trennlinie zur Frontscheibe
  doc.setLineWidth(0.35);
  const hoodEnd = bx + bw * 0.26;
  doc.line(hoodEnd, by, hoodEnd, by + bh);

  // Windschutzscheibe (Schräge zur Dach-Box)
  const roofStart = bx + bw * 0.34;
  const roofEnd = bx + bw * 0.70;
  const roofTopY = by + bh * 0.18;
  const roofBotY = by + bh * 0.82;
  doc.line(hoodEnd, by, roofStart, roofTopY);
  doc.line(hoodEnd, by + bh, roofStart, roofBotY);

  // Dach (Rechteck zwischen Wind- und Heckscheibe)
  doc.line(roofStart, roofTopY, roofEnd, roofTopY);
  doc.line(roofStart, roofBotY, roofEnd, roofBotY);
  // B-Säule (zwischen vorderer und hinterer Tür)
  doc.setLineWidth(0.3);
  const bPillarX = bx + bw * 0.50;
  doc.line(bPillarX, roofTopY, bPillarX, roofBotY);

  // Heckscheibe (Schräge zum Kofferraum)
  doc.setLineWidth(0.35);
  const trunkStart = bx + bw * 0.78;
  doc.line(roofEnd, roofTopY, trunkStart, by);
  doc.line(roofEnd, roofBotY, trunkStart, by + bh);

  // Kofferraum-Trennlinie zum Heck
  doc.line(trunkStart, by, trunkStart, by + bh);

  // Türgriff-Punkte (kleine Striche) auf Höhe ~30% / 70%
  doc.setLineWidth(0.25);
  setDraw(doc, GRAY);
  // Vordere Türen (links + rechts)
  doc.line(bx + bw * 0.36, by + bh * 0.08, bx + bw * 0.46, by + bh * 0.08);
  doc.line(bx + bw * 0.36, by + bh * 0.92, bx + bw * 0.46, by + bh * 0.92);
  // Hintere Türen
  doc.line(bx + bw * 0.54, by + bh * 0.08, bx + bw * 0.64, by + bh * 0.08);
  doc.line(bx + bw * 0.54, by + bh * 0.92, bx + bw * 0.64, by + bh * 0.92);

  // Front-Scheinwerfer (zwei kleine Ellipsen vorn)
  setDraw(doc, INK);
  doc.setLineWidth(0.3);
  doc.ellipse(bx + bw * 0.04, by + bh * 0.25, bw * 0.015, bh * 0.10);
  doc.ellipse(bx + bw * 0.04, by + bh * 0.75, bw * 0.015, bh * 0.10);
  // Rücklichter
  doc.ellipse(bx + bw * 0.96, by + bh * 0.25, bw * 0.015, bh * 0.10);
  doc.ellipse(bx + bw * 0.96, by + bh * 0.75, bw * 0.015, bh * 0.10);
};

// =====================================================
// Public API
// =====================================================
export const generateContractPdf = (args: {
  org: Organization;
  contract: Contract;
  customer: Customer | null;
  vehicle: Vehicle | null;
  tires?: VehicleTire | null;
  logoPngBase64?: string | null;
  signaturePngBase64?: string | null;
}): ArrayBuffer => {
  const {
    org,
    contract,
    customer,
    vehicle,
    tires = null,
    logoPngBase64 = null,
    signaturePngBase64 = null,
  } = args;
  const doc = newDoc();

  const totalPages = 6;
  drawPage1(doc, org, contract, customer, vehicle, logoPngBase64);
  drawPageAGB(doc, org, totalPages);
  drawPageSpecialTerms(doc, org, contract, totalPages);
  drawPagePrivacy(doc, org, contract, customer, 4, totalPages);
  drawPageAGBConfirm(doc, org, contract, customer, logoPngBase64, 5, totalPages);
  drawPageHandover(doc, org, contract, customer, vehicle, tires, 6, totalPages);

  // Signatur (falls vorhanden) als kleines Bild über Mieter-Linie auf Seite 1
  // — wir setzen sie nachträglich; jsPDF erlaubt page-switching via setPage(n)
  if (signaturePngBase64) {
    try {
      doc.setPage(1);
      const sigY = PAGE.h - M.bottom - 30;
      const sigW = (PAGE.w - M.left - M.right - 10) / 2;
      doc.addImage(
        signaturePngBase64,
        "PNG",
        M.left + 4,
        sigY - 14,
        sigW - 8,
        12,
        undefined,
        "FAST"
      );
    } catch {
      // Bild ungültig — ignorieren
    }
  }

  return doc.output("arraybuffer");
};

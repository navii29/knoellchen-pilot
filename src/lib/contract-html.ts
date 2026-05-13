// HTML-Template für den 6-seitigen Mietvertrag, das von Puppeteer in
// contract-pdf.ts zu einem A4-PDF gerendert wird. Inline-CSS, keine
// externen Assets. Logo + Signatur kommen als Data-URI rein.

import { readFileSync } from "node:fs";
import { join } from "node:path";
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
// Hilfsfunktionen
// =====================================================
const esc = (s: string | number | null | undefined): string => {
  if (s == null) return "";
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
};

const fmtNum = (v: number | null | undefined): string =>
  v == null ? "" : v.toLocaleString("de-DE");

const today = () => new Date().toISOString();

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

// Standard-Sondervereinbarungen (immer auf Seite 3 rechts gelistet)
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
// CSS
// =====================================================
const CSS = `
  @page {
    size: A4;
    margin: 14mm 16mm 16mm 16mm;
  }
  * { box-sizing: border-box; }
  html, body {
    font-family: 'Helvetica Neue', 'Helvetica', Arial, sans-serif;
    color: #1e1e1e;
    margin: 0;
    padding: 0;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  body { font-size: 8.5pt; line-height: 1.3; }
  .page {
    page-break-after: always;
    position: relative;
    display: flex;
    flex-direction: column;
    min-height: 263mm;
  }
  .page:last-child { page-break-after: auto; }

  /* Seite, die nur ein Vollbild zeigt (Übergabeprotokoll-Template) */
  .page.page-image {
    padding: 0;
    margin: 0;
    display: block;
    min-height: 0;
  }
  .page.page-image img {
    display: block;
    width: 100%;
    height: auto;
    margin: 0;
  }

  .logo { text-align: center; padding-top: 1mm; padding-bottom: 3mm; }
  .logo.left { text-align: left; }
  .logo img { max-height: 20mm; max-width: 90mm; object-fit: contain; }
  .logo.left img { max-height: 18mm; max-width: 70mm; }
  .logo-fallback {
    color: #0d9488;
    font-size: 22pt;
    font-weight: 600;
    letter-spacing: -0.01em;
  }
  .logo.left .logo-fallback { font-size: 18pt; }

  /* ---------- Seite 1 ---------- */
  .contract-meta { margin-top: 1mm; font-size: 9.5pt; }
  .contract-meta b { font-weight: 700; margin-right: 10mm; }
  .subtitle { margin-top: 0.5mm; font-size: 8.5pt; color: #1e1e1e; }

  .form { width: 100%; border-collapse: collapse; margin-top: 3mm; }
  .form tr td { padding: 0.55mm 0; vertical-align: top; font-size: 8.5pt; line-height: 1.25; }
  .form td.label { width: 55mm; color: #1e1e1e; }
  .form td.value { color: #1e1e1e; }
  .form td.right { text-align: right; padding-left: 4mm; white-space: nowrap; }
  .form .gap td { padding-top: 1.8mm; padding-bottom: 0; }

  .sigs { margin-top: auto; padding-top: 4mm; }
  .sigs .row { display: flex; justify-content: space-between; gap: 10mm; }
  .sig-block { flex: 1; }
  .sig-block .date { font-size: 9pt; padding-bottom: 1mm; min-height: 5mm; text-align: center; }
  .sig-block .line { border-top: 0.5pt solid #888; height: 0; margin-bottom: 1.5mm; }
  .sig-block .name { font-size: 8.5pt; }
  .sig-block .signature-img { height: 13mm; display: flex; align-items: flex-end; justify-content: center; }
  .sig-block .signature-img img { max-height: 13mm; max-width: 60mm; }

  /* ---------- Seite 2/3 AGB ---------- */
  .agb-title {
    font-style: italic;
    font-weight: 700;
    font-size: 13pt;
    text-align: center;
    margin: 0 0 4mm 0;
  }
  .agb-cols {
    column-count: 2;
    column-gap: 6mm;
    font-size: 7.5pt;
    line-height: 1.35;
    text-align: justify;
  }
  .agb-cols p { margin: 0 0 1.5mm 0; break-inside: avoid; }
  .agb-cols p strong { display: block; font-weight: 700; margin-bottom: 0.3mm; }
  .agb-stand { margin-top: auto; text-align: right; font-size: 7.5pt; padding-top: 4mm; }

  .special-box {
    border: 0.5pt solid #333;
    margin-top: 2mm;
    display: grid;
    grid-template-columns: 1fr 1fr;
    font-size: 7.5pt;
    line-height: 1.4;
  }
  .special-box .cell { padding: 3mm 4mm; }
  .special-box .cell + .cell { border-left: 0.5pt solid #333; }
  .special-box .heading { font-weight: 700; margin-bottom: 2mm; }
  .special-list { margin: 0; padding-left: 4.5mm; }
  .special-list li { margin-bottom: 1mm; }

  /* Schlichtere Sigs für Seite 3 — wie Ollies Original */
  .agb-sigs { margin-top: auto; padding-top: 8mm; display: flex; gap: 12mm; }
  .agb-sigs .col { flex: 1; }
  .agb-sigs .date { font-size: 9pt; margin-bottom: 1mm; }
  .agb-sigs .line { border-top: 0.5pt solid #888; padding-top: 1mm; font-size: 8.5pt; min-height: 5mm; }

  /* ---------- Seite 4 Datenschutz ---------- */
  .privacy-title {
    font-weight: 700;
    font-size: 14pt;
    text-align: center;
    margin: 4mm 0 6mm 0;
  }
  .privacy-intro { font-size: 9pt; margin-bottom: 6mm; }
  .privacy-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 5mm 8mm;
    font-size: 9pt;
    margin-bottom: 6mm;
  }
  .privacy-grid .row { display: flex; gap: 3mm; align-items: baseline; }
  .privacy-grid .row .lbl { font-weight: 600; min-width: 22mm; }
  .privacy-grid .row .val {
    flex: 1;
    border-bottom: 0.4pt solid #aaa;
    padding-bottom: 0.5mm;
    min-height: 4.5mm;
  }
  .privacy-body { font-size: 9pt; margin-bottom: 4mm; }
  .privacy-bullets { font-size: 9pt; margin: 1mm 0 4mm 0; padding-left: 6mm; }
  .privacy-bullets li { margin-bottom: 0.6mm; }

  /* ---------- Seite 5 AGB-Bestätigung ---------- */
  .conf-title { font-weight: 700; font-size: 11.5pt; margin: 12mm 0 8mm 0; }
  .conf-body { font-size: 10pt; margin-bottom: 35mm; }
  .conf-field { display: flex; flex-direction: column; max-width: 90mm; margin-bottom: 18mm; }
  .conf-field .val { min-height: 5mm; padding-bottom: 1mm; border-bottom: 0.5pt solid #888; font-size: 10pt; }
  .conf-field .lbl { font-size: 8pt; color: #666; margin-top: 1mm; }
  .conf-bottom { display: flex; justify-content: space-between; gap: 10mm; }
  .conf-bottom .field { flex: 1; }
  .conf-bottom .field .val { min-height: 5mm; padding-bottom: 1mm; border-bottom: 0.5pt solid #888; font-size: 10pt; }
  .conf-bottom .field .lbl { font-size: 8pt; color: #666; margin-top: 1mm; }

  /* ---------- Seite 6 Übergabeprotokoll ---------- */
  .ho-header { border-top: 1.2pt solid #cc2828; padding-top: 1mm; margin-bottom: 4mm; }
  .ho-title {
    text-align: right;
    font-weight: 700;
    font-size: 17pt;
    letter-spacing: 0.02em;
  }
  .ho-meta { width: 100%; border-collapse: collapse; margin-bottom: 3mm; }
  .ho-meta td { font-size: 8.5pt; padding: 1mm 0; vertical-align: bottom; }
  .ho-meta .lbl { font-weight: 700; padding-right: 2mm; width: 30mm; }
  .ho-meta .val {
    border-bottom: 0.4pt solid #bbb;
    min-width: 50mm;
    padding-bottom: 0.5mm;
  }
  .ho-intro { font-size: 7pt; color: #555; margin-bottom: 3mm; }

  .ho-fzg-label { font-weight: 700; font-size: 9pt; margin-right: 3mm; }
  .ho-legend { font-size: 7.5pt; color: #333; }

  .car-row { display: flex; gap: 4mm; margin: 1mm 0 4mm 0; }
  .car-row svg { flex: 1; height: 36mm; }

  .ho-section-title { font-weight: 700; font-size: 9.5pt; margin: 3mm 0 1mm 0; }
  .ho-subnote { font-size: 7pt; color: #555; margin-bottom: 1mm; }

  .erschwert { display: flex; align-items: center; gap: 4mm; font-size: 8pt; }
  .erschwert .lbl { font-weight: 700; }
  .erschwert .item { display: inline-flex; align-items: center; gap: 1.2mm; }

  .tech-check { display: grid; grid-template-columns: 1fr 1fr; gap: 1mm 6mm; font-size: 8pt; }
  .tech-check .row { display: flex; align-items: center; }
  .tech-check .row .name { flex: 1; }
  .tech-check .row .opts { display: flex; gap: 1.5mm; align-items: center; }

  .bereifung { display: grid; grid-template-columns: 15mm auto auto auto 1fr; gap: 1mm 3mm; font-size: 8pt; align-items: center; }
  .bereifung .row { display: contents; }
  .bereifung .item { display: inline-flex; align-items: center; gap: 1.2mm; }
  .bereifung .tread { font-size: 7.5pt; white-space: nowrap; }

  .innenraum { display: grid; grid-template-columns: 1fr 1fr; gap: 1mm 6mm; font-size: 8pt; }
  .innenraum .row { display: flex; align-items: center; gap: 2mm; }
  .innenraum .row .name { flex: 1; }
  .innenraum .row .bvr { display: inline-flex; gap: 2.5mm; }

  .dokumente { display: grid; grid-template-columns: 1fr 1fr; gap: 1mm 6mm; font-size: 8pt; }
  .dokumente .row { display: flex; align-items: center; }
  .dokumente .row .name { flex: 1; }

  /* Dokumente in 3 Spalten — wie Ollies Original */
  .dokumente-3 {
    display: grid;
    grid-template-columns: 1fr 1fr 1fr;
    gap: 1.2mm 5mm;
    font-size: 8pt;
  }
  .dokumente-3 .row { display: flex; align-items: center; }
  .dokumente-3 .row .name { flex: 1; }

  .ho-divider { border-top: 0.4pt solid #888; margin: 4mm 0 3mm 0; }

  .ho-foot-fields { display: flex; gap: 10mm; font-size: 7.5pt; color: #666; }
  .ho-foot-fields > div { flex: 1; display: flex; align-items: flex-end; gap: 2mm; }
  .ho-foot-fields .ln { flex: 1; border-top: 0.4pt solid #888; padding-top: 1mm; min-height: 4mm; }
  .ho-foot-fields .ln-uhr { display: inline-block; min-width: 22mm; border-top: 0.4pt solid #888; padding-top: 1mm; min-height: 4mm; }
  .ho-foot-fields .lbl { font-size: 7.5pt; color: #666; }

  .check {
    display: inline-block;
    width: 3mm;
    height: 3mm;
    border: 0.5pt solid #333;
    background: #fff;
    vertical-align: -0.4mm;
  }
  .check.checked { background: #1e1e1e; }
  .check-label { font-size: 8pt; }

  .ho-bottom {
    margin-top: 4mm;
    display: grid;
    grid-template-columns: 1fr 1fr 1fr;
    gap: 0 5mm;
  }
  .ho-bottom .field { display: flex; flex-direction: column; }
  .ho-bottom .field .ln { border-top: 0.4pt solid #888; padding-top: 1mm; }
  .ho-bottom .field .lbl { font-size: 7.5pt; color: #666; }

  .ho-sigs { display: flex; gap: 10mm; margin-top: 6mm; }
  .ho-sigs .col { flex: 1; }
  .ho-sigs .heading { font-weight: 700; font-size: 9.5pt; margin-bottom: 1mm; }
  .ho-sigs .subnote { font-size: 7.5pt; color: #666; margin-bottom: 1mm; }
  .ho-sigs .name { font-size: 9pt; margin-bottom: 1.5mm; min-height: 5mm; }
  .ho-sigs .line { border-top: 0.5pt solid #888; padding-top: 1mm; font-size: 7.5pt; color: #666; }

`;


// =====================================================
// Wiederverwendbare Bausteine
// =====================================================
const formRow = (
  label: string,
  value: string,
  rightValue?: string
): string => {
  if (rightValue) {
    return `<tr>
      <td class="label">${esc(label)}</td>
      <td class="value">${esc(value)}</td>
      <td class="right">${esc(rightValue)}</td>
    </tr>`;
  }
  return `<tr>
    <td class="label">${esc(label)}</td>
    <td class="value" colspan="2">${esc(value)}</td>
  </tr>`;
};

const gapRow = (): string => `<tr class="gap"><td colspan="3"></td></tr>`;

const logoBlock = (
  logoDataUri: string | null,
  orgName: string,
  align: "center" | "left" = "center"
): string => {
  const cls = align === "left" ? "logo left" : "logo";
  return logoDataUri
    ? `<div class="${cls}"><img src="${logoDataUri}" alt="${esc(orgName)}" /></div>`
    : `<div class="${cls}"><div class="logo-fallback">${esc(orgName)}</div></div>`;
};

const checkbox = (checked = false): string =>
  `<span class="check${checked ? " checked" : ""}"></span>`;

const sigBlock = (
  date: string,
  name: string,
  signatureImg: string | null
): string => `
  <div class="sig-block">
    ${signatureImg ? `<div class="signature-img"><img src="${signatureImg}" alt="Signatur" /></div>` : ""}
    <div class="date">${esc(date)}</div>
    <div class="line"></div>
    <div class="name">${esc(name)}</div>
  </div>
`;

// =====================================================
// Seiten
// =====================================================
const renderPage1 = (
  org: Organization,
  contract: Contract,
  customer: Customer | null,
  vehicle: Vehicle | null,
  logoDataUri: string | null,
  signaturePngBase64: string | null
): string => {
  const dateStr = fmtDate(today());
  const fullName = customerFullName(customer, contract.renter_name);
  const street = customerStreet(customer, contract.renter_address);
  const days = computeDays(contract.pickup_date, contract.return_date);
  const kmInclusive =
    contract.km_limit ??
    (vehicle?.inclusive_km_month
      ? Math.round((vehicle.inclusive_km_month * days) / 30)
      : null);
  const returnLocation =
    [org.street, [org.zip, org.city].filter(Boolean).join(" ")]
      .filter(Boolean)
      .join(", ") || "";

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
  const insBase =
    contract.insurance_type != null
      ? INSURANCE_TYPE_LABEL[contract.insurance_type as ContractInsuranceType]
      : INSURANCE_TYPE_LABEL.full;
  const insRight =
    contract.insurance_deductible != null
      ? `${fmtEur(Number(contract.insurance_deductible))} SB`
      : "";

  const cityLabel = org.city?.trim() ?? "";
  const cityDate = cityLabel ? `${cityLabel}, ${dateStr}` : dateStr;

  return `
    <div class="page">
      ${logoBlock(logoDataUri, org.name)}
      <div class="contract-meta">
        <b>Mietvertrag-Nr.:</b>${esc(contract.contract_nr)} / ${esc(dateStr)}
      </div>
      <div class="subtitle">Langzeitmiete/Dauermiete/Langzeitüberlassung</div>

      <table class="form">
        ${formRow("Mieter - Name, Vorname:", fullName)}
        ${formRow("Straße:", street)}
        ${formRow("Postleitzahl:", customer?.zip ?? "")}
        ${formRow("Ort:", customer?.city ?? "")}
        ${formRow("Land:", customer?.country ?? "")}
        ${formRow("Telefonnummer:", customer?.phone ?? contract.renter_phone ?? "")}
        ${formRow("E-Mail:", customer?.email ?? contract.renter_email ?? "")}
        ${gapRow()}
        ${formRow("Fahrer:", fullName)}
        ${formRow("Führerschein-Nr.:", customer?.license_nr ?? contract.renter_license_nr ?? "")}
        ${formRow("Ausweisnummer:", customer?.id_card_nr ?? "")}
        ${formRow("Fahrer 2:", contract.driver2_name ?? "")}
        ${formRow("Führerschein-Nr. Fahrer 2:", contract.driver2_license ?? "")}
        ${gapRow()}
        ${formRow("Mietobjekt:", vehicleModel(vehicle, contract.vehicle_type))}
        ${formRow("Leistung:", vehicle?.power_ps != null ? `${vehicle.power_ps} PS` : "")}
        ${formRow("Treibstoff:", vehicle?.fuel_type ?? "")}
        ${formRow("FIN:", vehicle?.fin_number ?? "")}
        ${formRow("Amtl. Kennzeichen:", contract.plate)}
        ${formRow("Zubehör:", vehicle?.accessories ?? "")}
        ${gapRow()}
        ${formRow("Lieferkosten:", fmtEur(Number(contract.delivery_cost ?? 0)))}
        ${formRow("Abholkosten:", fmtEur(Number(contract.pickup_cost ?? 0)))}
        ${formRow("Fahrzeugschlüssel:", `${contract.keys_count ?? 1} Fahrzeugschlüssel`)}
        ${formRow("Schäden bei Übergabe:", contract.damages_at_handover ?? "Keine")}
        ${formRow("KM-Stand bei Übergabe:", contract.km_pickup != null ? `${fmtNum(contract.km_pickup)} Km` : "")}
        ${formRow("Tankfüllstand bei Übergabe:", contract.fuel_level_pickup ?? "")}
        ${formRow("Übergabe an Mieter:", dateTimeLabel(contract.pickup_date, contract.pickup_time))}
        ${formRow("Mietdauer:", `${days} ${days === 1 ? "Tag" : "Tage"}`)}
        ${formRow("Rückgabe an Vermieter:", dateTimeLabel(contract.return_date, contract.return_time))}
        ${formRow("Rückgabeort:", returnLocation)}
        ${formRow("Vereinbarte Laufleistung / KM:", kmInclusive != null ? `${fmtNum(kmInclusive)} Km` : "")}
        ${gapRow()}
        ${formRow("Vertragsbedingungen:", `AGB vom ${dateStr}`)}
        ${formRow("Preis Zusatztage:", contract.daily_rate != null ? fmtEur(Number(contract.daily_rate)) : "")}
        ${formRow("Sondervereinbarungen:", contract.special_terms ?? "—")}
        ${formRow("Einzelmietpreis netto:", gross > 0 ? fmtEur(priceNet) : "")}
        ${formRow("zzgl. 19% MwSt.:", gross > 0 ? fmtEur(priceVat) : "")}
        ${formRow("Einzelmietpreis brutto:", gross > 0 ? fmtEur(gross) : "")}
        ${formRow("Zahlungsart:", paymentLabel)}
        ${formRow("Kaution:", contract.deposit != null ? fmtEur(Number(contract.deposit)) : "")}
        ${formRow("Versicherung:", insBase, insRight)}
        ${formRow("Preis Mehrkilometer in Euro:", vehicle?.extra_km_price != null ? fmtEur(Number(vehicle.extra_km_price)) : "")}
      </table>

      <div class="sigs">
        <div class="row">
          ${sigBlock(cityDate, fullName, signaturePngBase64)}
          ${sigBlock(cityDate, `Vermieter - ${org.name}`, null)}
        </div>
      </div>
    </div>
  `;
};

// AGB-Text in HTML-Paragraphen umwandeln. Jeder Block: heading line (fett),
// danach optional rest. Doppelte Newlines trennen Blöcke.
const agbHtml = (terms: string): string => {
  const paragraphs = terms.trim().split(/\n\s*\n/);
  return paragraphs
    .map((p) => {
      const lines = p.split("\n");
      const heading = lines[0].trim();
      const rest = lines.slice(1).join(" ").trim();
      return `<p><strong>${esc(heading)}</strong>${rest ? esc(rest) : ""}</p>`;
    })
    .join("");
};

const renderPage2 = (org: Organization): string => {
  const terms = org.rental_terms?.trim() || DEFAULT_RENTAL_TERMS.trim();
  return `
    <div class="page">
      <div class="agb-title">ALLGEMEINE VERMIETBEDINGUNGEN ${esc(org.name)}</div>
      <div class="agb-cols">${agbHtml(terms)}</div>
      <div class="agb-stand">Stand: ${esc(fmtDate(today()))}</div>
    </div>
  `;
};

const renderPage3 = (
  org: Organization,
  contract: Contract,
  logoDataUri: string | null
): string => {
  const dateStr = fmtDate(today());
  const cityLabel = org.city?.trim() ?? "";
  const cityDate = cityLabel ? `${cityLabel}, ${dateStr}` : dateStr;
  const fullName = contract.renter_name;
  const specText = contract.special_terms?.trim() || "—";

  return `
    <div class="page">
      ${logoBlock(logoDataUri, org.name, "left")}
      <div class="special-box">
        <div class="cell">
          <div class="heading">Sondervereinbarungen:</div>
          <div>${esc(specText).replace(/\n/g, "<br/>")}</div>
        </div>
        <div class="cell">
          <ol class="special-list">
            ${STANDARD_SPECIAL_TERMS.map((t) => `<li>${esc(t)}</li>`).join("")}
          </ol>
        </div>
      </div>
      <div class="agb-sigs">
        <div class="col">
          <div class="date">${esc(cityDate)}</div>
          <div class="line">${esc(fullName)}</div>
        </div>
        <div class="col">
          <div class="date">${esc(cityDate)}</div>
          <div class="line">&nbsp;</div>
        </div>
      </div>
    </div>
  `;
};

const renderPage4 = (
  org: Organization,
  contract: Contract,
  customer: Customer | null
): string => {
  const dateStr = fmtDate(today());
  const street = customerStreet(customer, contract.renter_address);
  const zipCity = [customer?.zip, customer?.city].filter(Boolean).join(" ");
  const email = customer?.email ?? contract.renter_email ?? "";
  const phone = customer?.phone ?? contract.renter_phone ?? "";

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

  return `
    <div class="page">
      <div class="privacy-title">Datenschutzrechtliche Einwilligungserklärung</div>
      <div class="privacy-intro">
        Die nachstehende Einwilligungserklärung erfolgt freiwillig und kann jederzeit für die Zukunft geändert oder widerrufen werden.
      </div>

      <div class="privacy-grid">
        <div class="row"><div class="lbl">Name:</div><div class="val">${esc(customer?.last_name ?? contract.renter_name)}</div></div>
        <div class="row"><div class="lbl">Vorname:</div><div class="val">${esc(customer?.first_name ?? "")}</div></div>
        <div class="row"><div class="lbl">Straße:</div><div class="val">${esc(street)}</div></div>
        <div class="row"><div class="lbl">PLZ, Ort:</div><div class="val">${esc(zipCity)}</div></div>
        <div class="row"><div class="lbl">E-Mail:</div><div class="val">${esc(email)}</div></div>
        <div class="row"><div class="lbl">Telefon:</div><div class="val">${esc(phone)}</div></div>
        <div class="row"><div class="lbl">Mobilfunk:</div><div class="val">${esc(phone)}</div></div>
        <div class="row"><div class="lbl">Telefax:</div><div class="val"></div></div>
      </div>

      <div class="privacy-body">
        Sämtliche Personen- und Vertragsdaten aus diesem Vertrag und den mit diesem Vertrag zusammenhängenden Verträgen und Vereinbarungen werden zur Erfüllung und Abwicklung der Verträge und Vereinbarungen (z.B. Finanzierung, Mieten, Leasing, Einplanung und Produktion des Fahrzeuges, Sicherstellung des Preisschutzes, Garantieabwicklung, Kauf und Verkauf) verwendet.
      </div>

      <div class="privacy-body">Unter der Nutzung der Daten ist folgendes zu verstehen:</div>
      <div class="privacy-body">Schriftliche, elektronische und telefonische Kontaktaufnahme im Rahmen der</div>
      <ul class="privacy-bullets">
        ${bullets.map((b) => `<li>${esc(b)}</li>`).join("")}
      </ul>

      <div class="privacy-body">Ich willige für obige Zwecke in die Kontaktaufnahme über folgende Kontaktwege ein:</div>
      <div class="privacy-body" style="margin-bottom:1mm">Post, E-Mail, Telefon, Telefax, Whats-App, SMS</div>
      <div class="privacy-body">nicht gewünschtes bitte streichen.</div>

      <div class="sigs">
        <div style="display:flex;gap:6mm;align-items:flex-end">
          <div><span style="font-size:9pt">Datum:</span> <span style="font-size:9pt">${esc(dateStr)}</span></div>
          <div style="flex:1;display:flex;gap:3mm;align-items:flex-end">
            <span style="font-size:9pt">Unterschrift:</span>
            <span style="flex:1;border-bottom:0.5pt solid #888;min-height:5mm"></span>
          </div>
        </div>
      </div>
    </div>
  `;
};

const renderPage5 = (
  org: Organization,
  contract: Contract,
  customer: Customer | null,
  logoDataUri: string | null
): string => {
  const dateStr = fmtDate(today());
  const cityLabel = org.city?.trim() ?? "";
  const cityDate = cityLabel ? `${cityLabel}, ${dateStr}` : dateStr;
  const fullName = customerFullName(customer, contract.renter_name);

  return `
    <div class="page">
      ${logoBlock(logoDataUri, org.name, "left")}
      <div class="conf-title">
        Bestätigung der allgemeinen Vermietbedingungen und Einreisebeschränkungen
      </div>
      <div class="conf-body">
        Hiermit bestätige ich, dass ich die allgemeinen Vermietbedingungen sowie die Einreisebeschränkungen der ${esc(org.name)} vollständig erhalten und gelesen habe und diese vollumfänglich akzeptiere.
      </div>

      <div class="conf-field">
        <div class="val">${esc(fullName)}</div>
        <div class="lbl">Name in Druckbuchstaben</div>
      </div>

      <div class="conf-bottom">
        <div class="field">
          <div class="val">${esc(cityDate)}</div>
          <div class="lbl">Ort/Datum</div>
        </div>
        <div class="field">
          <div class="val">&nbsp;</div>
          <div class="lbl">Unterschrift</div>
        </div>
      </div>

    </div>
  `;
};

// Übergabeprotokoll-Template als statisches Image (Ollies Original-Scan mit
// händisch geweißten Kundendaten). Wird einmal beim Modulladen in Memory
// gehalten, danach pro Request als Data-URI eingebettet.
let HANDOVER_TEMPLATE_DATA_URI: string | null = null;
const loadHandoverTemplate = (): string => {
  if (HANDOVER_TEMPLATE_DATA_URI) return HANDOVER_TEMPLATE_DATA_URI;
  try {
    const path = join(process.cwd(), "src/lib/assets/handover-template.jpg");
    const buf = readFileSync(path);
    HANDOVER_TEMPLATE_DATA_URI = `data:image/jpeg;base64,${buf.toString("base64")}`;
    return HANDOVER_TEMPLATE_DATA_URI;
  } catch {
    return "";
  }
};

const renderPage6 = (org: Organization, contract: Contract): string => {
  const dateStr = fmtDate(today());
  void org; void contract; void dateStr;
  const tplUri = loadHandoverTemplate();
  if (tplUri) {
    return `
      <div class="page page-image">
        <img src="${tplUri}" alt="Übergabeprotokoll" />
      </div>
    `;
  }
  // Fallback ohne Template — sollte in Production nie greifen
  return `<div class="page"><div style="padding:20mm">Übergabeprotokoll-Template fehlt.</div></div>`;
};


// =====================================================
// Public
// =====================================================
export const buildContractHtml = (args: {
  org: Organization;
  contract: Contract;
  customer: Customer | null;
  vehicle: Vehicle | null;
  tires?: VehicleTire | null;
  logoDataUri?: string | null;
  signaturePngBase64?: string | null;
}): string => {
  const {
    org,
    contract,
    customer,
    vehicle,
    logoDataUri = null,
    signaturePngBase64 = null,
  } = args;
  // `tires` aktuell nicht mehr verwendet (Seite 6 ist ein Blanko-Protokoll),
  // bleibt aber im API-Parameter für künftige Erweiterungen.
  void args.tires;

  return `<!DOCTYPE html>
<html lang="de">
<head>
<meta charset="UTF-8" />
<title>Mietvertrag ${esc(contract.contract_nr)}</title>
<style>${CSS}</style>
</head>
<body>
${renderPage1(org, contract, customer, vehicle, logoDataUri, signaturePngBase64)}
${renderPage2(org)}
${renderPage3(org, contract, logoDataUri)}
${renderPage4(org, contract, customer)}
${renderPage5(org, contract, customer, logoDataUri)}
${renderPage6(org, contract)}
</body>
</html>`;
};

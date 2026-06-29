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
  SpecialTermsTemplate,
  Vehicle,
} from "./types";
import { INSURANCE_TYPE_LABEL, PAYMENT_METHOD_LABEL } from "./types";
import type { VehicleTire } from "./tires";
import { fmtDate, fmtEur } from "./utils";
import { resolveEffectiveDailyRate } from "./daily-rate";
import { DEFAULT_RENTAL_TERMS } from "./rental-terms";

// =====================================================
// Hilfsfunktionen
// =====================================================
// HTML-Escaping für interpolierte Werte (verhindert Attribut-/Tag-Breakout in
// der PDF-Vorlage). Exportiert, damit verwandte Generatoren (z. B. das
// Übergabeprotokoll) denselben Helfer nutzen statt einen eigenen zu bauen.
export const esc = (s: string | number | null | undefined): string => {
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

// Name in Druckschrift für die Vermieter-Seite (Seite 3/6). Eigener Name der
// Org, sonst Firmenname.
const landlordPrintName = (org: Organization): string =>
  org.landlord_signature_name?.trim() || org.name;

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
    position: relative;
  }
  .page.page-image img {
    display: block;
    width: 100%;
    height: auto;
    margin: 0;
  }

  /* Overlay-Callout für Schäden + Foto-Hinweis auf Seite 6.
     Top: 51% landet exakt im freien Streifen zwischen Fahrzeugskizze und
     "Erschwerte Übernahmebedingungen". */
  .ho-overlay {
    position: absolute;
    left: 6%;
    right: 6%;
    top: 38%;
    background: #fff8e1;
    border: 0.6pt solid #d4a017;
    padding: 0.8mm 2.5mm;
    font-size: 7pt;
    line-height: 1.3;
    box-shadow: 0 0 1mm rgba(0,0,0,0.08);
  }
  .ho-overlay b { color: #8a5a00; margin-right: 0.5mm; }

  .logo { text-align: center; padding-top: 1mm; padding-bottom: 3mm; }
  .logo.left { text-align: left; padding-top: 0; padding-bottom: 4mm; }
  .logo img { max-height: 20mm; max-width: 90mm; object-fit: contain; }
  /* SVG ohne intrinsische Größe (viewBox) nicht kollabieren lassen: definite
     Höhe (= max-height), object-fit:contain + max-width bleiben. Trifft NUR
     SVG-Data-URIs → PNG/JPG byte-identisch. */
  .logo img[src^="data:image/svg+xml"] { height: 20mm; }
  /* Prominentes Firmenlogo oben links (Seiten 1/3/5), wie in der Vorlage.
     Gedeckelt: breite Wortmarke füllt nicht die halbe Seite, quadratisches
     Logo sprengt nicht den Kopf (object-fit: contain via .logo img greift). */
  .logo.left img { max-height: 22mm; max-width: 75mm; }
  .logo.left img[src^="data:image/svg+xml"] { height: 22mm; }
  .logo-fallback {
    color: var(--brand-color);
    font-size: 22pt;
    font-weight: 600;
    letter-spacing: -0.01em;
  }
  .logo.left .logo-fallback { font-size: 20pt; }

  /* ---------- Seite 1 ---------- */
  .contract-meta { margin-top: 1mm; font-size: 9.5pt; }
  .contract-meta b { font-weight: 700; margin-right: 10mm; }
  .subtitle {
    margin-top: 0.5mm;
    font-size: 8.5pt;
    color: #555;
    letter-spacing: 0.02em;
    padding-bottom: 2mm;
    border-bottom: 1.8pt solid var(--brand-color);
  }

  .form { width: 100%; border-collapse: collapse; margin-top: 4mm; }
  .form tr td { padding: 0.6mm 0; vertical-align: top; font-size: 8.5pt; line-height: 1.3; }
  .form td.label { width: 55mm; color: #6a6a6a; font-size: 8pt; letter-spacing: 0.01em; }
  .form td.value { color: #1a1a1a; font-weight: 500; }
  .form td.right { text-align: right; padding-left: 4mm; white-space: nowrap; }
  .form .gap td { padding-top: 2.4mm; padding-bottom: 0; }

  .sigs { margin-top: auto; padding-top: 4mm; }
  .sigs .row { display: flex; justify-content: space-between; gap: 10mm; }
  .sig-block { flex: 1; }
  .sig-block .date { font-size: 9pt; padding-bottom: 1mm; min-height: 5mm; text-align: center; }
  .sig-block .line { border-top: 0.5pt solid #888; height: 0; margin-bottom: 1.5mm; }
  .sig-block .name { font-size: 8.5pt; }
  .sig-block .signature-img { height: 13mm; display: flex; align-items: flex-end; justify-content: flex-start; margin-bottom: -2mm; }
  .sig-block .signature-img img { max-height: 13mm; max-width: 60mm; }

  /* ---------- Seite 2/3 AGB ---------- */
  .agb-title {
    font-style: italic;
    font-weight: 700;
    font-size: 13pt;
    text-align: center;
    margin: 0 0 4mm 0;
    color: #1a1a1a;
    padding-bottom: 2mm;
    border-bottom: 1pt solid var(--brand-color);
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
  .special-box .heading { font-weight: 700; margin-bottom: 2mm; color: #1a1a1a; }
  .special-list { margin: 0; padding-left: 5mm; }
  .special-list li { margin-bottom: 1.5mm; }

  /* Einzelne Spalte für die Sondervereinbarungen (statt 2-spaltiger Box) */
  .special-single {
    margin-top: 4mm;
    font-size: 8.5pt;
    line-height: 1.4;
    column-count: 2;
    column-gap: 8mm;
  }
  .special-single .heading {
    font-weight: 700;
    margin-bottom: 2mm;
    column-span: all;
    color: #1a1a1a;
    padding-bottom: 1.5mm;
    border-bottom: 0.8pt solid var(--brand-color);
  }
  .special-single .special-list { padding-left: 5mm; }
  .special-single .special-list li { break-inside: avoid; margin-bottom: 1.5mm; }

  /* Schlichtere Sigs für Seite 3 — wie Ollies Original */
  .agb-sigs { margin-top: 8mm; padding-top: 0; display: flex; gap: 12mm; }
  .agb-sigs .col { flex: 1; }
  .agb-sigs .date { font-size: 9pt; margin-bottom: 1mm; }
  .agb-sigs .line { border-top: 0.5pt solid #888; padding-top: 1mm; font-size: 8.5pt; min-height: 5mm; }

  /* ---------- Seite 4 Datenschutz ---------- */
  .privacy-title {
    font-weight: 700;
    font-size: 14pt;
    text-align: center;
    margin: 4mm 0 6mm 0;
    color: #1a1a1a;
    padding-bottom: 2mm;
    border-bottom: 1pt solid var(--brand-color);
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
  .conf-title {
    font-weight: 700;
    font-size: 11.5pt;
    margin: 12mm 0 8mm 0;
    color: #1a1a1a;
    padding-bottom: 1.5mm;
    border-bottom: 1pt solid var(--brand-color);
  }
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

  /* Unterschrift-Tinte, die direkt auf einer Unterschriftslinie sitzt
     (Seite 3 Sondervereinbarungen, Seite 4 Datenschutz). */
  .sig-ink { height: 11mm; display: flex; align-items: flex-end; justify-content: flex-start; }
  .sig-ink img { max-height: 11mm; max-width: 55mm; }

  /* Seite 6 (Übergabeprotokoll, Vollbild-Template): Name in Druckschrift +
     Unterschrift des Kunden werden über den rechten Block
     "Bevollmächtigter / Kunde" gelegt. Positionen in % der Template-Bildhöhe;
     bei Anpassungen lokal rendern und prüfen. */
  .ho-cust-name {
    position: absolute;
    left: 70%;
    width: 25%;
    top: 88.8%;
    text-align: center;
    font-size: 8pt;
    white-space: nowrap;
    overflow: hidden;
  }
  .ho-cust-sig {
    position: absolute;
    left: 70%;
    width: 25%;
    top: 89.2%;
    height: 11mm;
    display: flex;
    align-items: flex-end;
    justify-content: center;
  }
  .ho-cust-sig img { max-height: 11mm; max-width: 95%; }

  /* Seite 6: Name + Unterschrift des Vermieters/Abholers im mittleren Block
     "Bevollmächtigter" (links neben dem Kunden-Block). */
  .ho-land-name {
    position: absolute;
    left: 42%;
    width: 25%;
    top: 88.8%;
    text-align: center;
    font-size: 8pt;
    white-space: nowrap;
    overflow: hidden;
  }
  .ho-land-sig {
    position: absolute;
    left: 42%;
    width: 25%;
    top: 89.2%;
    height: 11mm;
    display: flex;
    align-items: flex-end;
    justify-content: center;
  }
  .ho-land-sig img { max-height: 11mm; max-width: 95%; }

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
    ? `<div class="${cls}"><img src="${esc(logoDataUri)}" alt="${esc(orgName)}" /></div>`
    : `<div class="${cls}"><div class="logo-fallback">${esc(orgName)}</div></div>`;
};


const sigBlock = (
  date: string,
  name: string,
  signatureImg: string | null
): string => `
  <div class="sig-block">
    <div class="date">${esc(date)}</div>
    ${signatureImg ? `<div class="signature-img"><img src="${esc(signatureImg)}" alt="Signatur" /></div>` : ""}
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

  // Effektiver Tagespreis wie an den Geld-Stellen (Verlängerung/Nachtrag/
  // Rückgabe): monthly_rate ÷ 29 hat Vorrang, sonst daily_rate — damit der im
  // PDF gezeigte Gesamtpreis dieselbe Tagesbasis nutzt. total_amount gewinnt.
  // Rein lokale Anzeige-Berechnung, kein DB-Write.
  const effDaily = resolveEffectiveDailyRate({
    contractRate: contract.daily_rate,
    vehicleRate: null,
    contractMonthlyRate: contract.monthly_rate,
    vehicleMonthlyRate: null,
  });
  const gross =
    contract.total_amount != null
      ? Number(contract.total_amount)
      : effDaily != null
      ? Math.round(effDaily * days * 100) / 100
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
      ${logoBlock(logoDataUri, org.name, "left")}
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
          ${sigBlock(cityDate, `Vermieter - ${org.name}`, org.landlord_signature_data ?? null)}
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
  logoDataUri: string | null,
  specialTerms: SpecialTermsTemplate[],
  signaturePngBase64: string | null
): string => {
  const dateStr = fmtDate(today());
  const cityLabel = org.city?.trim() ?? "";
  const cityDate = cityLabel ? `${cityLabel}, ${dateStr}` : dateStr;
  const fullName = contract.renter_name;
  const customText = contract.custom_special_terms?.trim() ?? "";

  // Liste: erst alle ausgewählten Templates, danach Freitext-Vereinbarungen
  // als zusätzliche nummerierte Einträge.
  const items: string[] = specialTerms.map((t) => t.text.trim());
  if (customText) {
    // Mehrere durch Zeilenumbruch getrennte Freitext-Einträge separat zählen
    const customLines = customText
      .split(/\n+/)
      .map((l) => l.trim())
      .filter(Boolean);
    items.push(...customLines);
  }

  const listHtml = items.length
    ? items.map((t) => `<li>${esc(t)}</li>`).join("")
    : `<li style="list-style:none;color:#888">Keine Sondervereinbarungen.</li>`;

  return `
    <div class="page">
      ${logoBlock(logoDataUri, org.name, "left")}
      <div class="special-single">
        <div class="heading">Sondervereinbarungen:</div>
        <ol class="special-list">${listHtml}</ol>
      </div>
      <div class="agb-sigs">
        <div class="col">
          <div class="date">${esc(cityDate)}</div>
          <div class="sig-ink">${signaturePngBase64 ? `<img src="${esc(signaturePngBase64)}" alt="Unterschrift" />` : ""}</div>
          <div class="line">${esc(fullName)}</div>
        </div>
        <div class="col">
          <div class="date">${esc(cityDate)}</div>
          <div class="sig-ink">${org.landlord_signature_data ? `<img src="${esc(org.landlord_signature_data)}" alt="Unterschrift Vermieter" />` : ""}</div>
          <div class="line">${esc(landlordPrintName(org))}</div>
        </div>
      </div>
    </div>
  `;
};

const renderPage4 = (
  org: Organization,
  contract: Contract,
  customer: Customer | null,
  signaturePngBase64: string | null
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
            <span style="flex:1;border-bottom:0.5pt solid #888;min-height:11mm;display:flex;align-items:flex-end;justify-content:center">
              ${signaturePngBase64 ? `<img src="${esc(signaturePngBase64)}" alt="Unterschrift" style="max-height:10mm;max-width:55mm" />` : ""}
            </span>
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
  logoDataUri: string | null,
  signaturePngBase64: string | null
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
          <div class="val">${signaturePngBase64 ? `<img src="${esc(signaturePngBase64)}" alt="Unterschrift" style="max-height:9mm;max-width:55mm" />` : "&nbsp;"}</div>
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

const renderPage6 = (
  org: Organization,
  contract: Contract,
  customer: Customer | null,
  signaturePngBase64: string | null
): string => {
  const tplUri = loadHandoverTemplate();
  const fullName = customerFullName(customer, contract.renter_name);

  // Overlay-Hinweis: nur wenn Schäden gemeldet ODER Fotos vorhanden sind.
  const damages = contract.damages_at_handover?.trim() ?? "";
  const hasDamages = damages && damages.toLowerCase() !== "keine";
  const photoCount = Array.isArray(contract.pickup_photos)
    ? contract.pickup_photos.length
    : 0;
  const hasOverlay = hasDamages || photoCount > 0;

  const overlayParts: string[] = [];
  if (hasDamages)
    overlayParts.push(`<b>Schäden bei Übergabe:</b> ${esc(damages)}`);
  if (photoCount > 0)
    overlayParts.push(
      `<b>Foto-Doku:</b> ${photoCount} ${photoCount === 1 ? "Foto" : "Fotos"} im System`
    );
  const overlay = hasOverlay
    ? `<div class="ho-overlay">${overlayParts.join(" &nbsp;·&nbsp; ")}</div>`
    : "";

  // Name (Druckschrift) + Unterschrift des Kunden im rechten Block
  // "Bevollmächtigter / Kunde". Name immer, Unterschrift nur wenn signiert.
  const custName = `<div class="ho-cust-name">${esc(fullName)}</div>`;
  const custSig = signaturePngBase64
    ? `<div class="ho-cust-sig"><img src="${esc(signaturePngBase64)}" alt="Unterschrift" /></div>`
    : "";

  // Vermieter/Abholer im mittleren Block — nur wenn eine Vermieter-Unterschrift
  // hinterlegt ist (sonst bleibt der Block leer fürs handschriftliche Signieren).
  const landSig = org.landlord_signature_data ?? null;
  const landName = landSig
    ? `<div class="ho-land-name">${esc(landlordPrintName(org))}</div>`
    : "";
  const landSigEl = landSig
    ? `<div class="ho-land-sig"><img src="${esc(landSig)}" alt="Unterschrift Vermieter" /></div>`
    : "";

  if (tplUri) {
    return `
      <div class="page page-image">
        <img src="${tplUri}" alt="Übergabeprotokoll" />
        ${overlay}
        ${custName}
        ${custSig}
        ${landName}
        ${landSigEl}
      </div>
    `;
  }
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
  specialTerms?: SpecialTermsTemplate[];
  brandColor?: string | null;
}): string => {
  const {
    org,
    contract,
    customer,
    vehicle,
    logoDataUri = null,
    signaturePngBase64 = null,
    specialTerms = [],
    brandColor = null,
  } = args;
  // `tires` aktuell nicht mehr verwendet (Seite 6 ist ein Blanko-Protokoll),
  // bleibt aber im API-Parameter für künftige Erweiterungen.
  void args.tires;

  // Markenfarbe NUR als CSS-Variable am Root bereitstellen — noch keine Regel
  // nutzt sie (das ist der nächste, eigene Design-Schritt). Default = bisheriges
  // Teal, damit null/leer das heutige Aussehen exakt erhält. brandColor ist
  // bereits als Hex validiert (org-PATCH), esc als zusätzliche Absicherung.
  const brandVar = esc(brandColor || "#0d9488");

  return `<!DOCTYPE html>
<html lang="de" style="--brand-color: ${brandVar}">
<head>
<meta charset="UTF-8" />
<title>Mietvertrag ${esc(contract.contract_nr)}</title>
<style>${CSS}</style>
</head>
<body>
${renderPage1(org, contract, customer, vehicle, logoDataUri, signaturePngBase64)}
${renderPage2(org)}
${renderPage3(org, contract, logoDataUri, specialTerms, signaturePngBase64)}
${renderPage4(org, contract, customer, signaturePngBase64)}
${renderPage5(org, contract, customer, logoDataUri, signaturePngBase64)}
${renderPage6(org, contract, customer, signaturePngBase64)}
</body>
</html>`;
};

// HTML-Template für den 6-seitigen Mietvertrag (eazycar-Design), das von
// Puppeteer in contract-pdf.ts zu einem A4-PDF gerendert wird. Inline-CSS,
// keine externen Assets. Logo, Fahrzeugbild und Signatur kommen als Data-URI
// rein. Alle interpolierten Werte werden via esc() escaped.

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
import { DEFAULT_RENTAL_TERMS } from "./rental-terms";

// =====================================================
// Hilfsfunktionen
// =====================================================

// HTML-Escaping für interpolierte Werte (verhindert Attribut-/Tag-Breakout).
// Exportiert, damit verwandte Generatoren (Übergabeprotokoll) denselben Helfer
// nutzen statt einen eigenen zu bauen.
export const esc = (s: string | number | null | undefined): string => {
  if (s == null) return "";
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
};

const fmtNum = (v: number | null | undefined): string =>
  v == null ? "" : Number(v).toLocaleString("de-DE");

const today = () => new Date().toISOString();

const customerFullName = (c: Customer | null, fallback: string): string => {
  if (!c) return fallback;
  const parts = [c.title, c.first_name, c.last_name].filter(Boolean);
  return parts.length > 0 ? parts.join(" ") : c.last_name || fallback;
};

const customerStreet = (c: Customer | null, fallback: string | null): string => {
  if (!c) return fallback ?? "";
  return [c.street, c.house_nr].filter(Boolean).join(" ") || fallback || "";
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
  if (isNaN(a.getTime()) || isNaN(b.getTime())) return 1;
  const ms = b.setHours(0, 0, 0, 0) - a.setHours(0, 0, 0, 0);
  return Math.max(1, Math.round(ms / 86_400_000));
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

// Anzahl der Schadenseinträge aus dem Freitext ableiten (für Übergabeprotokoll).
const countDamages = (raw: string | null | undefined): number => {
  const t = (raw ?? "").trim();
  if (!t || t.toLowerCase() === "keine") return 0;
  return t.split(/[\n/;]+/).map((s) => s.trim()).filter(Boolean).length;
};

// =====================================================
// Inline-Icons (lucide-Stil, blau eingefärbt über currentColor)
// =====================================================
const I = {
  user: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="4"/><path d="M4 21v-1a6 6 0 0 1 6-6h4a6 6 0 0 1 6 6v1"/></svg>`,
  car: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M5 13l1.5-4.5A2 2 0 0 1 8.4 7h7.2a2 2 0 0 1 1.9 1.5L19 13"/><path d="M4 17h16v-3.5a1.5 1.5 0 0 0-.5-1.1L19 13H5l-.5-.6A1.5 1.5 0 0 0 4 13.5z"/><circle cx="7.5" cy="17" r="1.3"/><circle cx="16.5" cy="17" r="1.3"/></svg>`,
  calendar: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4.5" width="18" height="16" rx="2"/><path d="M3 9h18M8 3v3M16 3v3"/></svg>`,
  gauge: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M12 14l4-4"/><path d="M4 19a8 8 0 1 1 16 0"/><circle cx="12" cy="14" r="1.2"/></svg>`,
  lock: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg>`,
  shield: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l7 3v5c0 4.5-3 8-7 10-4-2-7-5.5-7-10V6z"/><path d="M9 12l2 2 4-4"/></svg>`,
  wallet: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="6" width="18" height="13" rx="2"/><path d="M3 10h18M16 14h2"/></svg>`,
  check: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12l4.5 4.5L19 7"/></svg>`,
  mail: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M4 7l8 6 8-6"/></svg>`,
  phone: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M6 3h3l1.5 4-2 1.5a12 12 0 0 0 5 5l1.5-2 4 1.5V20a2 2 0 0 1-2 2A16 16 0 0 1 4 5 2 2 0 0 1 6 3z"/></svg>`,
  chat: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M4 5h16v11H9l-4 3v-3H4z"/></svg>`,
  message: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M4 5h16v10H8l-4 3z"/><path d="M8 9h8M8 12h5"/></svg>`,
  mailbox: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M4 10a4 4 0 0 1 8 0v8H4z"/><path d="M12 10h6a3 3 0 0 1 3 3v5h-9"/><path d="M8 10v4"/></svg>`,
  key: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><circle cx="8" cy="8" r="3.5"/><path d="M10.5 10.5L20 20M16 16l2-2M18 18l2-2"/></svg>`,
  fuel: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="3" width="9" height="17" rx="1.5"/><path d="M4 11h9"/><path d="M16 7l3 3v6a2 2 0 0 1-4 0V5"/></svg>`,
  wrench: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M15 6a4 4 0 0 0-5 5l-6 6 3 3 6-6a4 4 0 0 0 5-5l-2.5 2.5-2.5-.5-.5-2.5z"/></svg>`,
  doc: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M6 3h8l4 4v14H6z"/><path d="M14 3v4h4M9 13h6M9 16h6"/></svg>`,
  alert: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M12 4l9 16H3z"/><path d="M12 10v4M12 17h.01"/></svg>`,
};

const BLUE = "#2f6bdf";

// =====================================================
// CSS
// =====================================================
const CSS = `
  @page { size: A4; margin: 0; }
  * { box-sizing: border-box; }
  html, body {
    font-family: 'Helvetica Neue', 'Helvetica', Arial, sans-serif;
    color: #1f2937; margin: 0; padding: 0;
    -webkit-print-color-adjust: exact; print-color-adjust: exact;
  }
  body { font-size: 9.5pt; line-height: 1.4; }

  .page {
    position: relative;
    width: 210mm; min-height: 297mm;
    padding: 16mm 16mm 20mm 16mm;
    page-break-after: always;
    display: flex; flex-direction: column;
  }
  .page:last-child { page-break-after: auto; }

  /* ---------- Kopfzeile ---------- */
  .head { display: flex; justify-content: space-between; align-items: flex-start; }
  .head .logo img { height: 9mm; max-width: 60mm; object-fit: contain; }
  .head .logo .fb { color: ${BLUE}; font-size: 17pt; font-weight: 800; letter-spacing: -0.02em; }
  .head .doc-meta { text-align: right; line-height: 1.5; }
  .head .doc-meta .t { font-size: 7.5pt; letter-spacing: 0.18em; color: #9ca3af; font-weight: 600; }
  .head .doc-meta .n { font-size: 8.5pt; font-weight: 700; color: #374151; }

  .foot-num { position: absolute; bottom: 9mm; right: 16mm; font-size: 7.5pt; color: #9ca3af; }
  .foot-org { position: absolute; bottom: 9mm; left: 16mm; font-size: 7.5pt; color: #9ca3af; line-height: 1.5; }

  .kicker { color: ${BLUE}; font-size: 8pt; font-weight: 700; letter-spacing: 0.16em; text-transform: uppercase; }
  .section-h { display: flex; align-items: center; gap: 2mm; font-size: 11pt; font-weight: 800; letter-spacing: 0.12em; color: #111827; text-transform: uppercase; margin-bottom: 4mm; }
  .section-h .bar { width: 4mm; height: 0.9mm; background: ${BLUE}; border-radius: 1mm; }

  /* ---------- Seite 1 Hero ---------- */
  .hero { display: flex; align-items: flex-start; gap: 6mm; margin-top: 8mm; }
  .hero .left { flex: 1; min-width: 0; }
  .hero .mv { color: ${BLUE}; font-size: 9pt; font-weight: 700; letter-spacing: 0.18em; }
  .hero h1 { font-size: 26pt; font-weight: 800; line-height: 1.06; letter-spacing: -0.01em; margin: 3mm 0 0; color: #0f172a; }
  .hero .dates { margin-top: 6mm; font-size: 13pt; font-weight: 600; color: #1f2937; }
  .hero .dur { margin-top: 1mm; font-size: 11pt; font-weight: 700; color: ${BLUE}; }
  .hero .img { width: 78mm; height: 46mm; display: flex; align-items: center; justify-content: flex-end; }
  .hero .img img { max-width: 100%; max-height: 100%; object-fit: contain; }

  .cards { display: grid; grid-template-columns: repeat(4, 1fr); gap: 3mm; margin-top: 9mm; }
  .card { border: 0.4pt solid #e5e7eb; border-radius: 2.5mm; padding: 3.5mm; min-height: 40mm; }
  .card .ic { width: 6mm; height: 6mm; color: ${BLUE}; margin-bottom: 2mm; }
  .card .ic svg { width: 100%; height: 100%; }
  .card .lbl { font-size: 7pt; letter-spacing: 0.13em; color: #9ca3af; font-weight: 700; text-transform: uppercase; }
  .card .nm { font-size: 9.5pt; font-weight: 700; color: #111827; margin-top: 1.5mm; }
  .card .ln { font-size: 8pt; color: #6b7280; margin-top: 0.6mm; line-height: 1.35; }
  .card .ln.strong { color: #1f2937; font-weight: 600; }
  .card .sub { font-size: 7pt; letter-spacing: 0.08em; color: #9ca3af; font-weight: 600; text-transform: uppercase; margin-top: 2.5mm; }

  .price { margin-top: 6mm; background: #eef3fd; border: 0.4pt solid #dbe6fb; border-radius: 3mm; padding: 5mm; }
  .price .top { display: flex; align-items: flex-end; gap: 8mm; }
  .price .big { font-size: 30pt; font-weight: 800; color: #0f172a; line-height: 1; }
  .price .vsm { font-size: 7.5pt; color: #6b7280; margin-top: 1.5mm; }
  .price .bd { display: flex; gap: 7mm; padding-bottom: 1.5mm; }
  .price .bd .it .k { font-size: 7pt; color: #6b7280; }
  .price .bd .it .v { font-size: 9pt; font-weight: 700; color: #1f2937; margin-top: 0.4mm; }
  .price .row2 { display: grid; grid-template-columns: repeat(3, 1fr); gap: 5mm; margin-top: 5mm; padding-top: 4mm; border-top: 0.4pt solid #dbe6fb; }
  .price .row2 .blk { display: flex; gap: 2.5mm; }
  .price .row2 .blk .ic { width: 5mm; height: 5mm; color: ${BLUE}; flex-shrink: 0; }
  .price .row2 .blk .ic svg { width: 100%; height: 100%; }
  .price .row2 .blk .k { font-size: 7pt; letter-spacing: 0.1em; color: #9ca3af; font-weight: 700; text-transform: uppercase; }
  .price .row2 .blk .v { font-size: 9pt; font-weight: 700; color: #1f2937; margin-top: 0.6mm; }
  .price .row2 .blk .v2 { font-size: 7.5pt; color: #6b7280; margin-top: 0.4mm; }

  /* ---------- Datentabellen (Seite 2) ---------- */
  .dtable { width: 100%; border-collapse: collapse; }
  .dtable td { padding: 1.7mm 0; vertical-align: top; border-bottom: 0.4pt solid #f0f1f3; font-size: 9pt; }
  .dtable tr:last-child td { border-bottom: 0; }
  .dtable td.k { color: #6b7280; width: 52%; }
  .dtable td.v { color: #111827; font-weight: 600; text-align: right; }
  .block-gap { height: 8mm; }

  /* ---------- Sondervereinbarungen (Seite 3) ---------- */
  .sv { list-style: none; margin: 0; padding: 0; }
  .sv li { display: flex; align-items: center; gap: 3mm; padding: 2.4mm 0; border-bottom: 0.4pt solid #f0f1f3; font-size: 9.5pt; color: #1f2937; }
  .sv li:last-child { border-bottom: 0; }
  .sv .chk { width: 5mm; height: 5mm; border-radius: 50%; background: ${BLUE}; color: #fff; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
  .sv .chk svg { width: 3.2mm; height: 3.2mm; }

  /* ---------- AGB (Seite 4) ---------- */
  .agb p { margin: 0 0 3mm; font-size: 8.5pt; line-height: 1.5; color: #374151; }
  .agb p strong { display: block; color: #111827; font-size: 9pt; letter-spacing: 0.04em; margin-bottom: 0.6mm; }

  /* ---------- Datenschutz (Seite 5) ---------- */
  .ds-intro { font-size: 9pt; color: #374151; line-height: 1.5; margin-bottom: 5mm; }
  .ds-list { display: flex; flex-direction: column; gap: 0; }
  .ds-row { display: flex; align-items: center; gap: 3mm; padding: 3mm 0; border-bottom: 0.4pt solid #f0f1f3; }
  .ds-row .ic { width: 5.5mm; height: 5.5mm; color: ${BLUE}; }
  .ds-row .ic svg { width: 100%; height: 100%; }
  .ds-row .nm { flex: 1; font-size: 9.5pt; color: #1f2937; }
  .ds-row .box { width: 4.5mm; height: 4.5mm; border: 0.6pt solid #cbd5e1; border-radius: 1mm; }
  .sign-area { margin-top: auto; padding-top: 10mm; display: flex; gap: 10mm; }
  .sign-area .f { flex: 1; }
  .sign-area .f .ln { border-top: 0.5pt solid #9ca3af; margin-bottom: 1.4mm; height: 14mm; display: flex; align-items: flex-end; justify-content: center; }
  .sign-area .f .ln img { max-height: 13mm; max-width: 55mm; }
  .sign-area .f .cap { font-size: 7.5pt; color: #9ca3af; }
  .sign-area .f .val { font-size: 9pt; color: #1f2937; margin-bottom: 1mm; }

  /* ---------- Übergabeprotokoll (Seite 6) ---------- */
  .ho-img { width: 100%; height: 64mm; display: flex; align-items: center; justify-content: center; margin: 6mm 0; }
  .ho-img img { max-width: 78%; max-height: 100%; object-fit: contain; }
  .ho-stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: 4mm; }
  .ho-stats .s { text-align: center; padding: 5mm 2mm; }
  .ho-stats .s .ic { width: 7mm; height: 7mm; color: ${BLUE}; margin: 0 auto 2.5mm; }
  .ho-stats .s .ic svg { width: 100%; height: 100%; }
  .ho-stats .s .lbl { font-size: 7pt; letter-spacing: 0.12em; color: #9ca3af; font-weight: 700; text-transform: uppercase; }
  .ho-stats .s .val { font-size: 13pt; font-weight: 800; color: #111827; margin-top: 1.5mm; }
`;

// =====================================================
// Bausteine
// =====================================================
const logoMark = (logoDataUri: string | null, orgName: string): string =>
  logoDataUri
    ? `<div class="logo"><img src="${esc(logoDataUri)}" alt="${esc(orgName)}" /></div>`
    : `<div class="logo"><div class="fb">${esc(orgName)}</div></div>`;

const pageHead = (
  logoDataUri: string | null,
  org: Organization,
  contract: Contract
): string => `
  <div class="head">
    ${logoMark(logoDataUri, org.name)}
    <div class="doc-meta">
      <div class="t">MIETVERTRAG</div>
      <div class="n">${esc(contract.contract_nr)} / ${esc(fmtDate(today()))}</div>
    </div>
  </div>
`;

const footNum = (n: number): string =>
  `<div class="foot-num">Seite ${n} von 6</div>`;

const icon = (svg: string): string => `<span class="ic">${svg}</span>`;

// =====================================================
// Seiten
// =====================================================
const renderPage1 = (
  org: Organization,
  contract: Contract,
  customer: Customer | null,
  vehicle: Vehicle | null,
  logoDataUri: string | null,
  vehicleImageDataUri: string | null
): string => {
  const fullName = customerFullName(customer, contract.renter_name);
  const days = computeDays(contract.pickup_date, contract.return_date);
  const model = vehicleModel(vehicle, contract.vehicle_type);
  const power = vehicle?.power_ps != null ? `${vehicle.power_ps} PS` : "";
  const fuel = vehicle?.fuel_type ?? "";
  const powerFuel = [power, fuel].filter(Boolean).join("  |  ");
  const kmInclusive =
    contract.km_limit ??
    (vehicle?.inclusive_km_month
      ? Math.round((vehicle.inclusive_km_month * days) / 30)
      : null);

  const gross =
    contract.total_amount != null
      ? Number(contract.total_amount)
      : contract.daily_rate != null
      ? Number(contract.daily_rate) * days
      : 0;
  const { net, vat } = grossToNet(gross);

  const paymentLabel =
    contract.payment_method != null
      ? PAYMENT_METHOD_LABEL[contract.payment_method as ContractPaymentMethod]
      : "—";
  const insBase =
    contract.insurance_type != null
      ? INSURANCE_TYPE_LABEL[contract.insurance_type as ContractInsuranceType]
      : INSURANCE_TYPE_LABEL.full;
  const insDed =
    contract.insurance_deductible != null
      ? `${fmtEur(Number(contract.insurance_deductible))} Selbstbeteiligung`
      : "";

  const addrLines = [
    customerStreet(customer, contract.renter_address),
    [customer?.zip, customer?.city].filter(Boolean).join(" "),
    customer?.country ?? "",
  ].filter(Boolean);
  const phone = customer?.phone ?? contract.renter_phone ?? "";
  const email = customer?.email ?? contract.renter_email ?? "";
  const durFrom = dateTimeLabel(contract.pickup_date, contract.pickup_time);
  const durTo = dateTimeLabel(contract.return_date, contract.return_time);

  const heroImg = vehicleImageDataUri
    ? `<div class="img"><img src="${esc(vehicleImageDataUri)}" alt="${esc(model)}" /></div>`
    : "";

  return `
    <div class="page">
      ${pageHead(logoDataUri, org, contract)}

      <div class="hero">
        <div class="left">
          <div class="mv">MIETVERTRAG</div>
          <h1>${esc(model)}</h1>
          <div class="dates">${esc(fmtDate(contract.pickup_date))} – ${esc(fmtDate(contract.return_date))}</div>
          <div class="dur">${days} ${days === 1 ? "TAG" : "TAGE"}</div>
        </div>
        ${heroImg}
      </div>

      <div class="cards">
        <div class="card">
          ${icon(I.user)}
          <div class="lbl">Mieter</div>
          <div class="nm">${esc(fullName)}</div>
          ${addrLines.map((l) => `<div class="ln">${esc(l)}</div>`).join("")}
          ${phone ? `<div class="ln" style="margin-top:1.5mm">${esc(phone)}</div>` : ""}
          ${email ? `<div class="ln">${esc(email)}</div>` : ""}
        </div>
        <div class="card">
          ${icon(I.car)}
          <div class="lbl">Fahrzeug</div>
          <div class="nm">${esc(model)}</div>
          ${powerFuel ? `<div class="ln strong">${esc(powerFuel)}</div>` : ""}
          <div class="sub">Kennzeichen</div>
          <div class="ln strong">${esc(contract.plate)}</div>
          ${vehicle?.fin_number ? `<div class="sub">FIN</div><div class="ln">${esc(vehicle.fin_number)}</div>` : ""}
        </div>
        <div class="card">
          ${icon(I.calendar)}
          <div class="lbl">Mietdauer</div>
          <div class="sub" style="margin-top:1.5mm">von</div>
          <div class="ln strong">${esc(durFrom)}</div>
          <div class="sub">bis</div>
          <div class="ln strong">${esc(durTo)}</div>
          <div class="nm" style="margin-top:2mm">${days} ${days === 1 ? "TAG" : "TAGE"}</div>
        </div>
        <div class="card">
          ${icon(I.gauge)}
          <div class="lbl">Laufleistung</div>
          <div class="sub" style="margin-top:1.5mm">Inklusive</div>
          <div class="nm">${kmInclusive != null ? `${fmtNum(kmInclusive)} km` : "—"}</div>
          ${vehicle?.extra_km_price != null ? `<div class="sub">Preis Mehrkilometer</div><div class="ln strong">${esc(fmtEur(Number(vehicle.extra_km_price)))} / km</div>` : ""}
        </div>
      </div>

      <div class="price">
        <div class="top">
          <div>
            <div class="kicker">Gesamtpreis (Brutto)</div>
            <div class="big">${gross > 0 ? esc(fmtEur(gross)) : "—"}</div>
            <div class="vsm">inkl. 19 % MwSt.</div>
          </div>
          ${
            gross > 0
              ? `<div class="bd">
                  <div class="it"><div class="k">Einzelmietpreis netto</div><div class="v">${esc(fmtEur(net))}</div></div>
                  <div class="it"><div class="k">zzgl. 19 % MwSt.</div><div class="v">${esc(fmtEur(vat))}</div></div>
                  <div class="it"><div class="k">Einzelmietpreis brutto</div><div class="v">${esc(fmtEur(gross))}</div></div>
                </div>`
              : ""
          }
        </div>
        <div class="row2">
          <div class="blk">${icon(I.lock)}<div><div class="k">Kaution</div><div class="v">${contract.deposit != null ? esc(fmtEur(Number(contract.deposit))) : "—"}</div></div></div>
          <div class="blk">${icon(I.shield)}<div><div class="k">Versicherung</div><div class="v">${esc(insBase)}</div>${insDed ? `<div class="v2">${esc(insDed)}</div>` : ""}</div></div>
          <div class="blk">${icon(I.wallet)}<div><div class="k">Zahlungsart</div><div class="v">${esc(paymentLabel)}</div></div></div>
        </div>
      </div>

      <div class="foot-org">
        ${esc(org.name)}<br/>
        ${esc([org.street, [org.zip, org.city].filter(Boolean).join(" ")].filter(Boolean).join(", "))}<br/>
        ${esc([org.phone ? `Tel. ${org.phone}` : "", org.email].filter(Boolean).join(" | "))}
      </div>
      ${footNum(1)}
    </div>
  `;
};

const renderPage2 = (
  org: Organization,
  contract: Contract,
  vehicle: Vehicle | null,
  logoDataUri: string | null
): string => {
  const model = vehicleModel(vehicle, contract.vehicle_type);
  const returnLocation =
    [org.name, org.street].filter(Boolean).join(" - ") ||
    [org.street, [org.zip, org.city].filter(Boolean).join(" ")].filter(Boolean).join(", ");

  const row = (k: string, v: string) =>
    `<tr><td class="k">${esc(k)}</td><td class="v">${esc(v) || "–"}</td></tr>`;

  return `
    <div class="page">
      ${pageHead(logoDataUri, org, contract)}
      <div style="margin-top:9mm"></div>
      <div class="section-h"><span class="bar"></span>Fahrzeugdaten</div>
      <table class="dtable">
        ${row("Hersteller / Modell", model)}
        ${row("Leistung", vehicle?.power_ps != null ? `${vehicle.power_ps} PS` : "")}
        ${row("Treibstoff", vehicle?.fuel_type ?? "")}
        ${row("FIN", vehicle?.fin_number ?? "")}
        ${row("Kennzeichen", contract.plate)}
        ${row("Zubehör", vehicle?.accessories ?? "")}
        ${row("Fahrzeugschlüssel", `${contract.keys_count ?? 1} Fahrzeugschlüssel`)}
        ${row("Schäden bei Übergabe", contract.damages_at_handover ?? "Keine")}
        ${row("KM-Stand bei Übergabe", contract.km_pickup != null ? `${fmtNum(contract.km_pickup)} km` : "")}
        ${row("Tankfüllstand bei Übergabe", contract.fuel_level_pickup ?? "")}
      </table>

      <div class="block-gap"></div>
      <div class="section-h"><span class="bar"></span>Übergabe / Rückgabe</div>
      <table class="dtable">
        ${row("Übergabe an Mieter", dateTimeLabel(contract.pickup_date, contract.pickup_time))}
        ${row("Rückgabe an Vermieter", dateTimeLabel(contract.return_date, contract.return_time))}
        ${row("Rückgabeort", returnLocation)}
      </table>
      ${footNum(2)}
    </div>
  `;
};

const renderPage3 = (
  org: Organization,
  contract: Contract,
  logoDataUri: string | null,
  specialTerms: SpecialTermsTemplate[]
): string => {
  const items: string[] = specialTerms.map((t) => t.text.trim()).filter(Boolean);
  const customText = contract.custom_special_terms?.trim() ?? "";
  if (customText) {
    items.push(
      ...customText.split(/\n+/).map((l) => l.trim()).filter(Boolean)
    );
  }
  const list = items.length
    ? items
        .map(
          (t) =>
            `<li><span class="chk">${I.check}</span><span>${esc(t)}</span></li>`
        )
        .join("")
    : `<li><span>Keine Sondervereinbarungen.</span></li>`;

  return `
    <div class="page">
      ${pageHead(logoDataUri, org, contract)}
      <div style="margin-top:9mm"></div>
      <div class="section-h"><span class="bar"></span>Sondervereinbarungen</div>
      <ul class="sv">${list}</ul>
      ${footNum(3)}
    </div>
  `;
};

// AGB-Text in HTML-Paragraphen umwandeln. Erste Zeile fett (Überschrift),
// Rest als Fließtext. Doppelte Leerzeilen trennen Blöcke.
const agbHtml = (terms: string): string =>
  terms
    .trim()
    .split(/\n\s*\n/)
    .map((p) => {
      const lines = p.split("\n");
      const heading = lines[0].trim();
      const rest = lines.slice(1).join(" ").trim();
      return `<p><strong>${esc(heading)}</strong>${rest ? esc(rest) : ""}</p>`;
    })
    .join("");

const renderPage4 = (
  org: Organization,
  contract: Contract,
  logoDataUri: string | null
): string => {
  const terms = org.rental_terms?.trim() || DEFAULT_RENTAL_TERMS.trim();
  return `
    <div class="page">
      ${pageHead(logoDataUri, org, contract)}
      <div style="margin-top:9mm"></div>
      <div class="section-h"><span class="bar"></span>Allgemeine Mietbedingungen</div>
      <div class="agb">${agbHtml(terms)}</div>
      ${footNum(4)}
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
  const fullName = customerFullName(customer, contract.renter_name);
  const cityLabel = org.city?.trim() ?? "";
  const cityDate = cityLabel
    ? `${cityLabel}, ${fmtDate(today())}`
    : fmtDate(today());

  const channels: Array<[string, string]> = [
    [I.mail, "E-Mail"],
    [I.phone, "Telefon"],
    [I.chat, "WhatsApp"],
    [I.message, "SMS"],
    [I.mailbox, "Post"],
  ];

  return `
    <div class="page">
      ${pageHead(logoDataUri, org, contract)}
      <div style="margin-top:9mm"></div>
      <div class="section-h"><span class="bar"></span>Datenschutzeinwilligung</div>
      <div class="ds-intro">
        Ich willige ein, dass die ${esc(org.name)} meine personenbezogenen Daten zur Abwicklung
        des Mietvertrages sowie zur Kontaktaufnahme zu folgenden Zwecken nutzen darf:
      </div>
      <div class="ds-list">
        ${channels
          .map(
            ([ic, nm]) =>
              `<div class="ds-row">${icon(ic)}<div class="nm">${esc(nm)}</div><div class="box"></div></div>`
          )
          .join("")}
      </div>

      <div class="sign-area">
        <div class="f">
          <div class="val">${esc(cityDate)}</div>
          <div class="ln"></div>
          <div class="cap">Ort, Datum</div>
        </div>
        <div class="f">
          <div class="val">&nbsp;</div>
          <div class="ln">${signaturePngBase64 ? `<img src="${esc(signaturePngBase64)}" alt="Unterschrift" />` : ""}</div>
          <div class="cap">Unterschrift Mieter${fullName ? ` · ${esc(fullName)}` : ""}</div>
        </div>
      </div>
      ${footNum(5)}
    </div>
  `;
};

const renderPage6 = (
  org: Organization,
  contract: Contract,
  vehicle: Vehicle | null,
  logoDataUri: string | null,
  vehicleImageDataUri: string | null
): string => {
  const km = contract.km_pickup != null ? `${fmtNum(contract.km_pickup)} km` : "—";
  const tank = contract.fuel_level_pickup ?? "—";
  const keys = String(contract.keys_count ?? 1);
  const damages = String(countDamages(contract.damages_at_handover));

  const heroImg = vehicleImageDataUri
    ? `<div class="ho-img"><img src="${esc(vehicleImageDataUri)}" alt="${esc(vehicleModel(vehicle, contract.vehicle_type))}" /></div>`
    : `<div class="ho-img"></div>`;

  const stat = (ic: string, lbl: string, val: string) =>
    `<div class="s">${icon(ic)}<div class="lbl">${esc(lbl)}</div><div class="val">${esc(val)}</div></div>`;

  return `
    <div class="page">
      ${pageHead(logoDataUri, org, contract)}
      <div style="margin-top:9mm"></div>
      <div class="section-h"><span class="bar"></span>Übergabeprotokoll</div>
      ${heroImg}
      <div class="ho-stats">
        ${stat(I.gauge, "KM-Stand", km)}
        ${stat(I.fuel, "Tankstand", tank)}
        ${stat(I.key, "Schlüssel", keys)}
        ${stat(I.alert, "Schäden", damages)}
      </div>
      ${footNum(6)}
    </div>
  `;
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
  vehicleImageDataUri?: string | null;
}): string => {
  const {
    org,
    contract,
    customer,
    vehicle,
    logoDataUri = null,
    signaturePngBase64 = null,
    specialTerms = [],
    vehicleImageDataUri = null,
  } = args;
  void args.tires;

  return `<!DOCTYPE html>
<html lang="de">
<head>
<meta charset="UTF-8" />
<title>Mietvertrag ${esc(contract.contract_nr)}</title>
<style>${CSS}</style>
</head>
<body>
${renderPage1(org, contract, customer, vehicle, logoDataUri, vehicleImageDataUri)}
${renderPage2(org, contract, vehicle, logoDataUri)}
${renderPage3(org, contract, logoDataUri, specialTerms)}
${renderPage4(org, contract, logoDataUri)}
${renderPage5(org, contract, customer, logoDataUri, signaturePngBase64)}
${renderPage6(org, contract, vehicle, logoDataUri, vehicleImageDataUri)}
</body>
</html>`;
};

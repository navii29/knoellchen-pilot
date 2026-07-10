// HTML-Template für das Übergabeprotokoll (Übergabe/Rückgabe), das von
// Puppeteer in handover-protocol-pdf.ts zu einem A4-PDF gerendert wird.
// Inline-CSS, keine externen Assets — Logo, Fotos und Unterschriften kommen
// als Data-URI rein. Visuelle Konventionen (Font-Stack, Farben, Print-CSS,
// A4-Seite, Signaturblöcke) sind an buildContractHtml angelehnt, damit das
// Dokument zum Mietvertrag konsistent aussieht.

import type { Contract, Customer, Organization, Vehicle } from "./types";
import type { ReturnSummary } from "./km";
import { esc } from "./contract-html";
import { fmtDate, fmtEur } from "./utils";
import { fuelLabel } from "./fuel";

export type HandoverProtocolType = "pickup" | "return";

export type ProtocolPhoto = {
  position: string;
  label: string;
  dataUri: string;
};

const fmtNum = (v: number | null | undefined): string =>
  v == null ? "" : v.toLocaleString("de-DE");

const customerFullName = (c: Customer | null, fallback: string): string => {
  const parts = [c?.title, c?.first_name, c?.last_name].filter(Boolean);
  // Kunde bevorzugt, aber auf den Vertragsnamen zurückfallen, wenn der Kunde
  // (noch) keinen Namen trägt — nicht leer bleiben.
  return parts.length > 0 ? parts.join(" ") : c?.last_name || fallback;
};

const customerAddress = (c: Customer | null, contract: Contract): string => {
  // Kunde ist die Quelle der Wahrheit; ist dessen Adresse leer, auf den
  // Vertrags-Snapshot zurückfallen (statt "" zu liefern).
  const street = [c?.street, c?.house_nr].filter(Boolean).join(" ");
  const zipCity = [c?.zip, c?.city].filter(Boolean).join(" ");
  const fromCustomer = [street, zipCity].filter(Boolean).join(", ");
  return fromCustomer || contract.renter_address || "";
};

const vehicleModel = (v: Vehicle | null, fallback: string | null): string => {
  if (v) {
    const make = [v.manufacturer, v.model].filter(Boolean).join(" ");
    if (make) return make;
    if (v.vehicle_type) return v.vehicle_type;
  }
  return fallback ?? "";
};

const orgAddress = (org: Organization): string =>
  [org.street, [org.zip, org.city].filter(Boolean).join(" ")]
    .filter(Boolean)
    .join(", ");

// Datum/Uhrzeit des jeweiligen Vorgangs aus dem Vertrag (Übergabe vs. Rückgabe).
// Rückgabe: das TATSÄCHLICHE Rückgabedatum bevorzugen (das Protokoll dokumentiert
// den realen Vorgang, nicht den geplanten). Die geplante Uhrzeit nur anzeigen,
// solange das Datum noch dem geplanten entspricht — sonst wäre sie irreführend.
const eventDateTime = (
  contract: Contract,
  type: HandoverProtocolType
): string => {
  const date =
    type === "pickup"
      ? contract.pickup_date
      : contract.actual_return_date ?? contract.return_date;
  const time =
    type === "pickup"
      ? contract.pickup_time
      : date === contract.return_date
        ? contract.return_time
        : null;
  if (!date) return "";
  const d = fmtDate(date);
  return time ? `${d}, ${time} Uhr` : d;
};

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
  body { font-size: 9pt; line-height: 1.35; }
  .page {
    position: relative;
    display: flex;
    flex-direction: column;
    min-height: 263mm;
  }

  .head { display: flex; justify-content: space-between; align-items: flex-start; gap: 8mm; }
  .head .org-name { font-weight: 700; font-size: 11pt; }
  .head .org-addr { font-size: 8pt; color: #555; margin-top: 0.6mm; line-height: 1.4; }
  .head .logo img { max-height: 18mm; max-width: 60mm; object-fit: contain; }
  /* SVG-only: definite Höhe gegen Kollaps ohne viewBox. PNG/JPG unberührt. */
  .head .logo img[src^="data:image/svg+xml"] { height: 18mm; }
  .head .logo-fallback {
    color: #0d9488;
    font-size: 16pt;
    font-weight: 600;
    letter-spacing: -0.01em;
  }

  .title-bar { border-top: 1.2pt solid #0d9488; margin-top: 4mm; padding-top: 2mm; }
  .title { font-weight: 700; font-size: 18pt; letter-spacing: 0.01em; }
  .subtitle { font-size: 10pt; color: #0d9488; font-weight: 600; margin-top: 0.5mm; }

  .meta { width: 100%; border-collapse: collapse; margin-top: 4mm; }
  .meta td { font-size: 8.5pt; padding: 0.7mm 0; vertical-align: top; }
  .meta td.lbl { font-weight: 700; width: 42mm; padding-right: 3mm; }
  .meta td.val { color: #1e1e1e; }

  /* Mehrtage / Mehrkilometer hervorheben */
  .val-alert { color: #c0392b; font-weight: 700; }

  .section-title {
    font-weight: 700;
    font-size: 10pt;
    margin: 5mm 0 1.5mm 0;
    border-bottom: 0.4pt solid #ccc;
    padding-bottom: 0.8mm;
  }

  .data-grid { width: 100%; border-collapse: collapse; margin-top: 1mm; }
  .data-grid td { font-size: 8.5pt; padding: 1mm 0; vertical-align: top; }
  .data-grid td.lbl { font-weight: 700; width: 42mm; padding-right: 3mm; }
  .data-grid .notes-val { white-space: pre-wrap; }

  .photo-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 3mm;
    margin-top: 1.5mm;
  }
  .photo-cell {
    border: 0.4pt solid #ddd;
    border-radius: 1.5mm;
    overflow: hidden;
    background: #fafafa;
  }
  .photo-cell .img-wrap {
    width: 100%;
    height: 38mm;
    display: flex;
    align-items: center;
    justify-content: center;
    background: #f2f2f2;
    overflow: hidden;
  }
  .photo-cell .img-wrap img { width: 100%; height: 100%; object-fit: cover; }
  .photo-cell .caption {
    font-size: 7.5pt;
    text-align: center;
    padding: 1mm;
    color: #444;
  }
  .photo-empty { font-size: 8pt; color: #888; margin-top: 1mm; }

  .sigs { margin-top: auto; padding-top: 8mm; }
  .sigs .row { display: flex; justify-content: space-between; gap: 12mm; }
  .sig-block { flex: 1; }
  .sig-block .heading { font-weight: 700; font-size: 9pt; margin-bottom: 1mm; }
  .sig-block .signature-img {
    height: 16mm;
    display: flex;
    align-items: flex-end;
    justify-content: center;
  }
  .sig-block .signature-img img { max-height: 16mm; max-width: 60mm; }
  .sig-block .line { border-top: 0.5pt solid #888; height: 0; margin-bottom: 1.2mm; }
  .sig-block .name { font-size: 8.5pt; }
  .sig-block .date { font-size: 8pt; color: #555; margin-top: 0.6mm; }
`;

const logoBlock = (logoDataUri: string | null, orgName: string): string =>
  logoDataUri
    ? `<div class="logo"><img src="${esc(logoDataUri)}" alt="${esc(orgName)}" /></div>`
    : `<div class="logo"><div class="logo-fallback">${esc(orgName)}</div></div>`;

const metaRow = (label: string, value: string): string =>
  `<tr><td class="lbl">${esc(label)}</td><td class="val">${esc(value)}</td></tr>`;

const dataRow = (label: string, value: string, notes = false): string =>
  `<tr><td class="lbl">${esc(label)}</td><td class="val${
    notes ? " notes-val" : ""
  }">${esc(value) || "—"}</td></tr>`;

// Rot hervorgehobene Zeile (Mehrtage / Mehrkilometer).
const alertRow = (label: string, value: string): string =>
  `<tr><td class="lbl">${esc(label)}</td><td class="val val-alert">${esc(value)}</td></tr>`;

const sigBlock = (
  heading: string,
  name: string,
  dateStr: string,
  png: string | null
): string => `
  <div class="sig-block">
    <div class="heading">${esc(heading)}</div>
    <div class="signature-img">${
      png ? `<img src="${esc(png)}" alt="${esc(heading)}" />` : ""
    }</div>
    <div class="line"></div>
    <div class="name">${esc(name)}</div>
    <div class="date">${esc(dateStr)}</div>
  </div>
`;

// Mieter-Unterschriftsblock, wenn der Mieter bei der Rückgabe nicht anwesend war
// (keine Unterschrift möglich) — dokumentiert das angekreuzt statt einer Linie.
const absentSigBlock = (heading: string, name: string, dateStr: string): string => `
  <div class="sig-block">
    <div class="heading">${esc(heading)}</div>
    <div class="signature-img" style="align-items:center;">
      <span class="val-alert" style="font-size:9pt;">&#9746; Mieter nicht vor Ort</span>
    </div>
    <div class="line"></div>
    <div class="name">${esc(name)}</div>
    <div class="date">${esc(dateStr)}</div>
  </div>
`;

const photoGrid = (photos: ProtocolPhoto[]): string => {
  if (photos.length === 0) {
    return `<div class="photo-empty">Keine Fotos erfasst.</div>`;
  }
  const cells = photos
    .map(
      (p) => `
        <div class="photo-cell">
          <div class="img-wrap"><img src="${esc(p.dataUri)}" alt="${esc(p.label)}" /></div>
          <div class="caption">${esc(p.label)}</div>
        </div>`
    )
    .join("");
  return `<div class="photo-grid">${cells}</div>`;
};

export const buildHandoverProtocolHtml = (args: {
  org: Organization;
  contract: Contract;
  customer: Customer | null;
  vehicle: Vehicle | null;
  type: HandoverProtocolType;
  photos: ProtocolPhoto[];
  sigLessorPng: string | null;
  sigRenterPng: string | null;
  logoDataUri: string | null;
  returnSummary?: ReturnSummary | null;
  renterAbsent?: boolean;
}): string => {
  const { org, contract, customer, vehicle, type, photos } = args;
  const summary = args.returnSummary ?? null;
  const renterAbsent = args.renterAbsent ?? false;

  const isPickup = type === "pickup";
  const eventLabel = isPickup ? "Übergabe" : "Rückgabe";
  const docTitle = `${eventLabel}protokoll`;

  const fullName = customerFullName(customer, contract.renter_name);
  const address = customerAddress(customer, contract);
  const model = vehicleModel(vehicle, contract.vehicle_type);
  const fin = vehicle?.fin_number ?? "";

  const km = isPickup ? contract.km_pickup : contract.km_return;
  const fuel = isPickup ? contract.fuel_level_pickup : contract.fuel_level_return;
  const condition = isPickup
    ? contract.damages_at_handover
    : contract.condition_at_return;

  const dateTime = eventDateTime(contract, type);
  const cityDate = (() => {
    const city = org.city?.trim() ?? "";
    const today = fmtDate(new Date().toISOString());
    return city ? `${city}, ${today}` : today;
  })();

  return `<!DOCTYPE html>
<html lang="de">
<head>
<meta charset="UTF-8" />
<title>${esc(docTitle)} ${esc(contract.contract_nr)}</title>
<style>${CSS}</style>
</head>
<body>
  <div class="page">
    <div class="head">
      <div>
        <div class="org-name">${esc(org.name)}</div>
        <div class="org-addr">${esc(orgAddress(org))}</div>
      </div>
      ${logoBlock(args.logoDataUri, org.name)}
    </div>

    <div class="title-bar">
      <div class="title">${esc(docTitle)}</div>
    </div>

    <table class="meta">
      ${metaRow("Vertrag-Nr.:", contract.contract_nr)}
      ${metaRow(
        "Laufzeit:",
        [contract.pickup_date, contract.return_date]
          .map((d) => (d ? fmtDate(d) : ""))
          .filter(Boolean)
          .join(" – ")
      )}
      ${
        !isPickup && contract.actual_return_date
          ? metaRow("Tatsächliche Rückgabe:", fmtDate(contract.actual_return_date))
          : ""
      }
      ${
        !isPickup && summary && summary.extraDays > 0
          ? alertRow(
              "Mehrtage:",
              `+${summary.extraDays} ${summary.extraDays === 1 ? "Tag" : "Tage"}${
                summary.extraDaysCost > 0 ? ` · ${fmtEur(summary.extraDaysCost)}` : ""
              }`
            )
          : ""
      }
      ${metaRow(`Datum/Uhrzeit (${eventLabel}):`, dateTime)}
    </table>

    <div class="section-title">Fahrzeug</div>
    <table class="data-grid">
      ${dataRow("Kennzeichen:", contract.plate)}
      ${dataRow("Typ / Hersteller / Modell:", model)}
      ${dataRow("FIN:", fin)}
    </table>

    <div class="section-title">Mieter</div>
    <table class="data-grid">
      ${dataRow("Name:", fullName)}
      ${dataRow("Adresse:", address)}
    </table>

    <div class="section-title">Zustand bei ${esc(eventLabel)}</div>
    <table class="data-grid">
      ${dataRow("km-Stand:", km != null ? `${fmtNum(km)} km` : "")}
      ${
        !isPickup && summary && summary.drivenKm != null
          ? dataRow("Gefahrene km:", `${fmtNum(summary.drivenKm)} km`)
          : ""
      }
      ${
        !isPickup && summary && summary.allowedKm != null
          ? dataRow("Inklusiv-km:", `${fmtNum(summary.allowedKm)} km`)
          : ""
      }
      ${
        !isPickup && summary && summary.excessKm > 0
          ? alertRow(
              "Mehrkilometer:",
              `+${fmtNum(summary.excessKm)} km${summary.cost > 0 ? ` · ${fmtEur(summary.cost)}` : ""}`
            )
          : ""
      }
      ${dataRow("Tankstand:", fuelLabel(fuel))}
      ${dataRow("Zustand / Schäden:", condition ?? "", true)}
    </table>

    <div class="section-title">Fotos</div>
    ${photoGrid(photos)}

    <div class="sigs">
      <div class="row">
        ${sigBlock("Unterschrift Vermieter", org.name, cityDate, args.sigLessorPng)}
        ${
          !isPickup && renterAbsent
            ? absentSigBlock("Unterschrift Mieter", fullName, cityDate)
            : sigBlock("Unterschrift Mieter", fullName, cityDate, args.sigRenterPng)
        }
      </div>
    </div>
  </div>
</body>
</html>`;
};

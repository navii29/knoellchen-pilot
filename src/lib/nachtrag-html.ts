// Eigenständiges Template für den "Nachtrag zum Mietvertrag" (Verlängerungs-
// Beleg). Bewusst NICHT in contract-html.ts integriert — der Vertrag bleibt
// unangetastet. Wiederverwendet nur Exportiertes (esc, fmtDate, fmtEur) und
// rendert über den geteilten renderHtmlToPdf (siehe nachtrag-pdf.ts).
//
// Branding wie beim Vertrag: --brand-color als CSS-Variable am Root (Default
// Teal), Farbe NUR in dünnen Akzentlinien + Logo-Fallback — Titel dunkel,
// Fließtext schwarz → druck-/S-W-sicher, auch bei heller Firmenfarbe.
//
// KEIN verbindlicher Rechtstext — nur ein klar markierter Platzhalter, der vom
// Vermieter/Anwalt ergänzt wird.
import { esc } from "./contract-html";
import { fmtDate, fmtEur } from "./utils";

export type NachtragInput = {
  orgName: string;
  logoDataUri: string | null;
  brandColor: string | null;
  contractNr: string;
  renterName: string;
  vehicleModel: string;
  plate: string;
  fin: string | null;
  originalReturnDate: string; // ISO
  newReturnDate: string; // ISO
  extraDays: number;
  dailyRate: number | null;
  extraCost: number | null;
  city: string | null;
  dateStr: string; // bereits formatiert (Ort/Datum-Zeile im Fuß)
};

const CSS = `
  @page { size: A4; margin: 18mm 18mm 16mm 18mm; }
  * { box-sizing: border-box; }
  html, body {
    font-family: 'Helvetica Neue', 'Helvetica', Arial, sans-serif;
    color: #1a1a1a;
    margin: 0;
    padding: 0;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  body { font-size: 10pt; line-height: 1.4; }
  .page { position: relative; display: flex; flex-direction: column; min-height: 255mm; }

  /* Kopf */
  .head { display: flex; align-items: flex-end; justify-content: space-between; gap: 10mm; }
  .logo img { max-height: 22mm; max-width: 75mm; object-fit: contain; display: block; }
  /* SVG-only: definite Höhe gegen Kollaps ohne viewBox. PNG/JPG unberührt. */
  .logo img[src^="data:image/svg+xml"] { height: 22mm; }
  .logo-fallback { color: var(--brand-color); font-size: 20pt; font-weight: 600; letter-spacing: -0.01em; }
  .doc-title { text-align: right; }
  .doc-title .t { font-size: 17pt; font-weight: 800; color: #1a1a1a; letter-spacing: -0.01em; }
  .doc-title .s { font-size: 8.5pt; color: #666; margin-top: 0.5mm; }
  .head-rule { border-bottom: 1.8pt solid var(--brand-color); margin: 3mm 0 6mm 0; }

  /* Sektionen */
  .section { margin-bottom: 6mm; }
  .section-title {
    font-size: 10.5pt; font-weight: 700; color: #1a1a1a;
    padding-bottom: 1.5mm; margin-bottom: 2.5mm;
    border-bottom: 1pt solid var(--brand-color);
  }
  .rows { width: 100%; border-collapse: collapse; }
  .rows td { padding: 1mm 0; vertical-align: top; font-size: 9.5pt; }
  .rows td.label { width: 52mm; color: #6a6a6a; }
  .rows td.value { color: #1a1a1a; font-weight: 500; }

  /* Verlängerung: alt -> neu */
  .ext { display: grid; grid-template-columns: 1fr auto 1fr; align-items: center; gap: 4mm; margin: 1mm 0 4mm 0; }
  .ext .box { border: 0.6pt solid #ccc; border-radius: 2mm; padding: 2.5mm 3mm; }
  .ext .box .k { font-size: 8pt; color: #6a6a6a; text-transform: uppercase; letter-spacing: 0.04em; }
  .ext .box .v { font-size: 11pt; font-weight: 700; color: #1a1a1a; font-variant-numeric: tabular-nums; margin-top: 0.5mm; }
  .ext .arrow { color: var(--brand-color); font-size: 16pt; text-align: center; }
  .cost-line { font-size: 10pt; }
  .cost-line .total { font-weight: 700; color: #1a1a1a; }
  .muted { color: #6a6a6a; }

  /* Verbindlicher Klauseltext (Fließtext) */
  .clause { font-size: 9.5pt; line-height: 1.5; color: #1a1a1a; margin: 0 0 3mm 0; text-align: justify; }
  .clause:last-child { margin-bottom: 0; }

  /* Fuß: Unterschriften */
  .sigs { margin-top: auto; padding-top: 6mm; }
  .sigs .ort { font-size: 9.5pt; margin-bottom: 8mm; }
  .sigs .row { display: flex; justify-content: space-between; gap: 14mm; }
  .sig { flex: 1; }
  .sig .line { border-top: 0.5pt solid #888; margin-bottom: 1.5mm; }
  .sig .name { font-size: 8.5pt; color: #444; }
`;

const logoMarkup = (logoDataUri: string | null, orgName: string): string =>
  logoDataUri
    ? `<div class="logo"><img src="${esc(logoDataUri)}" alt="${esc(orgName)}" /></div>`
    : `<div class="logo"><div class="logo-fallback">${esc(orgName)}</div></div>`;

export const buildNachtragHtml = (input: NachtragInput): string => {
  const brandVar = esc(input.brandColor || "#0d9488");
  const finRow = input.fin
    ? `<tr><td class="label">Fahrzeug-Ident-Nr. (FIN)</td><td class="value">${esc(input.fin)}</td></tr>`
    : "";
  const dayWord = input.extraDays === 1 ? "Tag" : "Tage";
  const rateStr = input.dailyRate != null ? fmtEur(input.dailyRate) : "—";
  const costStr = input.extraCost != null ? fmtEur(input.extraCost) : "—";
  const ortDatum = input.city ? `${esc(input.city)}, ${esc(input.dateStr)}` : esc(input.dateStr);

  // Klauseltext-Felder: Daten via fmtDate, Beträge via fmtEur (→ "69,00 €")
  // plus "brutto". Absatz 2 hat zwei Varianten — fehlt der Tagespreis (→ keine
  // Zusatzkosten), bleibt der Satz ohne dangling Betrag/"brutto" lesbar.
  const origStr = esc(fmtDate(input.originalReturnDate));
  const newStr = esc(fmtDate(input.newReturnDate));
  const dayWordClause = input.extraDays === 1 ? "Miettag" : "Miettage";
  const priced = input.dailyRate != null && input.extraCost != null;
  const clauseP2 = priced
    ? `Die ursprünglich bis zum ${origStr} vereinbarte Mietzeit wird bis zum ${newStr} verlängert. Für die zusätzlichen ${input.extraDays} ${dayWordClause} gilt der im Hauptvertrag vereinbarte Tagespreis von ${esc(fmtEur(input.dailyRate))} brutto je Miettag. Bei Rückgabe der Mietsache am ${newStr} ergeben sich hieraus voraussichtliche Zusatzkosten in Höhe von ${esc(fmtEur(input.extraCost))} brutto.`
    : `Die ursprünglich bis zum ${origStr} vereinbarte Mietzeit wird bis zum ${newStr} verlängert. Für die zusätzlichen ${input.extraDays} ${dayWordClause} gilt der im Hauptvertrag vereinbarte Tagespreis. Die hieraus resultierenden Zusatzkosten werden bei Rückgabe der Mietsache am ${newStr} abgerechnet.`;

  return `<!DOCTYPE html>
<html lang="de" style="--brand-color: ${brandVar}">
<head>
<meta charset="UTF-8" />
<title>Nachtrag zum Mietvertrag ${esc(input.contractNr)}</title>
<style>${CSS}</style>
</head>
<body>
  <div class="page">
    <div class="head">
      ${logoMarkup(input.logoDataUri, input.orgName)}
      <div class="doc-title">
        <div class="t">Nachtrag zum Mietvertrag</div>
        <div class="s">Verlängerung der Mietzeit</div>
      </div>
    </div>
    <div class="head-rule"></div>

    <div class="section">
      <div class="section-title">Bezug</div>
      <table class="rows">
        <tr><td class="label">Mietvertrag-Nr.</td><td class="value">${esc(input.contractNr)}</td></tr>
        <tr><td class="label">Mieter</td><td class="value">${esc(input.renterName)}</td></tr>
        <tr><td class="label">Fahrzeug</td><td class="value">${esc(input.vehicleModel)}</td></tr>
        <tr><td class="label">Amtl. Kennzeichen</td><td class="value">${esc(input.plate)}</td></tr>
        ${finRow}
      </table>
    </div>

    <div class="section">
      <div class="section-title">Verlängerung der Mietzeit</div>
      <div class="ext">
        <div class="box"><div class="k">Ursprüngliches Rückgabedatum</div><div class="v">${esc(fmtDate(input.originalReturnDate))}</div></div>
        <div class="arrow">&#8594;</div>
        <div class="box"><div class="k">Neues Rückgabedatum</div><div class="v">${esc(fmtDate(input.newReturnDate))}</div></div>
      </div>
      <div class="cost-line">
        <span class="muted">Zusatztage:</span> <b>${input.extraDays} ${dayWord}</b>
        &nbsp;&middot;&nbsp; <span class="muted">Tagespreis:</span> <b>${esc(rateStr)}</b>
        &nbsp;&middot;&nbsp; <span class="muted">Zusatzkosten:</span> <span class="total">${esc(costStr)}</span>
      </div>
    </div>

    <div class="section">
      <div class="section-title">Vereinbarung</div>
      <p class="clause">Die Parteien des im Kopf bezeichneten Mietvertrags (Mietvertrag-Nr. ${esc(input.contractNr)}) vereinbaren einvernehmlich folgende Verlängerung der Mietzeit:</p>
      <p class="clause">${clauseP2}</p>
      <p class="clause">Die Zusatzkosten für die verlängerte Mietzeit werden bei Rückgabe der Mietsache abgerechnet und sind mit Zugang der Abrechnung/Rechnung zur Zahlung fällig, sofern im Hauptvertrag keine für den Mieter günstigere Zahlungsfrist vereinbart ist.</p>
      <p class="clause">Alle übrigen Bestimmungen des Hauptvertrags, insbesondere die Allgemeinen Vermietbedingungen, Versicherungs- und Haftungsregelungen sowie Kautions- und Rückgabevereinbarungen, gelten unverändert fort, soweit sie durch diesen Nachtrag nicht ausdrücklich geändert werden.</p>
      <p class="clause">Änderungen und Ergänzungen dieses Nachtrags bedürfen der Textform.</p>
    </div>

    <div class="sigs">
      <div class="ort">${ortDatum}</div>
      <div class="row">
        <div class="sig"><div class="line"></div><div class="name">${esc(input.renterName)} (Mieter)</div></div>
        <div class="sig"><div class="line"></div><div class="name">Vermieter — ${esc(input.orgName)}</div></div>
      </div>
    </div>
  </div>
</body>
</html>`;
};

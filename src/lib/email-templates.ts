import type { Contract, Organization, Ticket } from "./types";
import { fmtDate, fmtEur } from "./utils";

const escape = (s: string | null | undefined): string =>
  (s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

const wrap = (title: string, inner: string, footerHtml: string): string => `<!DOCTYPE html>
<html lang="de"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escape(title)}</title></head>
<body style="margin:0;padding:0;background:#fafaf9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#1c1917;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#fafaf9;padding:32px 16px;">
    <tr><td align="center">
      <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="max-width:600px;background:#ffffff;border-radius:14px;border:1px solid #e7e5e4;overflow:hidden;">
        <tr><td style="padding:32px 36px;">${inner}</td></tr>
        <tr><td style="padding:20px 36px;border-top:1px solid #f5f5f4;background:#fafaf9;color:#78716c;font-size:12px;line-height:1.55;">${footerHtml}</td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;

const orgFooterHtml = (org: Organization): string => `
<strong style="color:#44403c;">${escape(org.name)}</strong>${org.street ? "<br>" + escape(org.street) : ""}${
  org.zip || org.city ? "<br>" + escape([org.zip, org.city].filter(Boolean).join(" ")) : ""
}${org.phone ? '<br><span style="color:#a8a29e;">Tel.</span> ' + escape(org.phone) : ""}${
  org.email ? '<br><span style="color:#a8a29e;">E-Mail</span> ' + escape(org.email) : ""
}${org.tax_number ? '<br><span style="color:#a8a29e;">USt-IdNr.</span> ' + escape(org.tax_number) : ""}
<div style="margin-top:14px;color:#a8a29e;font-size:11px;">Versendet via Knöllchen-Pilot · automatisierte Strafzettel-Bearbeitung</div>`;

// =====================================
// Template 1: An den Mieter
// =====================================
export const renterEmail = (
  org: Organization,
  ticket: Ticket,
  contract: Contract | null
): { subject: string; html: string; text: string } => {
  const renterName = contract?.renter_name || ticket.renter_name || "Sehr geehrte:r Mieter:in";
  const total = (ticket.fine_amount || 0) + Number(ticket.processing_fee || 0);
  const subject = `Weiterbelastung Ordnungswidrigkeit ${ticket.plate || ""} — ${ticket.ticket_nr}`;

  const html = wrap(
    subject,
    `
    <div style="font-size:13px;color:#a8a29e;letter-spacing:.05em;text-transform:uppercase;font-weight:600;">${escape(
      ticket.ticket_nr
    )}${contract?.contract_nr ? " · Vertrag " + escape(contract.contract_nr) : ""}</div>
    <h1 style="margin:8px 0 24px;font-size:22px;line-height:1.3;font-weight:700;color:#1c1917;">Weiterbelastung Ordnungswidrigkeit ${escape(
      ticket.plate
    )}</h1>

    <p style="margin:0 0 16px;line-height:1.65;">Sehr geehrte:r ${escape(renterName)},</p>

    <p style="margin:0 0 16px;line-height:1.65;">bezugnehmend auf den Ihnen überlassenen Mietwagen liegt uns folgender Bußgeldvorgang vor:</p>

    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border:1px solid #e7e5e4;border-radius:10px;margin:16px 0 24px;">
      ${[
        ["Tatvorwurf", ticket.offense || "—"],
        ["Tatdatum", `${fmtDate(ticket.offense_date)}${ticket.offense_time ? " · " + ticket.offense_time + " Uhr" : ""}`],
        ["Tatort", ticket.location || "—"],
        ["Behörde", ticket.authority || "—"],
        ["Kennzeichen", ticket.plate || "—"],
      ]
        .map(
          ([k, v]) =>
            `<tr><td style="padding:9px 16px;border-bottom:1px solid #f5f5f4;color:#78716c;font-size:13px;width:140px;">${escape(
              k
            )}</td><td style="padding:9px 16px;border-bottom:1px solid #f5f5f4;font-size:13px;color:#1c1917;">${escape(
              v
            )}</td></tr>`
        )
        .join("")}
    </table>

    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#fafaf9;border-radius:10px;margin:0 0 24px;">
      <tr><td style="padding:14px 18px;color:#78716c;font-size:13px;">Bußgeld</td><td style="padding:14px 18px;text-align:right;font-family:'JetBrains Mono',ui-monospace,monospace;font-size:14px;">${fmtEur(
        ticket.fine_amount
      )}</td></tr>
      <tr><td style="padding:14px 18px;color:#78716c;font-size:13px;border-top:1px solid #f5f5f4;">Bearbeitungsgebühr</td><td style="padding:14px 18px;text-align:right;font-family:'JetBrains Mono',ui-monospace,monospace;font-size:14px;border-top:1px solid #f5f5f4;">${fmtEur(
        Number(ticket.processing_fee)
      )}</td></tr>
      <tr><td style="padding:14px 18px;font-weight:600;border-top:1px solid #e7e5e4;">Gesamtbetrag</td><td style="padding:14px 18px;text-align:right;font-family:'JetBrains Mono',ui-monospace,monospace;font-weight:700;font-size:16px;border-top:1px solid #e7e5e4;color:#0d9488;">${fmtEur(
        total
      )}</td></tr>
    </table>

    <p style="margin:0 0 8px;line-height:1.65;">Bitte überweisen Sie den Gesamtbetrag innerhalb von <strong>14 Tagen</strong> unter Angabe des Verwendungszwecks <strong>${escape(
      ticket.ticket_nr
    )}</strong>.</p>
    <p style="margin:0 0 24px;line-height:1.65;color:#78716c;font-size:13px;">Im Anhang finden Sie unser ausführliches Anschreiben sowie die Rechnung als PDF.</p>

    <p style="margin:0;line-height:1.65;">Mit freundlichen Grüßen<br><strong>${escape(org.name)}</strong></p>
  `,
    orgFooterHtml(org)
  );

  const text = `Sehr geehrte:r ${renterName},

bezugnehmend auf den Ihnen überlassenen Mietwagen (Kennzeichen ${ticket.plate || "—"}${
    contract?.contract_nr ? ", Vertrag " + contract.contract_nr : ""
  }) liegt uns ein Bußgeldvorgang vor:

Tatvorwurf: ${ticket.offense || "—"}
Tatdatum: ${fmtDate(ticket.offense_date)}${ticket.offense_time ? " um " + ticket.offense_time + " Uhr" : ""}
Tatort: ${ticket.location || "—"}
Behörde: ${ticket.authority || "—"}

Bußgeld: ${fmtEur(ticket.fine_amount)}
Bearbeitungsgebühr: ${fmtEur(Number(ticket.processing_fee))}
Gesamtbetrag: ${fmtEur(total)}

Bitte überweisen Sie den Gesamtbetrag innerhalb von 14 Tagen.
Verwendungszweck: ${ticket.ticket_nr}

Im Anhang finden Sie unser Anschreiben sowie die Rechnung.

Mit freundlichen Grüßen
${org.name}
${org.street ?? ""}, ${org.zip ?? ""} ${org.city ?? ""}
${org.phone ? "Tel.: " + org.phone : ""} ${org.email ? "| E-Mail: " + org.email : ""}`;

  return { subject, html, text };
};

// =====================================
// Template 2: An die Behörde
// =====================================
export const authorityEmail = (
  org: Organization,
  ticket: Ticket,
  contract: Contract | null
): { subject: string; html: string; text: string } => {
  const renterName = contract?.renter_name || ticket.renter_name || "[Mieter:in]";
  const renterAddress = contract?.renter_address || "[Anschrift unbekannt]";
  const renterBirthday = contract?.renter_birthday || "[Geburtsdatum unbekannt]";
  const subject = `Fahrerermittlung — Az. ${ticket.reference_nr || ticket.ticket_nr} — Kennzeichen ${ticket.plate ?? ""}`;

  const html = wrap(
    subject,
    `
    <div style="font-size:13px;color:#a8a29e;letter-spacing:.05em;text-transform:uppercase;font-weight:600;">Fahrerermittlung</div>
    <h1 style="margin:8px 0 24px;font-size:22px;line-height:1.3;font-weight:700;color:#1c1917;">Aktenzeichen ${escape(
      ticket.reference_nr || ticket.ticket_nr
    )}</h1>

    <p style="margin:0 0 16px;line-height:1.65;">Sehr geehrte Damen und Herren,</p>

    <p style="margin:0 0 16px;line-height:1.65;">zu Ihrem Aktenzeichen <strong>${escape(
      ticket.reference_nr || "—"
    )}</strong> teilen wir Ihnen mit, dass das Fahrzeug mit dem Kennzeichen <strong>${escape(
      ticket.plate
    )}</strong> zum Tatzeitpunkt (${fmtDate(ticket.offense_date)}${
      ticket.offense_time ? ", " + ticket.offense_time + " Uhr" : ""
    }) im Rahmen eines Mietvertrags an folgende Person vermietet war:</p>

    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#fafaf9;border-radius:10px;margin:0 0 24px;">
      <tr><td style="padding:11px 18px;color:#78716c;font-size:13px;width:140px;">Name</td><td style="padding:11px 18px;font-weight:600;">${escape(
        renterName
      )}</td></tr>
      <tr><td style="padding:11px 18px;color:#78716c;font-size:13px;border-top:1px solid #f5f5f4;">Anschrift</td><td style="padding:11px 18px;border-top:1px solid #f5f5f4;">${escape(
        renterAddress
      )}</td></tr>
      <tr><td style="padding:11px 18px;color:#78716c;font-size:13px;border-top:1px solid #f5f5f4;">Geburtsdatum</td><td style="padding:11px 18px;border-top:1px solid #f5f5f4;font-family:'JetBrains Mono',ui-monospace,monospace;">${escape(
        renterBirthday
      )}</td></tr>
      ${contract?.contract_nr ? `<tr><td style="padding:11px 18px;color:#78716c;font-size:13px;border-top:1px solid #f5f5f4;">Mietvertrag</td><td style="padding:11px 18px;border-top:1px solid #f5f5f4;font-family:'JetBrains Mono',ui-monospace,monospace;">${escape(contract.contract_nr)}</td></tr>` : ""}
      ${contract ? `<tr><td style="padding:11px 18px;color:#78716c;font-size:13px;border-top:1px solid #f5f5f4;">Mietzeitraum</td><td style="padding:11px 18px;border-top:1px solid #f5f5f4;">${fmtDate(contract.pickup_date)} – ${fmtDate(contract.actual_return_date || contract.return_date)}</td></tr>` : ""}
    </table>

    <p style="margin:0 0 16px;line-height:1.65;">Den ausgefüllten Zeugenfragebogen finden Sie im Anhang. Wir bitten, sämtliche weitere Korrespondenz und das Bußgeldverfahren direkt an die oben genannte Person zu richten.</p>

    <p style="margin:0;line-height:1.65;">Mit freundlichen Grüßen<br><strong>${escape(org.name)}</strong></p>
  `,
    orgFooterHtml(org)
  );

  const text = `Sehr geehrte Damen und Herren,

zu Ihrem Aktenzeichen ${ticket.reference_nr || "—"} teilen wir Ihnen mit, dass das Fahrzeug mit dem Kennzeichen ${ticket.plate || "—"} zum Tatzeitpunkt (${fmtDate(ticket.offense_date)}${
    ticket.offense_time ? ", " + ticket.offense_time + " Uhr" : ""
  }) im Rahmen eines Mietvertrags an folgende Person vermietet war:

Name: ${renterName}
Anschrift: ${renterAddress}
Geburtsdatum: ${renterBirthday}${contract ? `\nMietvertrag: ${contract.contract_nr}\nMietzeitraum: ${fmtDate(contract.pickup_date)} – ${fmtDate(contract.actual_return_date || contract.return_date)}` : ""}

Den ausgefüllten Zeugenfragebogen finden Sie im Anhang.

Wir bitten, sämtliche weitere Korrespondenz direkt an die oben genannte Person zu richten.

Mit freundlichen Grüßen
${org.name}
${org.street ?? ""}, ${org.zip ?? ""} ${org.city ?? ""}`;

  return { subject, html, text };
};

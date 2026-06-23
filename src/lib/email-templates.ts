/**
 * email-templates.ts — Bibliothek vorgefertigter E-Mail-Vorlagen.
 *
 * Pro Anwendungsfall eine freundliche, deutsche Standard-Vorlage. Die Defaults
 * leben hier im Code; pro Organisation angepasste Fassungen liegen in der
 * Tabelle `email_templates` (Migration 058). "Auf Standard zurücksetzen" =
 * die Override-Zeile löschen → der Code-Default greift wieder.
 *
 * Dieses Modul ist REIN (keine Seiteneffekte, kein Netzwerk, keine DB) und
 * damit gut testbar. Die eigentliche Variablen-Befüllung (renderTemplate) und
 * der Versand liegen in lib/email.ts bzw. der send-email Route.
 *
 * DRY: Der 'contract'-Default ist identisch mit DEFAULT_CONTRACT_EMAIL_* aus
 * lib/email.ts (Bestandsvorlage) — wir importieren sie, statt sie zu kopieren.
 */

import {
  DEFAULT_CONTRACT_EMAIL_SUBJECT,
  DEFAULT_CONTRACT_EMAIL_BODY,
} from "./email";

// ---------------------------------------------------------------------------
// Schlüssel & Katalog
// ---------------------------------------------------------------------------

export type EmailTemplateKey =
  | "contract"
  | "checkin_invite"
  | "invoice"
  | "payment_reminder"
  | "return_reminder"
  | "deposit_release"
  | "general";

export type EmailTemplateCatalogEntry = {
  key: EmailTemplateKey;
  label: string;
  description: string;
  /** Hängt diese Vorlage das Vertrags-/Rechnungs-PDF an? */
  attachesPdf: boolean;
  /** Kurzes Aktions-Label für den Sende-Button, z. B. "Vertrag senden". */
  sendLabel: string;
};

export const EMAIL_TEMPLATE_CATALOG: EmailTemplateCatalogEntry[] = [
  {
    key: "contract",
    label: "Mietvertrag & Unterlagen",
    description: "Sendet den Mietvertrag als PDF an den Kunden.",
    attachesPdf: true,
    sendLabel: "Vertrag senden",
  },
  {
    key: "checkin_invite",
    label: "Einladung zum Online-Check-in",
    description:
      "Lädt den Kunden ein, den Check-in vorab online zu erledigen (mit Link).",
    attachesPdf: false,
    sendLabel: "Check-in-Einladung senden",
  },
  {
    key: "invoice",
    label: "Ihre Rechnung",
    description: "Sendet die Rechnung als PDF an den Kunden.",
    attachesPdf: true,
    sendLabel: "Rechnung senden",
  },
  {
    key: "payment_reminder",
    label: "Zahlungserinnerung",
    description: "Freundliche Erinnerung an einen noch offenen Betrag.",
    attachesPdf: false,
    sendLabel: "Zahlungserinnerung senden",
  },
  {
    key: "return_reminder",
    label: "Erinnerung: Fahrzeugrückgabe",
    description: "Erinnert den Kunden an den anstehenden Rückgabetermin.",
    attachesPdf: false,
    sendLabel: "Rückgabe-Erinnerung senden",
  },
  {
    key: "deposit_release",
    label: "Kaution freigegeben",
    description: "Bestätigt die Rückgabe bzw. Freigabe der Kaution.",
    attachesPdf: false,
    sendLabel: "Kaution-Mail senden",
  },
  {
    key: "general",
    label: "Freie Nachricht",
    description: "Leere Vorlage für eine individuell formulierte Nachricht.",
    attachesPdf: false,
    sendLabel: "Nachricht senden",
  },
];

const CATALOG_KEYS = new Set<string>(EMAIL_TEMPLATE_CATALOG.map((e) => e.key));

/** Whitelist-Guard: ist `v` einer der bekannten Katalog-Schlüssel? */
export const isEmailTemplateKey = (v: unknown): v is EmailTemplateKey =>
  typeof v === "string" && CATALOG_KEYS.has(v);

// ---------------------------------------------------------------------------
// Defaults (Deutsch, freundlich) — verfügbare Platzhalter:
//   {{mieter}} {{firma}} {{kennzeichen}} {{fahrzeug}} {{vertragsnummer}}
//   {{abholdatum}} {{rueckgabedatum}} {{betrag}} {{kaution}} {{checkin_link}}
//   {{vermieter}} {{absender}}
// ---------------------------------------------------------------------------

export const DEFAULT_EMAIL_TEMPLATES: Record<
  EmailTemplateKey,
  { subject: string; body: string }
> = {
  // Bestandsvorlage — DRY aus lib/email.ts.
  contract: {
    subject: DEFAULT_CONTRACT_EMAIL_SUBJECT,
    body: DEFAULT_CONTRACT_EMAIL_BODY,
  },

  checkin_invite: {
    subject: "Ihr Online-Check-in für {{fahrzeug}} – {{firma}}",
    body: `Guten Tag {{mieter}},

vielen Dank für Ihre Buchung bei {{firma}}.

damit die Fahrzeugübergabe schnell und reibungslos verläuft, können Sie den
Check-in bereits vorab bequem online erledigen.

Hier geht es direkt zu Ihrem persönlichen Check-in:
{{checkin_link}}

Bitte halten Sie Ihren Führerschein bereit. Der Vorgang dauert nur wenige
Minuten – so sparen Sie bei der Abholung Zeit.

Die wichtigsten Eckdaten Ihrer Anmietung:

• Fahrzeug: {{fahrzeug}} ({{kennzeichen}})
• Abholung: {{abholdatum}}
• Rückgabe: {{rueckgabedatum}}

Bei Fragen antworten Sie einfach auf diese E-Mail.

Mit freundlichen Grüßen
{{absender}}
{{firma}}`,
  },

  invoice: {
    subject: "Ihre Rechnung zu Mietvertrag {{vertragsnummer}} – {{firma}}",
    body: `Guten Tag {{mieter}},

vielen Dank für Ihr Vertrauen in {{firma}}.

im Anhang finden Sie Ihre Rechnung zum Mietvertrag {{vertragsnummer}} als PDF.

• Fahrzeug: {{fahrzeug}} ({{kennzeichen}})
• Mietzeitraum: {{abholdatum}} – {{rueckgabedatum}}
• Rechnungsbetrag: {{betrag}}

Bitte überweisen Sie den Betrag unter Angabe der Vertragsnummer. Sollten Sie
Fragen zur Rechnung haben, antworten Sie gerne direkt auf diese E-Mail.

Mit freundlichen Grüßen
{{absender}}
{{firma}}`,
  },

  payment_reminder: {
    subject: "Zahlungserinnerung zu Mietvertrag {{vertragsnummer}} – {{firma}}",
    body: `Guten Tag {{mieter}},

bei der Durchsicht unserer Unterlagen ist uns aufgefallen, dass für Ihren
Mietvertrag {{vertragsnummer}} noch ein offener Betrag von {{betrag}} aussteht.

Vielleicht ist Ihnen die Zahlung bislang entgangen – das passiert. Wir möchten
Sie daher freundlich bitten, den Betrag in den kommenden Tagen unter Angabe der
Vertragsnummer zu begleichen.

Sollten Sie die Zahlung bereits veranlasst haben, betrachten Sie diese
Erinnerung bitte als gegenstandslos. Bei Fragen sind wir jederzeit für Sie da –
antworten Sie einfach auf diese E-Mail.

Mit freundlichen Grüßen
{{absender}}
{{firma}}`,
  },

  return_reminder: {
    subject: "Erinnerung: Rückgabe von {{fahrzeug}} am {{rueckgabedatum}}",
    body: `Guten Tag {{mieter}},

wir möchten Sie freundlich an die anstehende Rückgabe Ihres Mietfahrzeugs
erinnern.

• Fahrzeug: {{fahrzeug}} ({{kennzeichen}})
• Vereinbarte Rückgabe: {{rueckgabedatum}}

Bitte tanken Sie das Fahrzeug vor der Rückgabe voll und bringen Sie es zum
vereinbarten Termin zu uns zurück. Sollten Sie den Mietzeitraum verlängern
möchten oder sich Ihre Pläne geändert haben, melden Sie sich bitte rechtzeitig
bei uns.

Vielen Dank – wir freuen uns auf Ihre Rückgabe.

Mit freundlichen Grüßen
{{absender}}
{{firma}}`,
  },

  deposit_release: {
    subject: "Ihre Kaution zu Mietvertrag {{vertragsnummer}} – {{firma}}",
    body: `Guten Tag {{mieter}},

vielen Dank für die Rückgabe des Fahrzeugs {{fahrzeug}} ({{kennzeichen}}).

das Fahrzeug ist wohlbehalten bei uns eingetroffen. Wir haben die hinterlegte
Kaution in Höhe von {{kaution}} freigegeben. Der Betrag wird in den nächsten
Tagen auf dem von Ihnen genutzten Zahlungsweg zurückerstattet bzw. die
Reservierung aufgehoben.

Es war uns eine Freude, Sie als Kundin oder Kunde begrüßen zu dürfen. Wir
würden uns freuen, Sie bald wieder bei {{firma}} willkommen zu heißen.

Mit freundlichen Grüßen
{{absender}}
{{firma}}`,
  },

  general: {
    subject: "Nachricht von {{firma}}",
    body: `Guten Tag {{mieter}},

`,
  },
};

// ---------------------------------------------------------------------------
// resolveTemplate — pur
// ---------------------------------------------------------------------------

/**
 * Löst die wirksame Vorlage für `key` auf: Override-Felder werden NUR genutzt,
 * wenn sie nicht-leer sind (nach Trim), sonst greift der Code-Default. So kann
 * der Betreiber z. B. nur den Betreff anpassen und den Standard-Text behalten.
 * Rein, ohne Seiteneffekte.
 */
export const resolveTemplate = (
  overrides: { subject?: string | null; body?: string | null } | null,
  key: EmailTemplateKey
): { subject: string; body: string } => {
  const def = DEFAULT_EMAIL_TEMPLATES[key];
  const subject =
    overrides?.subject && overrides.subject.trim().length > 0
      ? overrides.subject
      : def.subject;
  const body =
    overrides?.body && overrides.body.trim().length > 0
      ? overrides.body
      : def.body;
  return { subject, body };
};

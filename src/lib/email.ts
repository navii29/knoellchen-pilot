/**
 * email.ts — Dokumentenversand per E-Mail, provider-agnostisch (Resend).
 *
 * Der Betreiber richtet eine eigene, verifizierte Absenderdomain ein (Shopify-
 * Prinzip: mehrere CNAME-Einträge setzen → verifizieren → von der eigenen
 * Domain senden). Anschließend kann ein vorbereiteter Mietvertrag samt PDF an
 * den Kunden gesendet werden.
 *
 * Sicherheit: Der Plattform-Schlüssel RESEND_API_KEY wird AUSSCHLIESSLICH
 * serverseitig aus der Umgebung gelesen und niemals an den Client zurückgegeben.
 * Ist kein Key gesetzt, greift ein deterministischer MOCK-Modus: createSendingDomain
 * liefert Demo-CNAMEs, sendDocumentEmail loggt nur (kein echter Versand). So ist
 * der gesamte Ablauf auch ohne Anbieter-Zugang testbar.
 *
 * Der reine, deterministische Teil (renderTemplate, Mock-Records) hat KEINE
 * Seiteneffekte und ist damit gut testbar.
 */

const RESEND_BASE = "https://api.resend.com";

// ---------------------------------------------------------------------------
// Typen
// ---------------------------------------------------------------------------

export type DnsRecord = {
  type: string;
  name: string;
  value: string;
  ttl?: string;
  priority?: number;
  status?: string;
};

export type SendingDomain = {
  id: string;
  name: string;
  status: string;
  records: DnsRecord[];
};

export type EmailAttachment = {
  filename: string;
  contentBase64: string;
};

// ---------------------------------------------------------------------------
// Konfiguration — Plattform-Key NUR aus der Server-Env, nie aus der DB
// ---------------------------------------------------------------------------

/** Ist ein echter Resend-Versand konfiguriert? (Plattform-Env-Variable.) */
export const emailConfigured = (): boolean => !!process.env.RESEND_API_KEY;

const authHeaders = (): Record<string, string> => ({
  Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
  "Content-Type": "application/json",
});

// ---------------------------------------------------------------------------
// Mock — deterministische Demo-CNAMEs (kein Netzwerk, kein Zufall)
// ---------------------------------------------------------------------------

/**
 * Deterministische Demo-DNS-Records für eine Domain. Bilden ungefähr ab, was
 * ein echter Anbieter zur Domain-Verifizierung verlangt (DKIM-CNAME, Tracking-
 * CNAME, SPF/DMARC). Gleicher Name ⇒ identische Records.
 */
const mockDnsRecords = (name: string): DnsRecord[] => [
  {
    type: "CNAME",
    name: `resend._domainkey.${name}`,
    value: `resend._domainkey.${name}.dkim.demo-resend.invalid`,
    ttl: "Auto",
    status: "pending",
  },
  {
    type: "CNAME",
    name: `send.${name}`,
    value: `send.${name}.bounces.demo-resend.invalid`,
    ttl: "Auto",
    status: "pending",
  },
  {
    type: "TXT",
    name: `send.${name}`,
    value: "v=spf1 include:demo-resend.invalid ~all",
    ttl: "Auto",
    status: "pending",
  },
  {
    type: "TXT",
    name: `_dmarc.${name}`,
    value: "v=DMARC1; p=none;",
    ttl: "Auto",
    status: "pending",
  },
];

const mockDomain = (name: string): SendingDomain => ({
  id: `mock-${name}`,
  name,
  status: "pending",
  records: mockDnsRecords(name),
});

// ---------------------------------------------------------------------------
// Resend-Antwort → DnsRecord[] defensiv mappen
// ---------------------------------------------------------------------------

const mapRecords = (raw: unknown): DnsRecord[] => {
  if (!Array.isArray(raw)) return [];
  return raw.map((r) => {
    const o = (r ?? {}) as Record<string, unknown>;
    const str = (v: unknown): string | undefined =>
      typeof v === "string" ? v : v == null ? undefined : String(v);
    return {
      type: str(o.type) ?? "CNAME",
      name: str(o.name) ?? "",
      // Resend nennt den Zielwert je nach Feld "value" oder "record".
      value: str(o.value) ?? str(o.record) ?? "",
      ttl: str(o.ttl),
      priority:
        typeof o.priority === "number" ? o.priority : undefined,
      status: str(o.status),
    };
  });
};

// ---------------------------------------------------------------------------
// Sende-Domain anlegen / verifizieren / auslesen
// ---------------------------------------------------------------------------

/**
 * Sende-Domain anlegen. Echt: Resend POST /domains { name }. Mock: deterministische
 * Demo-Domain (Status 'pending') mit Demo-CNAMEs.
 */
export const createSendingDomain = async (name: string): Promise<SendingDomain> => {
  if (!emailConfigured()) return mockDomain(name);

  const res = await fetch(`${RESEND_BASE}/domains`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({ name }),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(
      `Domain konnte beim E-Mail-Anbieter nicht angelegt werden (HTTP ${res.status})${
        detail ? `: ${detail.slice(0, 200)}` : ""
      }.`
    );
  }
  const data = (await res.json()) as Record<string, unknown>;
  return {
    id: String(data.id ?? ""),
    name: typeof data.name === "string" ? data.name : name,
    status: typeof data.status === "string" ? data.status : "pending",
    records: mapRecords(data.records),
  };
};

/**
 * Sende-Domain verifizieren. Echt: Resend POST /domains/{id}/verify. Mock:
 * { status: "verified" }.
 */
export const verifySendingDomain = async (id: string): Promise<{ status: string }> => {
  if (!emailConfigured()) return { status: "verified" };

  const res = await fetch(`${RESEND_BASE}/domains/${id}/verify`, {
    method: "POST",
    headers: authHeaders(),
  });
  if (!res.ok) {
    throw new Error(
      `Verifizierung beim E-Mail-Anbieter fehlgeschlagen (HTTP ${res.status}).`
    );
  }
  const data = (await res.json()) as Record<string, unknown>;
  return { status: typeof data.status === "string" ? data.status : "pending" };
};

/**
 * Aktuellen Stand einer Sende-Domain abrufen. Echt: Resend GET /domains/{id}.
 * Mock: 'pending' mit denselben Demo-Records.
 */
export const getSendingDomain = async (id: string): Promise<SendingDomain> => {
  if (!emailConfigured()) {
    // Mock-IDs haben das Format "mock-<name>".
    const name = id.startsWith("mock-") ? id.slice("mock-".length) : id;
    return mockDomain(name);
  }

  const res = await fetch(`${RESEND_BASE}/domains/${id}`, {
    method: "GET",
    headers: authHeaders(),
  });
  if (!res.ok) {
    throw new Error(
      `Domain-Status konnte beim E-Mail-Anbieter nicht abgerufen werden (HTTP ${res.status}).`
    );
  }
  const data = (await res.json()) as Record<string, unknown>;
  return {
    id: String(data.id ?? id),
    name: typeof data.name === "string" ? data.name : "",
    status: typeof data.status === "string" ? data.status : "pending",
    records: mapRecords(data.records),
  };
};

// ---------------------------------------------------------------------------
// Dokument-E-Mail senden
// ---------------------------------------------------------------------------

/**
 * Eine E-Mail mit Anhang senden. Echt: Resend POST /emails. Mock: nur loggen,
 * kein echter Versand — liefert { id: "mock-email" }.
 */
export const sendDocumentEmail = async (opts: {
  fromName: string | null;
  fromEmail: string;
  to: string;
  subject: string;
  html: string;
  replyTo?: string | null;
  attachments: EmailAttachment[];
}): Promise<{ id: string }> => {
  const from = opts.fromName ? `${opts.fromName} <${opts.fromEmail}>` : opts.fromEmail;

  if (!emailConfigured()) {
    // Mock: kein echter Versand — nur protokollieren.
    console.info(
      `[email:mock] (kein RESEND_API_KEY) E-Mail würde gesendet: from="${from}" to="${opts.to}" subject="${opts.subject}" attachments=${opts.attachments
        .map((a) => a.filename)
        .join(", ")}`
    );
    return { id: "mock-email" };
  }

  const res = await fetch(`${RESEND_BASE}/emails`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({
      from,
      to: opts.to,
      subject: opts.subject,
      html: opts.html,
      ...(opts.replyTo ? { reply_to: opts.replyTo } : {}),
      attachments: opts.attachments.map((a) => ({
        filename: a.filename,
        content: a.contentBase64,
      })),
    }),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(
      `E-Mail konnte nicht versendet werden (HTTP ${res.status})${
        detail ? `: ${detail.slice(0, 200)}` : ""
      }.`
    );
  }
  const data = (await res.json()) as Record<string, unknown>;
  return { id: String(data.id ?? "") };
};

// ---------------------------------------------------------------------------
// Template-Rendering — pur
// ---------------------------------------------------------------------------

/**
 * Ersetzt {{key}}-Platzhalter durch Werte aus `vars`. Unbekannte Platzhalter
 * werden zu Leerstring. Leerzeichen innerhalb der Klammern werden toleriert.
 * Rein, ohne Seiteneffekte.
 */
export const renderTemplate = (tpl: string, vars: Record<string, string>): string =>
  tpl.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_m, key: string) =>
    Object.prototype.hasOwnProperty.call(vars, key) ? vars[key] : ""
  );

// ---------------------------------------------------------------------------
// Default-Vorlage (Deutsch, freundlich)
// ---------------------------------------------------------------------------

export const DEFAULT_CONTRACT_EMAIL_SUBJECT =
  "Ihr Mietvertrag {{vertragsnummer}} – {{firma}}";

export const DEFAULT_CONTRACT_EMAIL_BODY = `Guten Tag {{mieter}},

vielen Dank für Ihre Buchung bei {{firma}}.

im Anhang finden Sie Ihren Mietvertrag {{vertragsnummer}} als PDF.

Hier die wichtigsten Eckdaten Ihrer Anmietung im Überblick:

• Fahrzeug: {{fahrzeug}} ({{kennzeichen}})
• Abholung: {{abholdatum}}
• Rückgabe: {{rueckgabedatum}}

Bitte prüfen Sie den Vertrag in Ruhe. Bei Fragen oder Änderungswünschen
antworten Sie einfach auf diese E-Mail – wir helfen Ihnen gerne weiter.

Wir wünschen Ihnen eine gute Fahrt und freuen uns, Sie als Kundin oder Kunde
begrüßen zu dürfen.

Mit freundlichen Grüßen
Ihr Team von {{firma}}`;

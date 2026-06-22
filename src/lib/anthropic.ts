import Anthropic from "@anthropic-ai/sdk";
import type {
  DamageComparisonResult,
  ParsedContractData,
  ParsedCustomerData,
  ParsedTicketData,
  ParsedVehicleRegistration,
} from "./types";
import { MANUFACTURERS, FUEL_TYPES, BODY_TYPES } from "./vehicle";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });

const SYSTEM_PROMPT = `Du bist ein Experte für deutsche Bußgeldbescheide, Verwarnungsgelder und Anhörungsbögen.
Analysiere das übermittelte Bild eines Strafzettels und extrahiere alle Daten präzise.

Antworte AUSSCHLIESSLICH mit gültigem JSON in folgendem Format (keine Erklärungen, kein Markdown):
{
  "reference_nr": "Aktenzeichen oder null",
  "authority": "Vollständiger Name der Behörde",
  "plate": "Kennzeichen ohne Leerzeichen-Reorganisation, z.B. M-KP 2847",
  "vehicle_type": "Fahrzeugtyp wenn erkennbar oder null",
  "offense_date": "YYYY-MM-DD",
  "offense_time": "HH:MM oder null",
  "location": "Tatort komplett (Straße + PLZ + Ort wenn vorhanden)",
  "offense": "Kurzbezeichnung des Verstoßes",
  "offense_details": "Detaillierte Beschreibung wenn vorhanden",
  "fine_amount": Zahl in Euro (ohne Währung) oder null,
  "points": Zahl der Punkte oder 0,
  "deadline": "YYYY-MM-DD (Antwortfrist) oder null",
  "confidence": Zahl 0.0 bis 1.0 wie sicher du beim Auslesen bist
}

Wenn ein Feld nicht im Bild erkennbar ist, setze null. Schätze das Confidence-Level realistisch.`;

export const parseTicketImage = async (
  imageBase64: string,
  mediaType: "image/jpeg" | "image/png" | "image/webp" | "application/pdf"
): Promise<{ data: ParsedTicketData; raw: unknown }> => {
  const isPdf = mediaType === "application/pdf";
  const response = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 1500,
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: [
          {
            type: isPdf ? "document" : "image",
            source: { type: "base64", media_type: mediaType, data: imageBase64 },
          } as Anthropic.Messages.ContentBlockParam,
          {
            type: "text",
            text: "Extrahiere alle Daten aus diesem Strafzettel.",
          },
        ],
      },
    ],
  });

  const text = response.content
    .filter((b): b is Anthropic.Messages.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("");

  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("Claude did not return JSON: " + text.slice(0, 200));
  const data = JSON.parse(jsonMatch[0]) as ParsedTicketData;
  return { data, raw: response };
};

const CONTRACT_PROMPT = `Du bist Experte für deutsche Mietverträge von Autovermietungen.
Lies den übermittelten Mietvertrag und extrahiere alle Daten präzise.

Antworte AUSSCHLIESSLICH mit gültigem JSON (keine Erklärungen, kein Markdown):
{
  "contract_nr": "Vertragsnummer falls vorhanden, sonst null",
  "plate": "Kennzeichen, z.B. M-KP 2847",
  "vehicle_type": "Fahrzeugtyp (z.B. VW Golf VIII)",
  "renter_name": "Vollständiger Name des Mieters",
  "renter_address": "Vollständige Anschrift des Mieters",
  "renter_birthday": "YYYY-MM-DD oder null",
  "renter_license_nr": "Führerscheinnummer oder null",
  "renter_email": "E-Mail oder null",
  "renter_phone": "Telefonnummer oder null",
  "pickup_date": "YYYY-MM-DD",
  "pickup_time": "HH:MM oder null",
  "return_date": "YYYY-MM-DD",
  "return_time": "HH:MM oder null",
  "daily_rate": Tagespreis in Euro (Zahl, ohne Währung) oder null,
  "total_amount": Gesamtbetrag in Euro oder null,
  "deposit": Kaution in Euro oder null,
  "confidence": Zahl 0.0 bis 1.0
}

Wenn ein Feld nicht erkennbar ist, setze null. Datumsformat strikt YYYY-MM-DD.`;

export const parseContractImage = async (
  imageBase64: string,
  mediaType: "image/jpeg" | "image/png" | "image/webp" | "application/pdf"
): Promise<{ data: ParsedContractData; raw: unknown }> => {
  const isPdf = mediaType === "application/pdf";
  const response = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 1500,
    system: CONTRACT_PROMPT,
    messages: [
      {
        role: "user",
        content: [
          {
            type: isPdf ? "document" : "image",
            source: { type: "base64", media_type: mediaType, data: imageBase64 },
          } as Anthropic.Messages.ContentBlockParam,
          { type: "text", text: "Extrahiere alle Vertragsdaten." },
        ],
      },
    ],
  });
  const text = response.content
    .filter((b): b is Anthropic.Messages.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("");
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("Claude did not return JSON: " + text.slice(0, 200));
  const data = JSON.parse(jsonMatch[0]) as ParsedContractData;
  return { data, raw: response };
};

const CUSTOMER_PROMPT = `Du bist Experte für deutsche Personaldokumente: Personalausweis, Reisepass und EU-Führerschein.
Lies das übermittelte Foto und extrahiere alle Personendaten präzise.

Antworte AUSSCHLIESSLICH mit gültigem JSON (keine Erklärungen, kein Markdown):
{
  "document_type": "license" wenn Führerschein, "id_card" wenn Personalausweis/Reisepass, sonst null,
  "salutation": "Herr" oder "Frau" wenn aus dem Geschlecht (M/F) ableitbar, sonst null,
  "title": "akademischer Titel (Dr., Prof.) wenn auf dem Dokument, sonst null",
  "first_name": "Vorname(n)",
  "last_name": "Nachname (Geburtsname falls separat angegeben weglassen)",
  "birthday": "YYYY-MM-DD",
  "street": "Straße ohne Hausnummer (nur Personalausweis hat Adresse, Führerschein nicht)",
  "house_nr": "Hausnummer",
  "zip": "PLZ",
  "city": "Ort",
  "license_nr": "Führerscheinnummer (nur Führerschein, Feld 5)",
  "license_class": "Klassen z.B. B, BE, A1 — kommagetrennt (Feld 9)",
  "license_expiry": "YYYY-MM-DD (Ablaufdatum, Feld 4b)",
  "id_card_nr": "Ausweisnummer (nur Personalausweis/Reisepass)",
  "confidence": Zahl 0.0 bis 1.0
}

Wenn ein Feld nicht erkennbar ist, setze null. Datumsformat strikt YYYY-MM-DD.
Beachte: Auf einem deutschen Führerschein steht KEINE Adresse — nur auf dem Personalausweis.`;

export const parseCustomerDocument = async (
  imageBase64: string,
  mediaType: "image/jpeg" | "image/png" | "image/webp" | "application/pdf"
): Promise<{ data: ParsedCustomerData; raw: unknown }> => {
  const isPdf = mediaType === "application/pdf";
  const response = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 1500,
    system: CUSTOMER_PROMPT,
    messages: [
      {
        role: "user",
        content: [
          {
            type: isPdf ? "document" : "image",
            source: { type: "base64", media_type: mediaType, data: imageBase64 },
          } as Anthropic.Messages.ContentBlockParam,
          { type: "text", text: "Extrahiere alle Personendaten." },
        ],
      },
    ],
  });
  const text = response.content
    .filter((b): b is Anthropic.Messages.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("");
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("Claude did not return JSON: " + text.slice(0, 200));
  const data = JSON.parse(jsonMatch[0]) as ParsedCustomerData;
  return { data, raw: response };
};

const REGISTRATION_PROMPT = `Du bist Experte für deutsche Zulassungsbescheinigungen Teil I (Fahrzeugschein).
Lies das übermittelte Dokument (Foto oder PDF) und extrahiere ALLE Fahrzeugdaten präzise.
WICHTIG: Das ist ein FAHRZEUG-Dokument (kein Personalausweis/Führerschein) — es beschreibt das Fahrzeug selbst.

Die Felder sind mit Buchstaben/Ziffern codiert. Nutze diese Zuordnung:
- A   -> Kennzeichen (Format mit Bindestrich + Leerzeichen, z. B. EU-ML 9051)
- B   -> Datum der Erstzulassung (YYYY-MM-DD)
- D.1 -> Marke / Hersteller
- D.3 -> Handelsbezeichnung (Modell)
- E   -> Fahrzeug-Identifizierungsnummer (FIN/VIN, 17 Zeichen)
- P.3 -> Kraftstoff / Energiequelle
- P.2 -> Nennleistung in kW. ACHTUNG Format: "kW /Nenndrehzahl", z. B. "110 /3000" bedeutet 110 kW. Nimm AUSSCHLIESSLICH die Zahl VOR dem Schrägstrich. NIEMALS die Drehzahl danach mitnehmen und NIEMALS beide Zahlen zusammenhängen (also nicht 1103000, nicht 1100). Typische PKW-Leistung: 40–600 kW. Bei Unsicherheit lieber null.
- P.1 -> Hubraum in cm³
- S.1 -> Sitzplätze einschließlich Fahrersitz
- R   -> Farbe des Fahrzeugs
- 5   -> Bezeichnung des Aufbaus (z. B. Schräghecklimousine, Kombi, Geländewagen ...)
- 2.1 -> Herstellerschlüsselnummer (HSN, 4-stellig)
- 2.2 -> Typschlüsselnummer (TSN, der Code nach 2.2)
- 14  -> nationale Emissionsklasse (z. B. EURO6)
- V.7 -> CO₂ kombiniert in g/km
- G   -> Masse des Fahrzeugs in Betrieb (Leermasse) in kg
- F.1 -> technisch zulässige Gesamtmasse in kg
- 16  -> Nummer der Zulassungsbescheinigung Teil II
- L   -> Anzahl der Achsen
- T   -> Höchstgeschwindigkeit in km/h
- X   -> nächste Hauptuntersuchung (Monat/Jahr) — gib sie als YYYY-MM-01 zurück
- C.1.1 -> Name / Firmenname des Halters

Antworte AUSSCHLIESSLICH mit gültigem JSON (keine Erklärungen, kein Markdown):
{
  "plate": "Kennzeichen oder null",
  "first_registration": "YYYY-MM-DD oder null",
  "manufacturer": "Marke — wähle wenn möglich exakt einen aus: [${MANUFACTURERS.join(", ")}], sonst Originalwert",
  "model": "Handelsbezeichnung oder null",
  "vin": "FIN oder null",
  "fuel_type": "Kraftstoff — wähle exakt einen aus: [${FUEL_TYPES.join(", ")}], sonst null",
  "power_kw": Nennleistung in kW als Zahl, z. B. 110 (NUR der Wert vor dem "/", typ. 40–600), oder null,
  "displacement_ccm": Zahl oder null,
  "seats": Zahl oder null,
  "color": "deutscher Farbname normal geschrieben (z. B. Schwarz) oder null",
  "body_type": "ordne dem Aufbau den passendsten Wert zu aus: [${BODY_TYPES.join(", ")}], sonst null",
  "body_type_raw": "Original-Aufbau aus Feld 5 oder null",
  "hsn": "HSN oder null",
  "tsn": "TSN oder null",
  "emission_class": "z. B. EURO6 oder null",
  "co2_combined": Zahl oder null,
  "weight_empty": Zahl oder null,
  "weight_max": Zahl oder null,
  "zb2_number": "Nummer ZB Teil II oder null",
  "next_hu": "YYYY-MM-DD oder null",
  "num_axles": Zahl oder null,
  "max_speed": Zahl oder null,
  "owner_name": "Halter-Name oder null",
  "confidence": Zahl 0.0 bis 1.0
}

Wenn ein Feld nicht erkennbar ist, setze null. Datumsformat strikt YYYY-MM-DD. Zahlen ohne Einheit.`;

export const parseVehicleRegistration = async (
  fileBase64: string,
  mediaType: "image/jpeg" | "image/png" | "image/webp" | "application/pdf"
): Promise<{ data: ParsedVehicleRegistration; raw: unknown }> => {
  const isPdf = mediaType === "application/pdf";
  const response = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 1500,
    system: REGISTRATION_PROMPT,
    messages: [
      {
        role: "user",
        content: [
          {
            type: isPdf ? "document" : "image",
            source: { type: "base64", media_type: mediaType, data: fileBase64 },
          } as Anthropic.Messages.ContentBlockParam,
          {
            type: "text",
            text: "Extrahiere alle Fahrzeugdaten aus diesem Fahrzeugschein.",
          },
        ],
      },
    ],
  });

  const text = response.content
    .filter((b): b is Anthropic.Messages.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("");
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("Claude did not return JSON: " + text.slice(0, 200));
  const data = JSON.parse(jsonMatch[0]) as ParsedVehicleRegistration;
  return { data, raw: response };
};

const DAMAGE_PROMPT = `Du bist Experte für Fahrzeug-Schadensbegutachtung in Autovermietungen.
Vergleiche zwei Fotos der gleichen Fahrzeugposition: Foto 1 ist der Zustand bei Übergabe an den Mieter, Foto 2 bei der Rücknahme.

Suche nach NEUEN Schäden, die zwischen den Fotos aufgetreten sind:
- Kratzer, Dellen, Risse
- Lackabplatzungen, Beulen
- Beschädigungen an Stoßstangen, Spiegeln, Felgen
- Starke Verschmutzung im Innenraum (über normale Nutzung hinaus)
- Risse oder Brennlöcher in Polstern

Wichtig: Schäden die schon auf dem Übergabefoto sichtbar sind, gelten NICHT als neue Schäden.
Reflexionen, unterschiedliche Lichtverhältnisse oder Schatten sind KEINE Schäden.

Severity-Bewertung:
- "none": kein neuer Schaden erkennbar
- "minor": kleine Kratzer, leichte Verschmutzung, kosmetisch
- "major": Dellen, Risse, sichtbare strukturelle Schäden, große Verschmutzung

Antworte AUSSCHLIESSLICH mit gültigem JSON:
{
  "has_damage": true oder false,
  "description": "Kurze deutsche Beschreibung des Schadens, oder 'Keine neuen Schäden erkennbar'",
  "severity": "none" | "minor" | "major"
}`;

export const compareHandoverPhotos = async (
  beforeBase64: string,
  beforeMediaType: "image/jpeg" | "image/png" | "image/webp",
  afterBase64: string,
  afterMediaType: "image/jpeg" | "image/png" | "image/webp",
  positionLabel: string
): Promise<{ data: DamageComparisonResult; raw: unknown }> => {
  const response = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 800,
    system: DAMAGE_PROMPT,
    messages: [
      {
        role: "user",
        content: [
          { type: "text", text: `Position: ${positionLabel}. Foto 1 = Übergabe.` },
          {
            type: "image",
            source: { type: "base64", media_type: beforeMediaType, data: beforeBase64 },
          },
          { type: "text", text: "Foto 2 = Rücknahme." },
          {
            type: "image",
            source: { type: "base64", media_type: afterMediaType, data: afterBase64 },
          },
          { type: "text", text: "Vergleiche und antworte mit dem JSON-Schema." },
        ],
      },
    ],
  });

  const text = response.content
    .filter((b): b is Anthropic.Messages.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("");
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("Claude did not return JSON: " + text.slice(0, 200));
  const data = JSON.parse(jsonMatch[0]) as DamageComparisonResult;
  return { data, raw: response };
};

// =========================================================
// CSV-Spalten-Mapping per KI
// =========================================================
export const mapCsvColumns = async (args: {
  headers: string[];
  sampleRows: Record<string, string>[];
  targetFields: { key: string; label: string; hint?: string }[];
}): Promise<{ mapping: Record<string, string | null>; reasoning: string }> => {
  const { headers, sampleRows, targetFields } = args;

  const sampleText = sampleRows
    .slice(0, 5)
    .map((r, i) => `Zeile ${i + 1}: ${JSON.stringify(r)}`)
    .join("\n");

  const fieldsText = targetFields
    .map(
      (f) =>
        `- "${f.key}" (${f.label}${f.hint ? `, Format: ${f.hint}` : ""})`
    )
    .join("\n");

  const system = `Du bist ein Experte für deutsche CSV-Importe in Datenbanken.
Du bekommst die Spaltenüberschriften einer CSV und ein paar Beispielzeilen.
Du sollst jede CSV-Spalte einem der Zielfelder zuordnen ODER als nicht zuordenbar markieren.

WICHTIG:
- Erkenne deutsche UND englische Spaltennamen (z. B. "Vorname" → first_name, "first name" → first_name).
- Erkenne Abkürzungen (z. B. "Plz" → zip, "Tel" → phone, "Kfz" → plate).
- Eine CSV-Spalte mit Vor- UND Nachname zusammen darf NICHT auf nur ein Feld gemappt werden — markiere sie als null und kommentiere im reasoning.
- Bei Mehrdeutigkeit lieber null und ins reasoning schreiben.

Antworte AUSSCHLIESSLICH mit gültigem JSON:
{
  "mapping": { "<csv-spalte>": "<feld-key oder null>", ... },
  "reasoning": "Kurze deutsche Erklärung (max 2 Sätze) was du gemacht hast und ob etwas unsicher war."
}`;

  const userText = `Verfügbare Zielfelder:
${fieldsText}

CSV-Spaltenüberschriften:
${headers.map((h) => `- "${h}"`).join("\n")}

Beispieldaten:
${sampleText}

Erstelle das Mapping.`;

  const response = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 1500,
    system,
    messages: [{ role: "user", content: userText }],
  });

  const text = response.content
    .filter((b): b is Anthropic.Messages.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("");
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch)
    throw new Error("Claude did not return JSON: " + text.slice(0, 200));
  const parsed = JSON.parse(jsonMatch[0]) as {
    mapping: Record<string, string | null>;
    reasoning?: string;
  };
  // Sicherstellen, dass jede Header-Spalte einen Eintrag hat (auch wenn null)
  const fullMapping: Record<string, string | null> = {};
  for (const h of headers) fullMapping[h] = parsed.mapping?.[h] ?? null;
  return { mapping: fullMapping, reasoning: parsed.reasoning ?? "" };
};

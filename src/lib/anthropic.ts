import Anthropic from "@anthropic-ai/sdk";
import type { ParsedContractData, ParsedTicketData } from "./types";

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

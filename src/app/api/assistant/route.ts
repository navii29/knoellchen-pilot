import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { TOOLS_FOR_API, handleTool } from "@/lib/assistant-tools";

export const maxDuration = 60;

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });

const systemPrompt = (orgName: string, today: string) => `Du bist der KI-Assistent von Knöllchen-Pilot, einer SaaS-App für Autovermietungen, die Strafzettel automatisch verarbeitet.

Der angemeldete Nutzer arbeitet für: ${orgName}.
Heutiges Datum: ${today}.

Du hast Zugriff auf folgende Tools (siehe Tool-Schemas) — nutze sie um Aktionen für den Nutzer auszuführen:
- create_contract: Mietvertrag anlegen
- create_vehicle: Fahrzeug zur Flotte hinzufügen
- search_contracts: Verträge suchen (Kennzeichen, Mieter, Status, Zeitpunkt)
- search_tickets: Strafzettel suchen (Status, Kennzeichen, Datum)
- get_stats: Dashboard-Kennzahlen abrufen
- find_driver_for_date: Wer hatte das Fahrzeug an einem bestimmten Tag

Verhaltensregeln:
1. Antworte immer auf Deutsch und kurz.
2. Übersetze relative Datumsangaben ("morgen", "nächsten Montag", "25. April") in ISO-Format YYYY-MM-DD bevor du Tools aufrufst. Bei "25. April" ohne Jahresangabe nimm das aktuelle Jahr.
3. Wenn Pflichtangaben fehlen, frage konkret nach (eine Frage, nicht mehrere auf einmal).
4. Nach erfolgreicher Aktion: kurze Bestätigung. Bei Fehler: erklären was schiefging.
5. Keine Phantasie-Daten erfinden. Wenn der Nutzer nur "Golf" sagt aber kein Kennzeichen, frage nach dem Kennzeichen.
6. Bei Such-Anfragen kannst du das Ergebnis kurz zusammenfassen ("3 aktive Verträge gefunden").`;

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export const POST = async (req: Request) => {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const { data: profile } = await supabase
    .from("users")
    .select("org_id")
    .eq("id", user.id)
    .single();
  if (!profile) return NextResponse.json({ error: "No profile" }, { status: 401 });

  const body = (await req.json()) as { messages: ChatMessage[] };
  if (!Array.isArray(body.messages) || body.messages.length === 0) {
    return NextResponse.json({ error: "messages fehlen" }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data: org } = await admin
    .from("organizations")
    .select("name")
    .eq("id", profile.org_id)
    .single();
  const today = new Date().toLocaleDateString("de-DE", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const apiMessages: Anthropic.Messages.MessageParam[] = body.messages.map((m) => ({
    role: m.role,
    content: m.content,
  }));

  const ctx = { org_id: profile.org_id, admin };
  const toolCalls: Array<{ name: string; input: Record<string, unknown>; result: unknown }> = [];

  // Agent-Loop: max 5 Iterationen
  let finalText = "";
  for (let i = 0; i < 5; i++) {
    let response: Anthropic.Messages.Message;
    try {
      response = await client.messages.create({
        model: "claude-sonnet-4-6",
        max_tokens: 1500,
        system: systemPrompt(org?.name || "Ihre Autovermietung", today),
        tools: TOOLS_FOR_API as Anthropic.Messages.Tool[],
        messages: apiMessages,
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      return NextResponse.json({ error: `Claude API: ${msg}` }, { status: 500 });
    }

    if (response.stop_reason === "end_turn" || !response.content.some((b) => b.type === "tool_use")) {
      finalText = response.content
        .filter((b): b is Anthropic.Messages.TextBlock => b.type === "text")
        .map((b) => b.text)
        .join("\n");
      break;
    }

    apiMessages.push({ role: "assistant", content: response.content });

    const toolUses = response.content.filter(
      (b): b is Anthropic.Messages.ToolUseBlock => b.type === "tool_use"
    );

    const toolResults: Anthropic.Messages.ToolResultBlockParam[] = [];
    for (const tu of toolUses) {
      const result = await handleTool(tu.name, tu.input as Record<string, unknown>, ctx);
      toolCalls.push({ name: tu.name, input: tu.input as Record<string, unknown>, result });
      toolResults.push({
        type: "tool_result",
        tool_use_id: tu.id,
        content: JSON.stringify(result),
        is_error: !result.ok,
      });
    }
    apiMessages.push({ role: "user", content: toolResults });
  }

  return NextResponse.json({
    message: finalText || "—",
    tool_calls: toolCalls,
  });
};

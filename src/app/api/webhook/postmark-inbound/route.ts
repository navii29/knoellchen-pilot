import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { slugFromInboundAddress } from "@/lib/slug";
import { parseTicketImage } from "@/lib/anthropic";
import { nextTicketNr } from "@/lib/utils";

export const maxDuration = 60;

const STRAFZETTEL_KEYWORDS = [
  "anhörungsbogen",
  "bußgeldbescheid",
  "verwarnung",
  "ordnungswidrigkeit",
  "zeugenfragebogen",
  "fahrerermittlung",
  "bußgeldstelle",
  "verwarnungsgeld",
  "geschwindigkeitsüberschreitung",
  "parkverstoß",
  "rotlichtverstoß",
  "ordnungsamt",
  "polizeipräsidium",
  "kreisverwaltungsreferat",
  "bußgeld",
  "tatvorwurf",
  "aktenzeichen",
  "owi",
  "verkehrsordnungswidrigkeit",
];

interface PostmarkAttachment {
  Name: string;
  Content: string;
  ContentType: string;
  ContentLength: number;
}

interface PostmarkInbound {
  From: string;
  FromName?: string;
  To: string;
  ToFull?: Array<{ Email: string; Name?: string }>;
  Subject: string;
  TextBody?: string;
  HtmlBody?: string;
  Attachments?: PostmarkAttachment[];
  MessageID: string;
  Date?: string;
}

const looksLikeTicket = (subject: string, text: string): boolean => {
  const haystack = (subject + " " + text).toLowerCase();
  return STRAFZETTEL_KEYWORDS.some((k) => haystack.includes(k));
};

const isProcessableAttachment = (a: PostmarkAttachment): boolean => {
  const t = a.ContentType.toLowerCase();
  return (
    t === "application/pdf" ||
    t.startsWith("image/") ||
    a.Name.toLowerCase().endsWith(".pdf")
  );
};

const extensionForAttachment = (a: PostmarkAttachment): string => {
  const fromName = a.Name.split(".").pop()?.toLowerCase();
  if (fromName && fromName.length <= 5) return fromName;
  if (a.ContentType === "application/pdf") return "pdf";
  if (a.ContentType === "image/png") return "png";
  if (a.ContentType === "image/jpeg" || a.ContentType === "image/jpg") return "jpg";
  if (a.ContentType === "image/webp") return "webp";
  return "bin";
};

export const POST = async (req: Request) => {
  const url = new URL(req.url);
  const expectedToken = process.env.POSTMARK_WEBHOOK_SECRET;
  if (expectedToken) {
    const provided = url.searchParams.get("token") || req.headers.get("x-postmark-secret");
    if (provided !== expectedToken) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  let payload: PostmarkInbound;
  try {
    payload = (await req.json()) as PostmarkInbound;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  // To-Adresse → Slug → Org
  const recipients = payload.ToFull?.map((r) => r.Email) ?? [payload.To];
  const admin = createAdminClient();

  let orgId: string | null = null;
  for (const r of recipients) {
    const slug = slugFromInboundAddress(r);
    if (!slug) continue;
    const { data: org } = await admin
      .from("organizations")
      .select("id, slug")
      .eq("slug", slug)
      .maybeSingle();
    if (org) {
      orgId = org.id;
      break;
    }
  }

  if (!orgId) {
    console.warn("[postmark-inbound] No org found for", recipients.join(","));
    return NextResponse.json({ ok: true, ignored: "no_org_match" });
  }

  // Strafzettel-Filter: Keyword im Subject/Body ODER PDF/Bild-Anhang
  const matchesKeyword = looksLikeTicket(payload.Subject || "", payload.TextBody || "");
  const attachments = (payload.Attachments || []).filter(isProcessableAttachment);

  if (!matchesKeyword && attachments.length === 0) {
    console.warn("[postmark-inbound] Mail does not look like a ticket:", payload.Subject);
    return NextResponse.json({ ok: true, ignored: "not_a_ticket" });
  }

  const ticketNr = nextTicketNr();
  let uploadPath: string | null = null;

  if (attachments.length > 0) {
    const a = attachments[0]; // ersten relevanten Anhang nehmen
    const ext = extensionForAttachment(a);
    const path = `${orgId}/${ticketNr}/upload.${ext}`;
    const buf = Buffer.from(a.Content, "base64");
    const { error: upErr } = await admin.storage
      .from("ticket-uploads")
      .upload(path, buf, { contentType: a.ContentType, upsert: true });
    if (upErr) {
      console.error("[postmark-inbound] Storage upload failed:", upErr.message);
    } else {
      uploadPath = path;
    }
  }

  // Behörden-E-Mail aus From-Header (klassisches "Name <email>" oder reine Adresse)
  const fromMatch = payload.From.match(/<([^>]+)>/);
  const authorityEmail = (fromMatch ? fromMatch[1] : payload.From).trim().toLowerCase();

  const { data: ticket, error: insErr } = await admin
    .from("tickets")
    .insert({
      org_id: orgId,
      ticket_nr: ticketNr,
      status: "neu",
      source: "email",
      upload_path: uploadPath,
      inbound_email_id: payload.MessageID,
      authority_email: authorityEmail,
      authority: payload.FromName || null,
      processing_fee: 25,
      notes: payload.Subject ? `Betreff: ${payload.Subject}` : null,
    })
    .select("id, ticket_nr")
    .single();

  if (insErr || !ticket) {
    console.error("[postmark-inbound] Ticket insert failed:", insErr?.message);
    return NextResponse.json({ error: insErr?.message || "Insert failed" }, { status: 500 });
  }

  await admin.from("ticket_logs").insert({
    ticket_id: ticket.id,
    action: "inbound",
    details: {
      from: payload.From,
      subject: payload.Subject,
      message_id: payload.MessageID,
      attachments: (payload.Attachments || []).map((a) => ({
        name: a.Name,
        type: a.ContentType,
        size: a.ContentLength,
      })),
    },
  });

  // KI-Auslesung + Match — best effort, Fehler nicht an Postmark weiterleiten (sonst Retry)
  if (uploadPath) {
    try {
      const { data: file } = await admin.storage
        .from("ticket-uploads")
        .download(uploadPath);
      if (file) {
        const buf = Buffer.from(await file.arrayBuffer());
        const ext = uploadPath.split(".").pop()?.toLowerCase();
        const mediaType =
          ext === "pdf"
            ? "application/pdf"
            : ext === "png"
            ? "image/png"
            : ext === "webp"
            ? "image/webp"
            : "image/jpeg";
        const parsed = await parseTicketImage(
          buf.toString("base64"),
          mediaType as "image/jpeg" | "image/png" | "image/webp" | "application/pdf"
        );
        const d = parsed.data;
        await admin
          .from("tickets")
          .update({
            reference_nr: d.reference_nr || null,
            authority: d.authority || payload.FromName || null,
            plate: d.plate || null,
            vehicle_type: d.vehicle_type || null,
            offense_date: d.offense_date || null,
            offense_time: d.offense_time || null,
            location: d.location || null,
            offense: d.offense || null,
            offense_details: d.offense_details || null,
            fine_amount: d.fine_amount ?? null,
            points: d.points ?? 0,
            deadline: d.deadline || null,
            ai_confidence: d.confidence ?? 0.9,
            ai_raw_response: parsed.raw as Record<string, unknown>,
            updated_at: new Date().toISOString(),
          })
          .eq("id", ticket.id);
        await admin.from("ticket_logs").insert({
          ticket_id: ticket.id,
          action: "parsed",
          details: { confidence: d.confidence ?? 0.9 },
        });

        // Match aus Verträgen
        if (d.plate && d.offense_date) {
          const normPlate = d.plate.toUpperCase().replace(/\s+/g, " ").trim();
          const altPlate = normPlate.replace(/\s+/g, "");
          const { data: matches } = await admin
            .from("contracts")
            .select("*")
            .eq("org_id", orgId)
            .or(`plate.eq.${normPlate},plate.eq.${altPlate}`)
            .lte("pickup_date", d.offense_date)
            .order("pickup_date", { ascending: false });
          const match = (matches ?? []).find((c) => {
            const end = c.actual_return_date ?? c.return_date;
            return end >= d.offense_date!;
          });
          if (match) {
            await admin
              .from("tickets")
              .update({
                contract_id: match.id,
                renter_name: match.renter_name,
                renter_email: match.renter_email,
                status: "zugeordnet",
                updated_at: new Date().toISOString(),
              })
              .eq("id", ticket.id);
            await admin.from("ticket_logs").insert({
              ticket_id: ticket.id,
              action: "matched",
              details: {
                renter_name: match.renter_name,
                contract_id: match.id,
                contract_nr: match.contract_nr,
              },
            });
          }
        }
      }
    } catch (e) {
      console.error("[postmark-inbound] Parse/match failed:", e instanceof Error ? e.message : e);
    }
  }

  return NextResponse.json({ ok: true, ticket_id: ticket.id, ticket_nr: ticket.ticket_nr });
};

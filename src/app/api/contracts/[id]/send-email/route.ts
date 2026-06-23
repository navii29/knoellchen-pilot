import { NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { logActivity } from "@/lib/activity";
import { loadCustomerForContract } from "@/lib/contract-loaders";
import {
  emailConfigured,
  renderTemplate,
  sendDocumentEmail,
  DEFAULT_CONTRACT_EMAIL_SUBJECT,
  DEFAULT_CONTRACT_EMAIL_BODY,
} from "@/lib/email";
import { customerDisplayName } from "@/lib/customer";
import { fmtDate } from "@/lib/utils";
import type { Contract, Organization } from "@/lib/types";

export const maxDuration = 30;

// ---------------------------------------------------------------------------
// Auth-Helfer — wie in den Schwester-Routen.
// ---------------------------------------------------------------------------
const requireAuth = async () => {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: profile } = await supabase
    .from("users")
    .select("org_id")
    .eq("id", user.id)
    .single();
  return profile ? { user, org_id: profile.org_id } : null;
};

// Body-Text → einfaches HTML (Zeilenumbrüche → <br>, HTML-Escaping gegen Breakout).
const escapeHtml = (s: string): string =>
  s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

const textToHtml = (text: string): string =>
  `<div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;font-size:14px;line-height:1.6;color:#1c1917;">${escapeHtml(
    text
  ).replace(/\n/g, "<br>")}</div>`;

// ---------------------------------------------------------------------------
// POST /api/contracts/[id]/send-email
// Mietvertrag samt PDF per E-Mail an den Kunden senden. Operative Aktion —
// jedes authentifizierte Org-Mitglied darf sie auslösen. Strikt org-scoped.
// ---------------------------------------------------------------------------
export const POST = async (_req: Request, { params }: { params: { id: string } }) => {
  const auth = await requireAuth();
  if (!auth) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  const { user, org_id: orgId } = auth;

  const admin = createAdminClient();

  // --- Vertrag laden — STRIKT org-scoped (Multi-Tenant-Isolation) ---
  const { data: contractRow } = await admin
    .from("contracts")
    .select("*")
    .eq("id", params.id)
    .eq("org_id", orgId)
    .maybeSingle();
  if (!contractRow)
    return NextResponse.json({ error: "Vertrag nicht gefunden." }, { status: 404 });
  const c = contractRow as Contract;

  // --- Empfänger ermitteln: Kunden-E-Mail (org-scoped) bzw. renter_email ---
  const customer = await loadCustomerForContract(admin, orgId, c.customer_id);
  const to = (customer?.email || c.renter_email || "").trim();
  if (!to)
    return NextResponse.json(
      { error: "Keine E-Mail-Adresse für den Mieter hinterlegt." },
      { status: 400 }
    );

  // --- Organisation laden (org-scoped) für Absender + Status + Vorlage ---
  const { data: orgRow } = await admin
    .from("organizations")
    .select(
      "name, sender_email, sender_name, email_domain_status, contract_email_subject, contract_email_body"
    )
    .eq("id", orgId)
    .single();
  if (!orgRow)
    return NextResponse.json({ error: "Organisation fehlt." }, { status: 500 });
  const org = orgRow as Pick<
    Organization,
    | "name"
    | "sender_email"
    | "sender_name"
    | "email_domain_status"
    | "contract_email_subject"
    | "contract_email_body"
  >;

  // --- Konfiguration prüfen: verifizierte Domain (oder Mock-Modus) + Absender ---
  const fromEmail = (org.sender_email || "").trim();
  const domainVerified = org.email_domain_status === "verified" || !emailConfigured();
  if (!domainVerified || !fromEmail)
    return NextResponse.json(
      { error: "E-Mail-Versand ist noch nicht konfiguriert (Einstellungen → E-Mail-Versand)." },
      { status: 400 }
    );

  // --- Vertrags-PDF beschaffen: bevorzugt die signierte Fassung (generated-docs),
  //     sonst das hochgeladene/erzeugte PDF (contract-uploads). ---
  let pdfBytes: ArrayBuffer | null = null;
  if (c.signed_contract_path) {
    const { data } = await admin.storage
      .from("generated-docs")
      .download(c.signed_contract_path);
    if (data) pdfBytes = await data.arrayBuffer();
  }
  if (!pdfBytes && c.contract_pdf_path) {
    const { data } = await admin.storage
      .from("contract-uploads")
      .download(c.contract_pdf_path);
    if (data) pdfBytes = await data.arrayBuffer();
  }
  if (!pdfBytes)
    return NextResponse.json(
      { error: "Kein Vertrags-PDF vorhanden — bitte zuerst erzeugen/signieren." },
      { status: 400 }
    );
  const contentBase64 = Buffer.from(pdfBytes).toString("base64");

  // --- Platzhalter aus Vertrag/Kunde befüllen ---
  const mieter =
    (customer ? customerDisplayName(customer) : "") || c.renter_name || "";
  const vars: Record<string, string> = {
    mieter,
    firma: org.name ?? "",
    kennzeichen: c.plate ?? "",
    fahrzeug: c.vehicle_type ?? "",
    vertragsnummer: c.contract_nr ?? "",
    abholdatum: c.pickup_date ? fmtDate(c.pickup_date) : "",
    rueckgabedatum: c.return_date ? fmtDate(c.return_date) : "",
  };

  const subject = renderTemplate(
    org.contract_email_subject || DEFAULT_CONTRACT_EMAIL_SUBJECT,
    vars
  );
  const bodyText = renderTemplate(
    org.contract_email_body || DEFAULT_CONTRACT_EMAIL_BODY,
    vars
  );
  const html = textToHtml(bodyText);

  // --- Versenden — Fehler des Anbieters sauber als 502 melden ---
  try {
    await sendDocumentEmail({
      fromName: org.sender_name,
      fromEmail,
      to,
      subject,
      html,
      replyTo: fromEmail,
      attachments: [
        { filename: `Mietvertrag-${c.contract_nr}.pdf`, contentBase64 },
      ],
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "E-Mail konnte nicht versendet werden.";
    return NextResponse.json({ error: message }, { status: 502 });
  }

  // --- Erfolg am Vertrag vermerken — org-scoped ---
  const now = new Date().toISOString();
  const { error: updateErr } = await admin
    .from("contracts")
    .update({ email_sent_at: now, email_sent_to: to, updated_at: now })
    .eq("id", params.id)
    .eq("org_id", orgId); // SECURITY: multi-tenant isolation
  if (updateErr)
    return NextResponse.json({ error: updateErr.message }, { status: 500 });

  await logActivity(admin, user.id, orgId, "contract.email_sent", c.contract_nr);

  return NextResponse.json({ ok: true, sent_to: to });
};

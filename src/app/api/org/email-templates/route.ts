import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { ownerOnly } from "@/lib/team";
import {
  EMAIL_TEMPLATE_CATALOG,
  isEmailTemplateKey,
  resolveTemplate,
  type EmailTemplateKey,
} from "@/lib/email-templates";

// ---------------------------------------------------------------------------
// /api/org/email-templates — Verwaltung der E-Mail-Vorlagen-Bibliothek.
// NUR Inhaber (ownerOnly). Strikt org-scoped (Multi-Tenant-Isolation).
//
//   GET            → je Katalog-Schlüssel die aufgelöste Vorlage
//                    { key, subject, body, isCustom }
//   PUT  / POST    → Override speichern  { key, subject, body }
//   DELETE ?key=…  → Override löschen (zurück auf Standard)
//
// Override-Quellen für 'contract' (Rückwärtskompatibilität): es gilt zuerst die
// neue Tabelle email_templates; existiert dort keine Zeile, greift als Fallback
// das alte organizations.contract_email_subject/body. Beim Speichern/Löschen
// schreiben/räumen wir BEIDE Stellen für 'contract', damit nichts „doppelt“
// hängen bleibt.
// ---------------------------------------------------------------------------

type OverrideRow = { subject: string | null; body: string | null };

const hasText = (v: string | null | undefined): boolean =>
  typeof v === "string" && v.trim().length > 0;

// ---------------------------------------------------------------------------
// GET
// ---------------------------------------------------------------------------
export const GET = async () => {
  const gate = await ownerOnly();
  if (!gate.ok) return gate.res;
  const { orgId } = gate.m;

  const admin = createAdminClient();

  // Alle Overrides dieser Org laden — org-scoped.
  const { data: rows } = await admin
    .from("email_templates")
    .select("template_key, subject, body")
    .eq("org_id", orgId); // SECURITY: multi-tenant isolation
  const overrideByKey = new Map<string, OverrideRow>();
  for (const r of (rows ?? []) as {
    template_key: string;
    subject: string | null;
    body: string | null;
  }[]) {
    overrideByKey.set(r.template_key, { subject: r.subject, body: r.body });
  }

  // Legacy-Fallback für 'contract': altes organizations.contract_email_*.
  let legacyContract: OverrideRow | null = null;
  if (!overrideByKey.has("contract")) {
    const { data: org } = await admin
      .from("organizations")
      .select("contract_email_subject, contract_email_body")
      .eq("id", orgId) // SECURITY: multi-tenant isolation
      .single();
    if (org && (hasText(org.contract_email_subject) || hasText(org.contract_email_body))) {
      legacyContract = {
        subject: org.contract_email_subject ?? null,
        body: org.contract_email_body ?? null,
      };
    }
  }

  const templates = EMAIL_TEMPLATE_CATALOG.map((entry) => {
    const override =
      overrideByKey.get(entry.key) ??
      (entry.key === "contract" ? legacyContract : null);
    const isCustom = !!override && (hasText(override.subject) || hasText(override.body));
    const resolved = resolveTemplate(override, entry.key);
    return {
      key: entry.key,
      label: entry.label,
      description: entry.description,
      attachesPdf: entry.attachesPdf,
      subject: resolved.subject,
      body: resolved.body,
      isCustom,
    };
  });

  return NextResponse.json({ ok: true, templates });
};

// ---------------------------------------------------------------------------
// PUT / POST — Override speichern (upsert)
// ---------------------------------------------------------------------------
const upsert = async (req: Request) => {
  const gate = await ownerOnly();
  if (!gate.ok) return gate.res;
  const { orgId } = gate.m;

  const body = (await req.json().catch(() => ({}))) as {
    key?: unknown;
    subject?: unknown;
    body?: unknown;
    action?: unknown;
  };

  // Komfort: { action: 'reset' } darf auch via POST/PUT ein Reset auslösen.
  if (body.action === "reset") return resetTemplate(orgId, body.key);

  const key = body.key;
  if (!isEmailTemplateKey(key))
    return NextResponse.json({ error: "Unbekannte Vorlage." }, { status: 400 });

  const subject = typeof body.subject === "string" ? body.subject : null;
  const text = typeof body.body === "string" ? body.body : null;

  const admin = createAdminClient();
  const now = new Date().toISOString();

  const { error } = await admin
    .from("email_templates")
    .upsert(
      { org_id: orgId, template_key: key, subject, body: text, updated_at: now },
      { onConflict: "org_id,template_key" }
    ); // SECURITY: org_id im Payload + (org_id, template_key) PK
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // 'contract' zusätzlich in die Legacy-Spalten spiegeln, damit der bestehende
  // Versand (der bei fehlender Tabelle weiterhin diese Spalten liest) konsistent
  // bleibt.
  if (key === "contract") {
    await admin
      .from("organizations")
      .update({ contract_email_subject: subject, contract_email_body: text })
      .eq("id", orgId); // SECURITY: multi-tenant isolation
  }

  return NextResponse.json({ ok: true });
};

export const PUT = upsert;
export const POST = upsert;

// ---------------------------------------------------------------------------
// DELETE ?key=…  — Override löschen → Standard
// ---------------------------------------------------------------------------
export const DELETE = async (req: Request) => {
  const gate = await ownerOnly();
  if (!gate.ok) return gate.res;
  const { orgId } = gate.m;

  const url = new URL(req.url);
  let key: unknown = url.searchParams.get("key");
  if (!isEmailTemplateKey(key)) {
    // Fallback: Schlüssel im JSON-Body { key, action:'reset' }.
    const json = (await req.json().catch(() => ({}))) as { key?: unknown };
    key = json.key;
  }
  return resetTemplate(orgId, key);
};

// ---------------------------------------------------------------------------
// Gemeinsamer Reset-Pfad (org-scoped) — löscht die Override-Zeile und räumt für
// 'contract' auch die Legacy-Spalten ab.
// ---------------------------------------------------------------------------
const resetTemplate = async (orgId: string, key: unknown) => {
  if (!isEmailTemplateKey(key))
    return NextResponse.json({ error: "Unbekannte Vorlage." }, { status: 400 });

  const admin = createAdminClient();
  const { error } = await admin
    .from("email_templates")
    .delete()
    .eq("org_id", orgId) // SECURITY: multi-tenant isolation
    .eq("template_key", key as EmailTemplateKey);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  if (key === "contract") {
    await admin
      .from("organizations")
      .update({ contract_email_subject: null, contract_email_body: null })
      .eq("id", orgId); // SECURITY: multi-tenant isolation
  }

  return NextResponse.json({ ok: true });
};

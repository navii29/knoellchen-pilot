import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { ownerOnly } from "@/lib/team";
import { logActivity } from "@/lib/activity";
import { runCreditCheck, type CreditSubject } from "@/lib/credit-bureau";
import { customerDisplayName } from "@/lib/customer";
import type { Customer } from "@/lib/types";

// ---------------------------------------------------------------------------
// POST /api/customers/[id]/credit-check
// Externe Bonitätsauskunft (kostenpflichtig, extern) — NUR Inhaber.
// Body: { consent?: boolean }
// ---------------------------------------------------------------------------
export const POST = async (
  req: Request,
  { params }: { params: { id: string } }
) => {
  // --- Owner-Gate (Konfiguration UND Auslösen sind Inhaber-exklusiv) ---
  const gate = await ownerOnly();
  if (!gate.ok) return gate.res;
  const { userId, orgId } = gate.m;

  const body = (await req.json().catch(() => ({}))) as { consent?: boolean };

  const admin = createAdminClient();

  // --- Kunde laden — STRIKT org-scoped (Multi-Tenant-Isolation) ---
  const { data: customer } = await admin
    .from("customers")
    .select("*")
    .eq("id", params.id)
    .eq("org_id", orgId)
    .maybeSingle();

  if (!customer)
    return NextResponse.json({ error: "Kunde nicht gefunden." }, { status: 404 });
  const c = customer as Customer;

  // --- Einwilligung: nur mit Consent (aktuell oder bereits gespeichert) ---
  if (body.consent !== true && c.credit_consent !== true)
    return NextResponse.json(
      { error: "Einwilligung zur Bonitätsprüfung fehlt." },
      { status: 409 }
    );

  // --- Anbieter-Konfiguration der Org laden — serverseitig, nie zurückgeben ---
  const { data: org } = await admin
    .from("organizations")
    .select("credit_provider, credit_api_key, credit_api_url")
    .eq("id", orgId)
    .single();

  const provider = (org?.credit_provider as string | null) ?? null;
  const apiKey = (org?.credit_api_key as string | null) ?? null;
  const apiUrl = (org?.credit_api_url as string | null) ?? null;

  // --- Subjekt aus den Kundendaten aufbauen ---
  const personName = [c.first_name, c.last_name].filter(Boolean).join(" ").trim();
  const subject: CreditSubject = {
    name: c.company_name || personName || customerDisplayName(c) || c.last_name,
    company: c.company_name,
    birthday: c.birthday,
    street: [c.street, c.house_nr].filter(Boolean).join(" ").trim() || null,
    zip: c.zip,
    city: c.city,
    country: c.country,
  };

  // --- Prüfung ausführen (Fehler dürfen die Route nicht crashen) ---
  let result;
  try {
    result = await runCreditCheck({ provider, apiKey, apiUrl, subject });
  } catch (e) {
    const message =
      e instanceof Error ? e.message : "Bonitätsprüfung fehlgeschlagen.";
    return NextResponse.json({ error: message }, { status: 502 });
  }

  // --- Ergebnis am Kunden persistieren — org-scoped ---
  const now = new Date().toISOString();
  const update: Record<string, unknown> = {
    credit_score: result.score,
    credit_rating: result.rating,
    credit_decision: result.decision,
    credit_provider: result.provider,
    credit_checked_at: now,
    credit_raw: result.raw,
    updated_at: now,
  };
  if (body.consent === true) update.credit_consent = true;

  const { error: updateErr } = await admin
    .from("customers")
    .update(update)
    .eq("id", params.id)
    .eq("org_id", orgId);

  if (updateErr)
    return NextResponse.json({ error: updateErr.message }, { status: 500 });

  // --- Aktivität protokollieren (best-effort) ---
  await logActivity(
    admin,
    userId,
    orgId,
    "customer.credit_check",
    customerDisplayName(c) || c.last_name
  );

  // --- Antwort: KEIN raw, KEIN API-Key ---
  return NextResponse.json({
    ok: true,
    credit: {
      provider: result.provider,
      score: result.score,
      rating: result.rating,
      decision: result.decision,
      summary: result.summary,
    },
  });
};

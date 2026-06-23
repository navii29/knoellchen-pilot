import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { ownerOnly } from "@/lib/team";
import {
  createSendingDomain,
  getSendingDomain,
  verifySendingDomain,
} from "@/lib/email";

// ---------------------------------------------------------------------------
// POST /api/org/email-domain
// Sende-Domain anlegen / verifizieren / Status auffrischen. NUR Inhaber.
// Body: { action: "create" | "verify" | "refresh"; domain?: string }
//
// Sicherheit: RESEND_API_KEY wird ausschließlich serverseitig (in lib/email)
// aus der Env gelesen. Hier werden nur die unkritischen Felder (Domain-ID /
// DNS-Records / Status) — org-scoped — auf der Organisation gespeichert.
// ---------------------------------------------------------------------------
export const POST = async (req: Request) => {
  const gate = await ownerOnly();
  if (!gate.ok) return gate.res;
  const { orgId } = gate.m;

  const body = (await req.json().catch(() => ({}))) as {
    action?: string;
    domain?: string;
  };
  const action = (body.action ?? "").trim();

  const admin = createAdminClient();

  // -------------------------------------------------------------------------
  // create — neue Sende-Domain beim Anbieter anlegen
  // -------------------------------------------------------------------------
  if (action === "create") {
    const domain = (body.domain ?? "")
      .trim()
      .toLowerCase()
      .replace(/^https?:\/\//, "")
      .replace(/\/.*$/, "");
    if (!domain || !/^[a-z0-9][a-z0-9.-]*\.[a-z]{2,}$/.test(domain)) {
      return NextResponse.json(
        { error: "Bitte eine gültige Domain angeben (z. B. mein-autohaus.de)." },
        { status: 400 }
      );
    }

    let sd;
    try {
      sd = await createSendingDomain(domain);
    } catch (e) {
      const message = e instanceof Error ? e.message : "Domain konnte nicht angelegt werden.";
      return NextResponse.json({ error: message }, { status: 502 });
    }

    const status = sd.status || "pending";
    const { error } = await admin
      .from("organizations")
      .update({
        email_provider: "resend",
        email_domain: sd.name,
        email_domain_id: sd.id,
        email_dns_records: sd.records,
        email_domain_status: status,
      })
      .eq("id", orgId); // SECURITY: multi-tenant isolation
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({
      ok: true,
      domain: sd.name,
      status,
      records: sd.records,
    });
  }

  // -------------------------------------------------------------------------
  // verify / refresh — bestehende Domain prüfen / Status auffrischen
  // -------------------------------------------------------------------------
  if (action === "verify" || action === "refresh") {
    const { data: org } = await admin
      .from("organizations")
      .select("email_domain_id")
      .eq("id", orgId) // SECURITY: multi-tenant isolation
      .single();
    const domainId = (org?.email_domain_id as string | null) ?? null;
    if (!domainId) {
      return NextResponse.json(
        { error: "Noch keine Sende-Domain angelegt." },
        { status: 400 }
      );
    }

    if (action === "verify") {
      let result;
      try {
        result = await verifySendingDomain(domainId);
      } catch (e) {
        const message = e instanceof Error ? e.message : "Verifizierung fehlgeschlagen.";
        return NextResponse.json({ error: message }, { status: 502 });
      }
      const status = result.status || "pending";
      const { error } = await admin
        .from("organizations")
        .update({ email_domain_status: status })
        .eq("id", orgId); // SECURITY: multi-tenant isolation
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ ok: true, status });
    }

    // refresh
    let sd;
    try {
      sd = await getSendingDomain(domainId);
    } catch (e) {
      const message = e instanceof Error ? e.message : "Status konnte nicht geladen werden.";
      return NextResponse.json({ error: message }, { status: 502 });
    }
    const status = sd.status || "pending";
    const { error } = await admin
      .from("organizations")
      .update({ email_domain_status: status, email_dns_records: sd.records })
      .eq("id", orgId); // SECURITY: multi-tenant isolation
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, status, records: sd.records });
  }

  return NextResponse.json(
    { error: "Unbekannte Aktion. Erwartet: create | verify | refresh." },
    { status: 400 }
  );
};

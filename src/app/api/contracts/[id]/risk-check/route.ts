import { NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { logActivity } from "@/lib/activity";
import { runRiskCheck } from "@/lib/risk-check.server";

// ---------------------------------------------------------------------------
// Auth helper — matches the pattern used by sibling routes
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

// ---------------------------------------------------------------------------
// POST /api/contracts/[id]/risk-check
// Body: { consent?: boolean; action?: "override"; reason?: string }
// ---------------------------------------------------------------------------
export const POST = async (
  req: Request,
  { params }: { params: { id: string } }
) => {
  const auth = await requireAuth();
  if (!auth)
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const { user, org_id: orgId } = auth;

  const body = (await req.json().catch(() => ({}))) as {
    consent?: boolean;
    action?: string;
    reason?: string;
  };

  const admin = createAdminClient();

  // -------------------------------------------------------------------------
  // Load contract — STRICT org-scope
  // -------------------------------------------------------------------------
  const { data: contract } = await admin
    .from("contracts")
    .select("*")
    .eq("id", params.id)
    .eq("org_id", orgId)        // SECURITY: multi-tenant isolation
    .maybeSingle();

  if (!contract)
    return NextResponse.json({ error: "Vertrag nicht gefunden." }, { status: 404 });

  // =========================================================================
  // Branch A — manual override
  // =========================================================================
  if (body.action === "override") {
    if (!contract.risk_level)
      return NextResponse.json(
        { error: "Noch keine Risikoprüfung vorhanden." },
        { status: 400 }
      );

    const reason = body.reason?.trim() ?? "";
    if (!reason)
      return NextResponse.json(
        { error: "Begründung (reason) darf nicht leer sein." },
        { status: 400 }
      );

    const now = new Date().toISOString();
    const { error: updateErr } = await admin
      .from("contracts")
      .update({
        risk_override_by: user.id,
        risk_override_at: now,
        risk_override_reason: reason,
        updated_at: now,
      })
      .eq("id", params.id)
      .eq("org_id", orgId);     // SECURITY: multi-tenant isolation

    if (updateErr)
      return NextResponse.json({ error: updateErr.message }, { status: 500 });

    // best-effort activity log
    await logActivity(admin, user.id, orgId, "contract.risk_override", contract.contract_nr);

    return NextResponse.json({ ok: true, overridden: true });
  }

  // =========================================================================
  // Branch B — run the risk check
  // =========================================================================

  // --- 1. Consent gate ---
  if (body.consent !== true && contract.risk_consent !== true)
    return NextResponse.json(
      { error: "Einwilligung zur Risikoprüfung fehlt." },
      { status: 409 }
    );

  // --- 2–7. Delegate to shared orchestration (org-scoped, persist included) ---
  const risk = await runRiskCheck(admin, orgId, params.id, {
    setConsent: body.consent === true,
  });

  if (!risk)
    return NextResponse.json({ error: "Vertrag nicht gefunden." }, { status: 404 });

  // --- 8. Activity log (best-effort, must not break response) ---
  await logActivity(
    admin,
    user.id,
    orgId,
    "contract.risk_check",
    contract.contract_nr ?? null
  );

  // --- 9. Return result ---
  return NextResponse.json({ ok: true, risk });
};

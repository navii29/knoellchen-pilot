import { NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import {
  assembleRiskSignals,
  deriveHeuristicScore,
} from "@/lib/risk";
import { assessRentalRisk } from "@/lib/anthropic";
import { logActivity } from "@/lib/activity";

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

  // --- 2. Load customer (org-scoped) ---
  let customer: {
    license_nr: string | null;
    license_photo_path: string | null;
    license_expiry: string | null;
    id_card_nr: string | null;
    id_card_photo_path: string | null;
    birthday: string | null;
    first_name: string | null;
    last_name: string | null;
    company_name: string | null;
    street: string | null;
    zip: string | null;
    city: string | null;
    email: string | null;
    phone: string | null;
  } | null = null;

  if (contract.customer_id) {
    const { data: cust } = await admin
      .from("customers")
      .select(
        "license_nr, license_photo_path, license_expiry, id_card_nr, id_card_photo_path, birthday, first_name, last_name, company_name, street, zip, city, email, phone"
      )
      .eq("id", contract.customer_id)
      .eq("org_id", orgId)      // SECURITY: multi-tenant isolation
      .maybeSingle();
    customer = cust ?? null;
  }

  // --- 3. Gather history counts (all org-scoped) ---
  const today = new Date().toISOString().slice(0, 10);

  // priorContracts: other contracts of this customer in the org (exclude current)
  let priorContracts = 0;
  let overdueUnpaid = 0;

  if (contract.customer_id) {
    // Count OTHER contracts of this customer (exclude current contract)
    const { count: cCount } = await admin
      .from("contracts")
      .select("id", { count: "exact", head: true })
      .eq("org_id", orgId)                      // SECURITY: multi-tenant isolation
      .eq("customer_id", contract.customer_id)
      .neq("id", params.id);
    priorContracts = cCount ?? 0;

    // Overdue & unpaid: return_date < today AND payment_status = 'offen'
    const { count: oCount } = await admin
      .from("contracts")
      .select("id", { count: "exact", head: true })
      .eq("org_id", orgId)                      // SECURITY: multi-tenant isolation
      .eq("customer_id", contract.customer_id)
      .eq("payment_status", "offen")
      .lt("return_date", today);
    overdueUnpaid = oCount ?? 0;
  } else if (contract.renter_name) {
    // Fallback: match by renter_name when no customer_id is linked
    const { count: cCount } = await admin
      .from("contracts")
      .select("id", { count: "exact", head: true })
      .eq("org_id", orgId)                      // SECURITY: multi-tenant isolation
      .eq("renter_name", contract.renter_name)
      .neq("id", params.id);
    priorContracts = cCount ?? 0;

    const { count: oCount } = await admin
      .from("contracts")
      .select("id", { count: "exact", head: true })
      .eq("org_id", orgId)                      // SECURITY: multi-tenant isolation
      .eq("renter_name", contract.renter_name)
      .eq("payment_status", "offen")
      .lt("return_date", today);
    overdueUnpaid = oCount ?? 0;
  }

  // priorDamages: damage_reports linked via contract_id to this customer's contracts
  // The damage_reports table links to contracts via contract_id (org_id on damage_reports).
  // We look up damage_reports that belong to this org (org_id on damage_reports) and
  // whose contract_id matches one of the customer's contracts. When customer_id is
  // known we can look for damage_reports with a matching contract; otherwise we use
  // the current contract's plate as a proxy via vehicle_id is not stable, so we
  // use the org_id + plate cross-join approach — we default 0 on doubt.
  let priorDamages = 0;
  if (contract.customer_id) {
    // Get IDs of this customer's contracts (org-scoped), then count damage_reports
    const { data: custContracts } = await admin
      .from("contracts")
      .select("id")
      .eq("org_id", orgId)                      // SECURITY: multi-tenant isolation
      .eq("customer_id", contract.customer_id);

    const contractIds = (custContracts ?? []).map((c: { id: string }) => c.id);
    if (contractIds.length > 0) {
      const { count: dCount } = await admin
        .from("damage_reports")
        .select("id", { count: "exact", head: true })
        .eq("org_id", orgId)                    // SECURITY: multi-tenant isolation
        .in("contract_id", contractIds);
      priorDamages = dCount ?? 0;
    }
  } else if (contract.plate) {
    // Fallback proxy: damage_reports by org and plate (via vehicle lookup)
    // damage_reports has vehicle_id but not plate directly; get vehicle_id for
    // this plate in the org, then count damage_reports for that vehicle.
    const { data: veh } = await admin
      .from("vehicles")
      .select("id")
      .eq("org_id", orgId)                      // SECURITY: multi-tenant isolation
      .eq("plate", contract.plate)
      .maybeSingle();
    if (veh?.id) {
      const { count: dCount } = await admin
        .from("damage_reports")
        .select("id", { count: "exact", head: true })
        .eq("org_id", orgId)                    // SECURITY: multi-tenant isolation
        .eq("vehicle_id", veh.id);
      // Comment: this counts all damage_reports for the vehicle, not strictly
      // per-renter — it is used only as a proxy signal when no customer_id is set.
      priorDamages = dCount ?? 0;
    }
    // else: default 0
  }

  // openTickets: unpaid tickets (paid = false) linked to this customer's plate(s)
  // Tickets table has: org_id, plate, paid (boolean), contract_id.
  // The cleanest org-scoped proxy: tickets for this org where paid = false
  // and plate matches the current contract's plate (or any plate driven by this
  // customer via their contracts).
  let openTickets = 0;
  if (contract.customer_id) {
    // Collect all plates driven by this customer in the org
    const { data: custPlates } = await admin
      .from("contracts")
      .select("plate")
      .eq("org_id", orgId)                      // SECURITY: multi-tenant isolation
      .eq("customer_id", contract.customer_id);

    const plates = [
      ...new Set((custPlates ?? []).map((c: { plate: string }) => c.plate)),
    ];
    if (plates.length > 0) {
      const { count: tCount } = await admin
        .from("tickets")
        .select("id", { count: "exact", head: true })
        .eq("org_id", orgId)                    // SECURITY: multi-tenant isolation
        .eq("paid", false)
        .in("plate", plates);
      openTickets = tCount ?? 0;
    }
  } else if (contract.plate) {
    // Fallback: count unpaid tickets for this specific plate in the org
    const { count: tCount } = await admin
      .from("tickets")
      .select("id", { count: "exact", head: true })
      .eq("org_id", orgId)                      // SECURITY: multi-tenant isolation
      .eq("paid", false)
      .eq("plate", contract.plate);
    openTickets = tCount ?? 0;
  }

  // --- 4. Assemble risk signals ---
  const signals = assembleRiskSignals({
    renterName: contract.renter_name ?? null,
    customer,
    history: { priorContracts, overdueUnpaid, priorDamages, openTickets },
    finance: {
      total_amount: contract.total_amount ?? null,
      deposit: contract.deposit ?? null,
    },
  });

  // --- 5. Heuristic score ---
  const heuristic = deriveHeuristicScore(signals);

  // --- 6. AI risk assessment (never throws — falls back to heuristic internally) ---
  const result = await assessRentalRisk(signals, heuristic);

  // --- 7. Persist (org-scoped) ---
  const now = new Date().toISOString();
  const persistUpdate: Record<string, unknown> = {
    risk_level: result.level,
    risk_score: result.score,
    risk_summary: result.summary,
    risk_factors: result.factors,
    risk_checked_at: now,
    updated_at: now,
  };
  if (body.consent === true) {
    persistUpdate.risk_consent = true;
  }

  const { error: persistErr } = await admin
    .from("contracts")
    .update(persistUpdate)
    .eq("id", params.id)
    .eq("org_id", orgId);       // SECURITY: multi-tenant isolation

  if (persistErr)
    return NextResponse.json({ error: persistErr.message }, { status: 500 });

  // --- 8. Activity log (best-effort, must not break response) ---
  await logActivity(
    admin,
    user.id,
    orgId,
    "contract.risk_check",
    contract.contract_nr ?? null
  );

  // --- 9. Return result ---
  return NextResponse.json({ ok: true, risk: result });
};

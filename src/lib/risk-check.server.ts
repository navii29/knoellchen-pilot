/**
 * risk-check.server.ts — shared orchestration for the rental-risk check.
 *
 * Called from BOTH the org-member API route (POST /api/contracts/[id]/risk-check)
 * and the customer portal sign route (POST /api/portal/contracts/[id]/sign),
 * which uses a portal-session and cannot call the org-member API directly.
 *
 * SECURITY: every query must be scoped to `orgId` — no cross-tenant leakage.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { assembleRiskSignals, deriveHeuristicScore, type RiskResult } from "@/lib/risk";
import { assessRentalRisk } from "@/lib/anthropic";

export const runRiskCheck = async (
  admin: SupabaseClient,
  orgId: string,
  contractId: string,
  opts?: { setConsent?: boolean }
): Promise<RiskResult | null> => {
  // -------------------------------------------------------------------------
  // 1. Load contract — STRICT org-scope
  // -------------------------------------------------------------------------
  const { data: contract } = await admin
    .from("contracts")
    .select("*")
    .eq("id", contractId)
    .eq("org_id", orgId) // SECURITY: multi-tenant isolation
    .maybeSingle();

  if (!contract) return null;

  // -------------------------------------------------------------------------
  // 2. Load customer (org-scoped) if linked
  // -------------------------------------------------------------------------
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
      .eq("org_id", orgId) // SECURITY: multi-tenant isolation
      .maybeSingle();
    customer = cust ?? null;
  }

  // -------------------------------------------------------------------------
  // 3. Gather history counts (all org-scoped)
  // -------------------------------------------------------------------------
  const today = new Date().toISOString().slice(0, 10);

  let priorContracts = 0;
  let overdueUnpaid = 0;

  if (contract.customer_id) {
    // Count OTHER contracts of this customer (exclude current contract)
    const { count: cCount } = await admin
      .from("contracts")
      .select("id", { count: "exact", head: true })
      .eq("org_id", orgId) // SECURITY: multi-tenant isolation
      .eq("customer_id", contract.customer_id)
      .neq("id", contractId);
    priorContracts = cCount ?? 0;

    // Overdue & unpaid: return_date < today AND payment_status = 'offen'
    const { count: oCount } = await admin
      .from("contracts")
      .select("id", { count: "exact", head: true })
      .eq("org_id", orgId) // SECURITY: multi-tenant isolation
      .eq("customer_id", contract.customer_id)
      .eq("payment_status", "offen")
      .lt("return_date", today);
    overdueUnpaid = oCount ?? 0;
  } else if (contract.renter_name) {
    // Fallback: match by renter_name when no customer_id is linked
    const { count: cCount } = await admin
      .from("contracts")
      .select("id", { count: "exact", head: true })
      .eq("org_id", orgId) // SECURITY: multi-tenant isolation
      .eq("renter_name", contract.renter_name)
      .neq("id", contractId);
    priorContracts = cCount ?? 0;

    const { count: oCount } = await admin
      .from("contracts")
      .select("id", { count: "exact", head: true })
      .eq("org_id", orgId) // SECURITY: multi-tenant isolation
      .eq("renter_name", contract.renter_name)
      .eq("payment_status", "offen")
      .lt("return_date", today);
    overdueUnpaid = oCount ?? 0;
  }

  // priorDamages: damage_reports linked via contract_id to this customer's contracts
  let priorDamages = 0;
  if (contract.customer_id) {
    const { data: custContracts } = await admin
      .from("contracts")
      .select("id")
      .eq("org_id", orgId) // SECURITY: multi-tenant isolation
      .eq("customer_id", contract.customer_id);

    const contractIds = (custContracts ?? []).map((c: { id: string }) => c.id);
    if (contractIds.length > 0) {
      const { count: dCount } = await admin
        .from("damage_reports")
        .select("id", { count: "exact", head: true })
        .eq("org_id", orgId) // SECURITY: multi-tenant isolation
        .in("contract_id", contractIds);
      priorDamages = dCount ?? 0;
    }
  } else if (contract.plate) {
    // Fallback proxy: damage_reports by org and vehicle plate
    const { data: veh } = await admin
      .from("vehicles")
      .select("id")
      .eq("org_id", orgId) // SECURITY: multi-tenant isolation
      .eq("plate", contract.plate)
      .maybeSingle();
    if (veh?.id) {
      const { count: dCount } = await admin
        .from("damage_reports")
        .select("id", { count: "exact", head: true })
        .eq("org_id", orgId) // SECURITY: multi-tenant isolation
        .eq("vehicle_id", veh.id);
      priorDamages = dCount ?? 0;
    }
  }

  // openTickets: unpaid tickets linked to this customer's plate(s)
  let openTickets = 0;
  if (contract.customer_id) {
    const { data: custPlates } = await admin
      .from("contracts")
      .select("plate")
      .eq("org_id", orgId) // SECURITY: multi-tenant isolation
      .eq("customer_id", contract.customer_id);

    const plates = [
      ...new Set((custPlates ?? []).map((c: { plate: string }) => c.plate)),
    ];
    if (plates.length > 0) {
      const { count: tCount } = await admin
        .from("tickets")
        .select("id", { count: "exact", head: true })
        .eq("org_id", orgId) // SECURITY: multi-tenant isolation
        .eq("paid", false)
        .in("plate", plates);
      openTickets = tCount ?? 0;
    }
  } else if (contract.plate) {
    // Fallback: count unpaid tickets for this specific plate in the org
    const { count: tCount } = await admin
      .from("tickets")
      .select("id", { count: "exact", head: true })
      .eq("org_id", orgId) // SECURITY: multi-tenant isolation
      .eq("paid", false)
      .eq("plate", contract.plate);
    openTickets = tCount ?? 0;
  }

  // -------------------------------------------------------------------------
  // 4. Assemble risk signals
  // -------------------------------------------------------------------------
  const signals = assembleRiskSignals({
    renterName: contract.renter_name ?? null,
    customer,
    history: { priorContracts, overdueUnpaid, priorDamages, openTickets },
    finance: {
      total_amount: contract.total_amount ?? null,
      deposit: contract.deposit ?? null,
    },
  });

  // -------------------------------------------------------------------------
  // 5. Heuristic score
  // -------------------------------------------------------------------------
  const heuristic = deriveHeuristicScore(signals);

  // -------------------------------------------------------------------------
  // 6. AI risk assessment (never throws — falls back to heuristic internally)
  // -------------------------------------------------------------------------
  const result = await assessRentalRisk(signals, heuristic);

  // -------------------------------------------------------------------------
  // 7. Persist (org-scoped)
  // -------------------------------------------------------------------------
  const now = new Date().toISOString();
  const persistUpdate: Record<string, unknown> = {
    risk_level: result.level,
    risk_score: result.score,
    risk_summary: result.summary,
    risk_factors: result.factors,
    risk_checked_at: now,
    updated_at: now,
  };
  if (opts?.setConsent) {
    persistUpdate.risk_consent = true;
  }

  await admin
    .from("contracts")
    .update(persistUpdate)
    .eq("id", contractId)
    .eq("org_id", orgId); // SECURITY: multi-tenant isolation

  return result;
};

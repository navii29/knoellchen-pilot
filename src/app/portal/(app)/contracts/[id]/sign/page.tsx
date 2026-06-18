import { notFound, redirect } from "next/navigation";
import { getPortalCustomer } from "@/lib/portal-auth";
import { createAdminClient } from "@/lib/supabase/server";
import { loadSpecialTermsForContract } from "@/lib/contract-loaders";
import { DEFAULT_RENTAL_TERMS } from "@/lib/rental-terms";
import { PortalSignClient } from "./PortalSignClient";
import type { Contract } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function PortalSignPage({
  params,
}: {
  params: { id: string };
}) {
  const ctx = await getPortalCustomer();
  if (!ctx) return null;

  const admin = createAdminClient();
  const { data: contract } = await admin
    .from("contracts")
    .select("*")
    .eq("id", params.id)
    .eq("org_id", ctx.session.org_id)
    .eq("customer_id", ctx.session.customer_id)
    .maybeSingle();
  if (!contract) notFound();
  const c = contract as Contract;
  if (c.signed_at) redirect(`/portal/contracts/${c.id}`);

  const { data: org } = await admin
    .from("organizations")
    .select("rental_terms")
    .eq("id", ctx.session.org_id)
    .single();
  const specialTerms = await loadSpecialTermsForContract(
    admin,
    ctx.session.org_id,
    c.selected_special_terms
  );

  return (
    <PortalSignClient
      contractId={c.id}
      contractNr={c.contract_nr}
      plate={c.plate}
      vehicleType={c.vehicle_type}
      rentalTerms={(org?.rental_terms as string | null) ?? DEFAULT_RENTAL_TERMS}
      specialTerms={specialTerms.map((t) => ({ id: t.id, title: t.title, text: t.text }))}
    />
  );
}

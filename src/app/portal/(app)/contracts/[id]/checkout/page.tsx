import { notFound, redirect } from "next/navigation";
import { getPortalCustomer } from "@/lib/portal-auth";
import { createAdminClient } from "@/lib/supabase/server";
import { CheckoutClient } from "./CheckoutClient";
import type { Contract, HandoverPosition } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function CheckoutPage({
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

  if (c.status === "abgeschlossen") {
    redirect(`/portal/contracts/${c.id}?checkout=done`);
  }

  const { data: photos } = await admin
    .from("handover_photos")
    .select("position")
    .eq("contract_id", c.id)
    .eq("type", "return");
  const uploadedPositions = ((photos ?? []) as { position: HandoverPosition }[]).map(
    (p) => p.position
  );

  return (
    <CheckoutClient
      contractId={c.id}
      contractNr={c.contract_nr}
      plate={c.plate}
      vehicleType={c.vehicle_type}
      kmPickup={c.km_pickup}
      kmLimit={c.km_limit}
      fuelLevelPickup={c.fuel_level_pickup}
      initialStep={c.checkout_step ?? 0}
      uploadedPositions={uploadedPositions}
    />
  );
}

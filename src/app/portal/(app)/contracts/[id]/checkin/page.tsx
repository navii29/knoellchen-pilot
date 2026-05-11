import { notFound } from "next/navigation";
import { getPortalCustomer } from "@/lib/portal-auth";
import { createAdminClient } from "@/lib/supabase/server";
import { CheckinClient } from "./CheckinClient";
import type { Contract, HandoverPosition } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function CheckinPage({
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

  const { data: photos } = await admin
    .from("handover_photos")
    .select("position")
    .eq("contract_id", c.id)
    .eq("type", "pickup");
  const uploadedPositions = ((photos ?? []) as { position: HandoverPosition }[]).map(
    (p) => p.position
  );

  return (
    <CheckinClient
      contractId={c.id}
      contractNr={c.contract_nr}
      vehicleType={c.vehicle_type}
      plate={c.plate}
      pickupDate={c.pickup_date}
      returnDate={c.return_date}
      dailyRate={c.daily_rate}
      totalAmount={c.total_amount}
      deposit={c.deposit}
      initialStep={c.checkin_step ?? 0}
      alreadySigned={!!c.signed_at}
      uploadedPositions={uploadedPositions}
    />
  );
}

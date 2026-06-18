import { notFound } from "next/navigation";
import { loadPortalContract } from "@/lib/portal-contract-guard";
import { IncidentClient } from "@/components/portal/IncidentClient";

export const dynamic = "force-dynamic";

export default async function SchadenPage({ params }: { params: { id: string } }) {
  const ctx = await loadPortalContract(params.id);
  if (!ctx) notFound();

  return (
    <IncidentClient
      contractId={params.id}
      plate={ctx.contract.plate}
      vehicleType={ctx.contract.vehicle_type ?? null}
    />
  );
}

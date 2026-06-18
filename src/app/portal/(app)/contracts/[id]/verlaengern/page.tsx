import { notFound } from "next/navigation";
import { loadPortalContract } from "@/lib/portal-contract-guard";
import { ExtendClient } from "@/components/portal/ExtendClient";

export const dynamic = "force-dynamic";

export default async function VerlaengernPage({ params }: { params: { id: string } }) {
  const ctx = await loadPortalContract(params.id);
  if (!ctx) notFound();

  return (
    <ExtendClient
      contractId={params.id}
      plate={ctx.contract.plate}
      vehicleType={ctx.contract.vehicle_type ?? null}
      currentReturnDate={ctx.contract.return_date}
      dailyRate={ctx.contract.daily_rate ?? null}
    />
  );
}

import { notFound, redirect } from "next/navigation";
import { requirePortal } from "@/lib/portal-auth";
import { NachtragSignClient } from "./NachtragSignClient";

export const dynamic = "force-dynamic";

export default async function NachtragSignPage({
  params,
}: {
  params: { id: string; extId: string };
}) {
  const ctx = await requirePortal();
  if (!ctx) return null;

  // Eigene Verlängerung laden — explizit org/customer-gescoped (zusätzlich zur
  // RLS "portal own extensions"). Mieter-Isolation.
  const { data: ext } = await ctx.supa
    .from("contract_extensions")
    .select("id, status, addendum_pdf_path, addendum_signed_at, requested_return_date")
    .eq("id", params.extId)
    .eq("contract_id", params.id)
    .eq("org_id", ctx.session.org_id)
    .eq("customer_id", ctx.session.customer_id)
    .maybeSingle();
  if (!ext) notFound();

  // Server-Gate (dreifache Absicherung): nur ein genehmigter, mit PDF
  // versehener, NOCH UNSIGNIERTER Nachtrag ist signierbar. Sonst zurück zur
  // Vertragsseite (kein Signieren eines schon signierten/ungenehmigten Nachtrags).
  if (ext.status !== "bestaetigt" || !ext.addendum_pdf_path || ext.addendum_signed_at != null) {
    redirect(`/portal/contracts/${params.id}`);
  }

  const { data: contract } = await ctx.supa
    .from("contracts")
    .select("contract_nr, plate, vehicle_type")
    .eq("id", params.id)
    .eq("org_id", ctx.session.org_id)
    .eq("customer_id", ctx.session.customer_id)
    .maybeSingle();
  if (!contract) notFound();

  return (
    <NachtragSignClient
      contractId={params.id}
      extId={params.extId}
      contractNr={(contract.contract_nr as string) ?? ""}
      plate={(contract.plate as string) ?? ""}
      vehicleType={(contract.vehicle_type as string | null) ?? null}
      newReturnDate={(ext.requested_return_date as string) ?? ""}
    />
  );
}

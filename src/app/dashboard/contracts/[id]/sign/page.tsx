import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SignClient } from "./SignClient";
import type { Contract } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function SignContractPage({
  params,
}: {
  params: { id: string };
}) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) notFound();

  const { data: contract } = await supabase
    .from("contracts")
    .select("*")
    .eq("id", params.id)
    .maybeSingle();
  if (!contract) notFound();
  const c = contract as Contract;

  if (c.signed_at) {
    // Bereits signiert → zurück zur Detail-Seite
    redirect(`/dashboard/contracts/${c.id}?signed=already`);
  }

  return (
    <SignClient
      contractId={c.id}
      contractNr={c.contract_nr}
      renterName={c.renter_name}
      plate={c.plate}
    />
  );
}

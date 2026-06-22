import { createClient } from "@/lib/supabase/server";
import { Topbar } from "@/components/dashboard/Topbar";
import { ContractsList } from "./ContractsList";
import { myRole } from "@/lib/team";
import { redactContractPartner } from "@/lib/redact";
import type { Contract } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function ContractsPage() {
  const supabase = createClient();
  const isOwner = (await myRole()) === "owner";
  const { data } = await supabase
    .from("contracts")
    .select("*")
    .order("pickup_date", { ascending: false })
    .limit(500);
  // Partner-Verrechnung für Mitarbeiter aus dem Client-Payload entfernen.
  const contracts = ((data || []) as Contract[]).map((c) =>
    redactContractPartner(c, isOwner)
  );
  return (
    <>
      <Topbar section="Verträge" />
      <div className="flex-1 overflow-auto scroll-thin bg-canvas p-4 md:p-10">
        <div className="max-w-6xl mx-auto">
          <ContractsList initial={contracts} />
        </div>
      </div>
    </>
  );
}

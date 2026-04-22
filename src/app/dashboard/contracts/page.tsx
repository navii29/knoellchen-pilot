import { createClient } from "@/lib/supabase/server";
import { Topbar } from "@/components/dashboard/Topbar";
import { ContractsList } from "./ContractsList";
import type { Contract } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function ContractsPage() {
  const supabase = createClient();
  const { data } = await supabase
    .from("contracts")
    .select("*")
    .order("pickup_date", { ascending: false })
    .limit(500);
  return (
    <>
      <Topbar section="Verträge" />
      <div className="flex-1 overflow-auto scroll-thin bg-stone-50 p-6 md:p-10">
        <div className="max-w-6xl mx-auto">
          <ContractsList initial={(data || []) as Contract[]} />
        </div>
      </div>
    </>
  );
}

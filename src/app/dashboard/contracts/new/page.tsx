import { Topbar } from "@/components/dashboard/Topbar";
import { createClient } from "@/lib/supabase/server";
import { NewContractClient } from "./NewContractClient";
import type { Customer } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function NewContractPage({
  searchParams,
}: {
  searchParams: { customer_id?: string };
}) {
  const supabase = createClient();
  const { data } = await supabase
    .from("customers")
    .select("*")
    .order("last_name", { ascending: true });

  return (
    <>
      <Topbar section="Neuer Vertrag" />
      <div className="flex-1 overflow-auto scroll-thin bg-stone-50 p-6 md:p-10">
        <div className="max-w-3xl mx-auto">
          <NewContractClient
            customers={(data || []) as Customer[]}
            initialCustomerId={searchParams.customer_id || null}
          />
        </div>
      </div>
    </>
  );
}

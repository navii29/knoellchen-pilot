import { Topbar } from "@/components/dashboard/Topbar";
import { createClient } from "@/lib/supabase/server";
import { NewContractClient } from "./NewContractClient";
import type { Customer } from "@/lib/types";
import type { SalesPartner } from "@/lib/partners";

export const dynamic = "force-dynamic";

export default async function NewContractPage({
  searchParams,
}: {
  searchParams: { customer_id?: string };
}) {
  const supabase = createClient();
  const [{ data: customers }, { data: partners }] = await Promise.all([
    supabase.from("customers").select("*").order("last_name", { ascending: true }),
    supabase
      .from("sales_partners")
      .select("*")
      .eq("active", true)
      .order("name", { ascending: true }),
  ]);

  return (
    <>
      <Topbar section="Neuer Vertrag" />
      <div className="flex-1 overflow-auto scroll-thin bg-stone-50 p-4 md:p-10">
        <div className="max-w-3xl mx-auto">
          <NewContractClient
            customers={(customers || []) as Customer[]}
            partners={(partners || []) as SalesPartner[]}
            initialCustomerId={searchParams.customer_id || null}
          />
        </div>
      </div>
    </>
  );
}

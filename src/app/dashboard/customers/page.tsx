import { createClient } from "@/lib/supabase/server";
import { Topbar } from "@/components/dashboard/Topbar";
import { CustomersList } from "./CustomersList";
import type { Customer } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function CustomersPage() {
  const supabase = createClient();
  const { data } = await supabase
    .from("customers")
    .select("*")
    .order("last_name", { ascending: true })
    .limit(1000);
  return (
    <>
      <Topbar section="Kunden" />
      <div className="flex-1 overflow-auto scroll-thin bg-stone-50 p-4 md:p-10">
        <div className="max-w-6xl mx-auto">
          <CustomersList initial={(data || []) as Customer[]} />
        </div>
      </div>
    </>
  );
}

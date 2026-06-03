import { createClient } from "@/lib/supabase/server";
import { Topbar } from "@/components/dashboard/Topbar";
import { PartnersList } from "./PartnersList";
import type { SalesPartner } from "@/lib/partners";

export const dynamic = "force-dynamic";

export default async function PartnersPage() {
  const supabase = createClient();
  const { data } = await supabase
    .from("sales_partners")
    .select("*")
    .order("active", { ascending: false })
    .order("name", { ascending: true });

  return (
    <>
      <Topbar section="Partner" />
      <div className="flex-1 overflow-auto scroll-thin bg-zinc-50 p-4 md:p-10">
        <div className="max-w-5xl mx-auto">
          <PartnersList initial={(data ?? []) as SalesPartner[]} />
        </div>
      </div>
    </>
  );
}

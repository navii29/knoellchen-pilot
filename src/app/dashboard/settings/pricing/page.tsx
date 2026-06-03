import { Topbar } from "@/components/dashboard/Topbar";
import { PricingClient } from "./PricingClient";
import { createClient } from "@/lib/supabase/server";
import type { PricingRule } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function PricingSettingsPage() {
  const supabase = createClient();
  const { data } = await supabase
    .from("pricing_rules")
    .select("*")
    .order("active", { ascending: false })
    .order("created_at", { ascending: false });

  return (
    <>
      <Topbar section="Preisregeln" />
      <div className="flex-1 overflow-auto scroll-thin bg-zinc-50 p-4 md:p-10">
        <div className="max-w-4xl mx-auto">
          <PricingClient initialRules={(data ?? []) as PricingRule[]} />
        </div>
      </div>
    </>
  );
}

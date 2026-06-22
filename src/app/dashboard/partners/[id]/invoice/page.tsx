import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Topbar } from "@/components/dashboard/Topbar";
import { InvoiceClient } from "./InvoiceClient";
import { requireOwnerPage } from "@/lib/team";
import type { SalesPartner } from "@/lib/partners";

export const dynamic = "force-dynamic";

export default async function PartnerInvoicePage({
  params,
}: {
  params: { id: string };
}) {
  await requireOwnerPage(); // Partner-Abrechnung nur für Inhaber
  const supabase = createClient();
  const { data: partner } = await supabase
    .from("sales_partners")
    .select("*")
    .eq("id", params.id)
    .maybeSingle();
  if (!partner) notFound();

  return (
    <>
      <Topbar section={`Provisionsabrechnung · ${(partner as SalesPartner).name}`} />
      <div className="flex-1 overflow-auto scroll-thin bg-canvas p-4 md:p-10">
        <div className="max-w-4xl mx-auto">
          <InvoiceClient partner={partner as SalesPartner} />
        </div>
      </div>
    </>
  );
}

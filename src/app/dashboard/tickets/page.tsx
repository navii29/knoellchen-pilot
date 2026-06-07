import { createClient } from "@/lib/supabase/server";
import { Topbar } from "@/components/dashboard/Topbar";
import { TicketTable } from "@/components/dashboard/TicketTable";
import { PageHeader } from "@/components/ui/PageHeader";
import type { Ticket } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function TicketsListPage() {
  const supabase = createClient();
  const { data } = await supabase
    .from("tickets")
    .select("*")
    .order("created_at", { ascending: false });
  const tickets = (data || []) as Ticket[];
  return (
    <>
      <Topbar section="Strafzettel" />
      <div className="flex-1 overflow-auto scroll-thin bg-canvas p-4 md:p-10">
        <div className="max-w-6xl mx-auto space-y-6">
          <PageHeader
            kicker="Strafzettel"
            title="Leitstelle"
            description="Alle eingehenden Bescheide — ausgelesen, zugeordnet, weiterbelastet."
          />
          <TicketTable tickets={tickets} />
        </div>
      </div>
    </>
  );
}

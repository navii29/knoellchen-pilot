import { createClient } from "@/lib/supabase/server";
import { Topbar } from "@/components/dashboard/Topbar";
import { TicketTable } from "@/components/dashboard/TicketTable";
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
      <div className="flex-1 overflow-auto scroll-thin bg-stone-50 p-6 md:p-10">
        <div className="max-w-6xl mx-auto">
          <div className="font-display font-bold text-2xl tracking-tight mb-4">Alle Strafzettel</div>
          <TicketTable tickets={tickets} />
        </div>
      </div>
    </>
  );
}

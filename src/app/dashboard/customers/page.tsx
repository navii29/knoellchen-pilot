import { createClient } from "@/lib/supabase/server";
import { Topbar } from "@/components/dashboard/Topbar";
import { CustomersList } from "./CustomersList";
import type { Customer } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function CustomersPage() {
  const supabase = createClient();

  // ALLE Kunden laden — nicht nur die ersten 1.000. PostgREST cappt einen
  // einzelnen Request bei 1.000 Zeilen, daher blockweise per range() nachladen,
  // bis nichts mehr kommt. Safety-Cap (MAX) schützt vor Riesen-Orgs. So stimmen
  // client-seitige Zähler/Suche über den GESAMTEN Bestand (vorher: stilles
  // 1.000er-Limit → bei vielen Kunden "verschwanden" Einträge).
  const PAGE = 1000;
  const MAX = 10000;
  const rows: Customer[] = [];
  for (let from = 0; from < MAX; from += PAGE) {
    const { data, error } = await supabase
      .from("customers")
      .select("*")
      .order("last_name", { ascending: true })
      .range(from, from + PAGE - 1);
    if (error || !data || data.length === 0) break;
    rows.push(...(data as Customer[]));
    if (data.length < PAGE) break;
  }
  return (
    <>
      <Topbar section="Kunden" />
      <div className="flex-1 overflow-auto scroll-thin bg-canvas p-4 md:p-10">
        <div className="max-w-6xl mx-auto">
          <CustomersList initial={rows} />
        </div>
      </div>
    </>
  );
}

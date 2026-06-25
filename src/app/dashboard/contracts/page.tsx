import { createClient } from "@/lib/supabase/server";
import { Topbar } from "@/components/dashboard/Topbar";
import { ContractsList } from "./ContractsList";
import { myRole } from "@/lib/team";
import { redactContractPartner } from "@/lib/redact";
import type { Contract } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function ContractsPage() {
  const supabase = createClient();
  const isOwner = (await myRole()) === "owner";

  // ALLE Verträge laden — nicht nur die ersten 500. PostgREST cappt einen
  // einzelnen Request bei 1.000 Zeilen, daher blockweise per range() nachladen,
  // bis nichts mehr kommt. Safety-Cap (MAX) schützt vor Riesen-Orgs; reicht für
  // mehrere tausend Verträge. So stimmen client-seitige Zähler/Suche/Filter
  // über den GESAMTEN Bestand (vorher: stilles 500er-Limit → Importe wirkten
  // "nicht hochgeladen", Badges zeigten nur die geladenen 500).
  const PAGE = 1000;
  const MAX = 10000;
  const rows: Contract[] = [];
  for (let from = 0; from < MAX; from += PAGE) {
    const { data, error } = await supabase
      .from("contracts")
      .select("*")
      .order("pickup_date", { ascending: false })
      .range(from, from + PAGE - 1);
    if (error || !data || data.length === 0) break;
    rows.push(...(data as Contract[]));
    if (data.length < PAGE) break;
  }
  // Partner-Verrechnung für Mitarbeiter aus dem Client-Payload entfernen.
  const contracts = rows.map((c) => redactContractPartner(c, isOwner));
  return (
    <>
      <Topbar section="Verträge" />
      <div className="flex-1 overflow-auto scroll-thin bg-canvas p-4 md:p-10">
        <div className="max-w-6xl mx-auto">
          <ContractsList initial={contracts} />
        </div>
      </div>
    </>
  );
}

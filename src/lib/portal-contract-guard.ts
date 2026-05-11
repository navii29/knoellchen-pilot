import { createAdminClient } from "@/lib/supabase/server";
import { getPortalSession, type PortalSession } from "@/lib/portal-auth";
import type { Contract } from "@/lib/types";

export type PortalContractCtx = {
  session: PortalSession;
  contract: Contract;
  admin: ReturnType<typeof createAdminClient>;
};

// Lädt den Vertrag und prüft Org+Customer-Zuordnung. Liefert null wenn
// nicht authentifiziert oder Vertrag nicht zum eingeloggten Kunden gehört.
export const loadPortalContract = async (
  contractId: string
): Promise<PortalContractCtx | null> => {
  const session = await getPortalSession();
  if (!session) return null;

  const admin = createAdminClient();
  const { data } = await admin
    .from("contracts")
    .select("*")
    .eq("id", contractId)
    .eq("org_id", session.org_id)
    .eq("customer_id", session.customer_id)
    .maybeSingle();
  if (!data) return null;

  return { session, contract: data as Contract, admin };
};

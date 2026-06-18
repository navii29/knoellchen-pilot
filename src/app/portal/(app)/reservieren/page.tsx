import { getPortalCustomer } from "@/lib/portal-auth";
import { createAdminClient } from "@/lib/supabase/server";
import { ReserveClient } from "@/components/portal/ReserveClient";

export const dynamic = "force-dynamic";

export default async function ReservierenPage() {
  const ctx = await getPortalCustomer();
  if (!ctx) return null;

  // Fahrzeugliste serverseitig (Admin, nur unbedenkliche Spalten — keine
  // Portal-RLS auf vehicles, da dort sensible Felder liegen).
  const admin = createAdminClient();
  const { data: vehicles } = await admin
    .from("vehicles")
    .select("id, plate, vehicle_type")
    .eq("org_id", ctx.session.org_id)
    .order("vehicle_type", { ascending: true })
    .limit(300);

  return (
    <ReserveClient
      vehicles={(vehicles ?? []).map((v) => ({
        id: v.id as string,
        plate: v.plate as string,
        vehicle_type: (v.vehicle_type as string | null) ?? null,
      }))}
    />
  );
}

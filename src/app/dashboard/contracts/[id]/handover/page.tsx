import { notFound } from "next/navigation";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { Topbar } from "@/components/dashboard/Topbar";
import { HandoverClient } from "./HandoverClient";
import type { Contract, HandoverPhoto, HandoverPhotoType, DamageSeverity } from "@/lib/types";
import type { HandoverMarker } from "./HandoverClient";

export const dynamic = "force-dynamic";

export default async function HandoverPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { tab?: string };
}) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) notFound();

  const { data: contract } = await supabase
    .from("contracts")
    .select("*")
    .eq("id", params.id)
    .maybeSingle();
  if (!contract) notFound();
  const c = contract as Contract;

  const { data: photoRows } = await supabase
    .from("handover_photos")
    .select("*")
    .eq("contract_id", c.id);
  const photos = (photoRows ?? []) as HandoverPhoto[];

  const admin = createAdminClient();
  const photosWithUrl: Array<HandoverPhoto & { url: string | null }> = await Promise.all(
    photos.map(async (p) => {
      const { data: signed } = await admin.storage
        .from("handover-photos")
        .createSignedUrl(p.photo_path, 3600);
      return { ...p, url: signed?.signedUrl || null };
    })
  );

  // Kunden-E-Mail (org-scoped) für den „Per E-Mail senden"-Knopf im Protokoll.
  let customerEmail: string | null = c.renter_email;
  if (c.customer_id) {
    const { data: cust } = await supabase
      .from("customers")
      .select("email")
      .eq("id", c.customer_id)
      .maybeSingle();
    if (cust?.email) customerEmail = cust.email;
  }

  // 3D-Schadensmarker (org-scoped via RLS), getrennt nach Übergabe/Rücknahme.
  const { data: markerRows } = await supabase
    .from("damage_markers")
    .select("id, type, zone, part_id, x, y, z, damage_type, severity")
    .eq("contract_id", c.id);
  const rows = (markerRows ?? []) as Array<{
    id: string;
    type: string;
    zone: string;
    part_id: string | null;
    x: number;
    y: number;
    z: number;
    damage_type: string | null;
    severity: string | null;
  }>;
  const initialMarkers: HandoverMarker[] = rows.map((r) => ({
    id: r.id,
    type: r.type as HandoverPhotoType,
    zone: r.zone,
    partId: r.part_id,
    x: r.x,
    y: r.y,
    z: r.z,
    damageType: r.damage_type,
    severity: r.severity as DamageSeverity | null,
  }));

  // Einstieg über „Rückgabe erfassen" (?tab=return) → Rücknahme-Tab aktiv + klarer
  // Kontext (Topbar/Heading „Rückgabe"), damit der Operator nicht im falschen
  // Vorgang denkt.
  const initialTab: HandoverPhotoType = searchParams?.tab === "return" ? "return" : "pickup";
  const sectionLabel = initialTab === "return" ? "Rückgabe" : "Übergabe";

  return (
    <>
      <Topbar section={`${sectionLabel} · ${c.contract_nr}`} />
      <div className="flex-1 overflow-auto scroll-thin bg-canvas">
        <div className="max-w-5xl mx-auto p-4 md:p-10">
          <HandoverClient
            contractId={c.id}
            contractNr={c.contract_nr}
            plate={c.plate}
            renterName={c.renter_name}
            initialTab={initialTab}
            initialPhotos={photosWithUrl}
            initialMarkers={initialMarkers}
            initialComparison={c.damage_comparison}
            comparisonAt={c.damage_comparison_at}
            customerEmail={customerEmail}
            protocolPrefill={{
              pickup: {
                km: c.km_pickup,
                fuel: c.fuel_level_pickup,
                condition: c.damages_at_handover,
              },
              return: {
                km: c.km_return,
                fuel: c.fuel_level_return,
                condition: c.condition_at_return,
              },
            }}
          />
        </div>
      </div>
    </>
  );
}

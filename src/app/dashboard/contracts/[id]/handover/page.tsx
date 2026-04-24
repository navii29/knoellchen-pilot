import { notFound } from "next/navigation";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { Topbar } from "@/components/dashboard/Topbar";
import { HandoverClient } from "./HandoverClient";
import type { Contract, HandoverPhoto } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function HandoverPage({ params }: { params: { id: string } }) {
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

  // Signed URLs für alle Fotos
  const admin = createAdminClient();
  const photosWithUrl: Array<HandoverPhoto & { url: string | null }> = await Promise.all(
    photos.map(async (p) => {
      const { data: signed } = await admin.storage
        .from("handover-photos")
        .createSignedUrl(p.photo_path, 3600);
      return { ...p, url: signed?.signedUrl || null };
    })
  );

  return (
    <>
      <Topbar section={`Übergabe · ${c.contract_nr}`} />
      <div className="flex-1 overflow-auto scroll-thin bg-stone-50">
        <div className="max-w-5xl mx-auto p-6 md:p-10">
          <HandoverClient
            contractId={c.id}
            contractNr={c.contract_nr}
            plate={c.plate}
            renterName={c.renter_name}
            initialPhotos={photosWithUrl}
          />
        </div>
      </div>
    </>
  );
}

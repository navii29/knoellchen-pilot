import { createClient } from "@/lib/supabase/server";
import { UploadClient } from "./UploadClient";

export const dynamic = "force-dynamic";

export default async function UploadPage() {
  const supabase = createClient();
  const { data: org } = await supabase
    .from("organizations")
    .select("inbound_email")
    .single();
  return <UploadClient inboundEmail={org?.inbound_email ?? null} />;
}

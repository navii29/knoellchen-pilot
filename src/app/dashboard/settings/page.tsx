import { createClient } from "@/lib/supabase/server";
import { Topbar } from "@/components/dashboard/Topbar";
import { SettingsClient } from "./SettingsClient";
import type { Organization } from "@/lib/types";

export const dynamic = "force-dynamic";

const SAFE_COLUMNS =
  "id, name, street, zip, city, phone, email, tax_number, processing_fee, slug, inbound_email, sender_name, sender_email, email_automation_enabled, lexoffice_enabled, created_at";

export default async function SettingsPage() {
  const supabase = createClient();
  const { data } = await supabase
    .from("organizations")
    .select(`${SAFE_COLUMNS}, lexoffice_api_key`)
    .single();

  const { lexoffice_api_key, ...safe } = (data ?? {}) as {
    lexoffice_api_key?: string | null;
  } & Record<string, unknown>;
  const lexofficeHasKey =
    typeof lexoffice_api_key === "string" && lexoffice_api_key.length > 0;

  return (
    <>
      <Topbar section="Einstellungen" />
      <div className="flex-1 overflow-auto scroll-thin bg-stone-50 p-4 md:p-10">
        <div className="max-w-3xl mx-auto">
          <SettingsClient
            org={safe as unknown as Organization}
            lexofficeHasKey={lexofficeHasKey}
          />
        </div>
      </div>
    </>
  );
}

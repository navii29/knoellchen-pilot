import { createClient } from "@/lib/supabase/server";
import { Topbar } from "@/components/dashboard/Topbar";
import { SettingsClient } from "./SettingsClient";
import { ShopifyImportCard } from "@/components/dashboard/ShopifyImportCard";
import { TeamCard } from "@/components/dashboard/TeamCard";
import { DangerZone } from "@/components/dashboard/DangerZone";
import type { Organization } from "@/lib/types";

export const dynamic = "force-dynamic";

const SAFE_COLUMNS =
  "id, name, street, zip, city, phone, email, tax_number, processing_fee, iban, bic, account_holder, kleinunternehmer, slug, inbound_email, lexoffice_enabled, echoes_account_id, echoes_enabled, rental_terms, logo_path, created_at";

export default async function SettingsPage() {
  const supabase = createClient();
  const { data } = await supabase
    .from("organizations")
    .select(
      `${SAFE_COLUMNS}, lexoffice_api_key, echoes_api_key, shopify_shop_domain, shopify_admin_token, shopify_webhook_token`
    )
    .single();

  const {
    lexoffice_api_key,
    echoes_api_key,
    shopify_admin_token,
    shopify_shop_domain,
    shopify_webhook_token,
    ...safe
  } = (data ?? {}) as {
    lexoffice_api_key?: string | null;
    echoes_api_key?: string | null;
    shopify_admin_token?: string | null;
    shopify_shop_domain?: string | null;
    shopify_webhook_token?: string | null;
  } & Record<string, unknown>;
  const lexofficeHasKey =
    typeof lexoffice_api_key === "string" && lexoffice_api_key.length > 0;
  const echoesHasKey =
    typeof echoes_api_key === "string" && echoes_api_key.length > 0;

  // Self-Service-Zugangsdaten der Organisation; Env nur als Dev-/Test-Fallback.
  const shopifyDomain =
    (typeof shopify_shop_domain === "string" && shopify_shop_domain) ||
    process.env.SHOPIFY_SHOP_DOMAIN ||
    null;
  const shopifyHasToken =
    (typeof shopify_admin_token === "string" && shopify_admin_token.length > 0) ||
    Boolean(process.env.SHOPIFY_ADMIN_TOKEN);
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://www.knoellchen-pilot.de";
  const orgId = (safe as { id?: string }).id;
  const webhookUrl =
    orgId && shopify_webhook_token
      ? `${appUrl.replace(/\/+$/, "")}/api/webhook/shopify?org=${orgId}&token=${shopify_webhook_token}`
      : null;

  return (
    <>
      <Topbar section="Einstellungen" />
      <div className="flex-1 overflow-auto scroll-thin bg-canvas p-4 md:p-10">
        <div className="max-w-3xl mx-auto">
          <SettingsClient
            org={safe as unknown as Organization}
            lexofficeHasKey={lexofficeHasKey}
            echoesHasKey={echoesHasKey}
          />
          <ShopifyImportCard
            domain={shopifyDomain}
            hasToken={shopifyHasToken}
            webhookUrl={webhookUrl}
          />
          <div className="mt-6">
            <TeamCard />
          </div>
          <div className="mt-6">
            <DangerZone orgName={(safe as { name?: string }).name ?? ""} />
          </div>
        </div>
      </div>
    </>
  );
}

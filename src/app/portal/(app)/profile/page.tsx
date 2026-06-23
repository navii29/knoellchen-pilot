import { getPortalCustomer } from "@/lib/portal-auth";
import { ProfileClient } from "./ProfileClient";

export const dynamic = "force-dynamic";

export default async function PortalProfilePage() {
  const ctx = await getPortalCustomer();
  if (!ctx) return null;

  return (
    <ProfileClient
      initial={ctx.customer}
      hasLicensePhoto={!!ctx.customer.license_photo_path}
      hasIdCardPhoto={!!ctx.customer.id_card_photo_path}
    />
  );
}

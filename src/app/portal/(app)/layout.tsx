import { redirect } from "next/navigation";
import { getPortalCustomer } from "@/lib/portal-auth";
import { createAdminClient } from "@/lib/supabase/server";
import { PortalShell } from "../PortalShell";

export const dynamic = "force-dynamic";

export default async function PortalAppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const ctx = await getPortalCustomer();
  if (!ctx) redirect("/portal/login");

  const admin = createAdminClient();
  const { data: org } = await admin
    .from("organizations")
    .select("id, name, logo_path")
    .eq("id", ctx.session.org_id)
    .single();

  const logoPath = (org as { logo_path?: string | null } | null)?.logo_path;
  const logoUrl =
    logoPath && process.env.NEXT_PUBLIC_SUPABASE_URL
      ? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/brand/${logoPath}`
      : null;

  return (
    <PortalShell
      orgName={org?.name ?? "Kundenportal"}
      orgLogoUrl={logoUrl}
      customerName={
        [ctx.customer.first_name, ctx.customer.last_name].filter(Boolean).join(" ") ||
        "Mein Konto"
      }
    >
      {children}
    </PortalShell>
  );
}

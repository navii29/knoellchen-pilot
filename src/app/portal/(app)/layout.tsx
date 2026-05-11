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
    .select("id, name")
    .eq("id", ctx.session.org_id)
    .single();

  return (
    <PortalShell
      orgName={org?.name ?? "Kundenportal"}
      customerName={
        [ctx.customer.first_name, ctx.customer.last_name].filter(Boolean).join(" ") ||
        "Mein Konto"
      }
    >
      {children}
    </PortalShell>
  );
}

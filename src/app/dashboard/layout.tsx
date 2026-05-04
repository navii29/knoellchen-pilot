import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Sidebar } from "@/components/dashboard/Sidebar";

export const dynamic = "force-dynamic";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("users")
    .select("org_id")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile) redirect("/login?error=no_profile");

  const [
    { data: org },
    { count: openTickets },
    { count: activeContracts },
    { count: customers },
    { count: openDamages },
  ] = await Promise.all([
    supabase
      .from("organizations")
      .select("name, onboarding_completed")
      .eq("id", profile.org_id)
      .single(),
    supabase.from("tickets").select("*", { count: "exact", head: true }).eq("status", "neu"),
    supabase.from("contracts").select("*", { count: "exact", head: true }).eq("status", "aktiv"),
    supabase.from("customers").select("*", { count: "exact", head: true }),
    supabase.from("damage_reports").select("*", { count: "exact", head: true }).eq("status", "offen"),
  ]);

  if (org && org.onboarding_completed === false) redirect("/onboarding");

  return (
    <div className="md:h-screen md:flex bg-stone-50 min-h-screen">
      <Sidebar
        orgName={org?.name || "Mein Konto"}
        ticketCount={openTickets || 0}
        contractCount={activeContracts || 0}
        customerCount={customers || 0}
        damageCount={openDamages || 0}
      />
      <div className="flex-1 flex flex-col min-w-0 w-full">{children}</div>
    </div>
  );
}

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { OnboardingWizard } from "@/components/onboarding/OnboardingWizard";

export default async function OnboardingPage() {
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

  const { data: org } = await supabase
    .from("organizations")
    .select(
      "id, name, street, zip, city, phone, email, tax_number, processing_fee, onboarding_completed, onboarding_step"
    )
    .eq("id", profile.org_id)
    .single();

  if (!org) redirect("/login?error=no_org");
  if (org.onboarding_completed) redirect("/dashboard");

  const [{ data: vehicles }, { data: customers }, { data: contracts }] = await Promise.all([
    supabase
      .from("vehicles")
      .select("id, plate, manufacturer, model")
      .eq("org_id", profile.org_id)
      .order("created_at", { ascending: false }),
    supabase
      .from("customers")
      .select("id, first_name, last_name, email")
      .eq("org_id", profile.org_id)
      .order("created_at", { ascending: false }),
    supabase
      .from("contracts")
      .select("id")
      .eq("org_id", profile.org_id),
  ]);

  return (
    <OnboardingWizard
      initialStep={org.onboarding_step ?? 1}
      org={{
        id: org.id,
        name: org.name ?? "",
        street: org.street ?? "",
        zip: org.zip ?? "",
        city: org.city ?? "",
        phone: org.phone ?? "",
        email: org.email ?? user.email ?? "",
        tax_number: org.tax_number ?? "",
        processing_fee: org.processing_fee ?? 25,
      }}
      vehicles={vehicles ?? []}
      customers={customers ?? []}
      contractCount={contracts?.length ?? 0}
    />
  );
}

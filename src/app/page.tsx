import { redirect } from "next/navigation";
import { AppleNav } from "@/components/apple/AppleNav";
import { AppleHero } from "@/components/apple/AppleHero";
import { BlackShowcase } from "@/components/apple/BlackShowcase";
import { FeatureRows, DynamicPricingRow } from "@/components/apple/FeatureRows";
import { HowItWorks } from "@/components/apple/HowItWorks";
import { CinematicBand } from "@/components/apple/CinematicBand";
import { ApplePricing } from "@/components/apple/ApplePricing";
import { AppleFAQ } from "@/components/apple/AppleFAQ";
import { AppleCTA } from "@/components/apple/AppleCTA";
import { AppleFooter } from "@/components/apple/AppleFooter";

export default function Home() {
  // White-Label-/Partner-Modus (z. B. eazy-car-crm): keine Landingpage,
  // direkt zum Login. Aktiv nur, wenn NEXT_PUBLIC_PARTNER_MODE=1 im jeweiligen
  // Deployment gesetzt ist — im Haupt-Deployment bleibt die Landingpage erhalten.
  if (process.env.NEXT_PUBLIC_PARTNER_MODE === "1") {
    redirect("/login");
  }

  return (
    <main className="apple bg-white">
      <AppleNav />
      <AppleHero />
      <FeatureRows />
      <HowItWorks />
      <BlackShowcase />
      <DynamicPricingRow />
      <CinematicBand />
      <ApplePricing />
      <AppleFAQ />
      <AppleCTA />
      <AppleFooter />
    </main>
  );
}

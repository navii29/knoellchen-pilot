import { AppleNav } from "@/components/apple/AppleNav";
import { AppleHero } from "@/components/apple/AppleHero";
import { BlackShowcase } from "@/components/apple/BlackShowcase";
import { FeatureRows } from "@/components/apple/FeatureRows";
import { CinematicBand } from "@/components/apple/CinematicBand";
import { ApplePricing } from "@/components/apple/ApplePricing";
import { AppleFAQ } from "@/components/apple/AppleFAQ";
import { AppleCTA } from "@/components/apple/AppleCTA";
import { AppleFooter } from "@/components/apple/AppleFooter";

export default function Home() {
  return (
    <main className="apple bg-white">
      <AppleNav />
      <AppleHero />
      <FeatureRows />
      <BlackShowcase />
      <CinematicBand />
      <ApplePricing />
      <AppleFAQ />
      <AppleCTA />
      <AppleFooter />
    </main>
  );
}

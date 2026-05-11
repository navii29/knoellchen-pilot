import { Nav } from "@/components/landing/Nav";
import { Hero } from "@/components/landing/Hero";
import { TrustBar } from "@/components/landing/TrustBar";
import { FeatureTickets } from "@/components/landing/FeatureTickets";
import { FeatureContracts } from "@/components/landing/FeatureContracts";
import { FeatureSign } from "@/components/landing/FeatureSign";
import { FeatureAssistant } from "@/components/landing/FeatureAssistant";
import { FeatureHandover } from "@/components/landing/FeatureHandover";
import { FeatureFleet } from "@/components/landing/FeatureFleet";
import { FeatureDynamicPricing } from "@/components/landing/FeatureDynamicPricing";
import { FeatureCustomers } from "@/components/landing/FeatureCustomers";
import { FeaturePortal } from "@/components/landing/FeaturePortal";
import { FeatureIntegrations } from "@/components/landing/FeatureIntegrations";
import { Testimonial } from "@/components/landing/Testimonial";
import { Pricing } from "@/components/landing/Pricing";
import { FAQ } from "@/components/landing/FAQ";
import { FinalCTA } from "@/components/landing/FinalCTA";
import { Footer } from "@/components/landing/Footer";

export default function Home() {
  return (
    <main className="bg-black text-white">
      <Nav />
      <Hero />
      <TrustBar />
      <FeatureTickets />
      <FeatureContracts />
      <FeatureSign />
      <FeatureAssistant />
      <FeatureHandover />
      <FeatureFleet />
      <FeatureDynamicPricing />
      <FeatureCustomers />
      <FeaturePortal />
      <FeatureIntegrations />
      <Testimonial />
      <Pricing />
      <FAQ />
      <FinalCTA />
      <Footer />
    </main>
  );
}

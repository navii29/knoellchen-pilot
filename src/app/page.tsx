import { Nav } from "@/components/landing/Nav";
import { Hero } from "@/components/landing/Hero";
import { TrustBar } from "@/components/landing/TrustBar";
import { Problem } from "@/components/landing/Problem";
import { FeatureHandover } from "@/components/landing/FeatureHandover";
import { FeatureTickets } from "@/components/landing/FeatureTickets";
import { FeatureSign } from "@/components/landing/FeatureSign";
import { FeatureContracts } from "@/components/landing/FeatureContracts";
import { FeatureFleet } from "@/components/landing/FeatureFleet";
import { FeatureAssistant } from "@/components/landing/FeatureAssistant";
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
      <Problem />
      {/* Top-3 Differenziatoren zuerst (Schaden-Vergleich = unique,
          Strafzettel = Original-DNA, Sign = wichtigste Convenience). */}
      <FeatureHandover />
      <FeatureTickets />
      <FeatureSign />
      {/* Restliche Features danach, nach Kaufentscheidungs-Schmerz sortiert. */}
      <FeatureContracts />
      <FeatureFleet />
      <FeatureAssistant />
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

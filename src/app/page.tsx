import { Nav } from "@/components/landing/Nav";
import { Hero } from "@/components/landing/Hero";
import { TrustBar } from "@/components/landing/TrustBar";
import { Problem } from "@/components/landing/Problem";
import { FeatureHandover } from "@/components/landing/FeatureHandover";
import { FeatureTickets } from "@/components/landing/FeatureTickets";
import { FeatureSign } from "@/components/landing/FeatureSign";
import { FeatureBento } from "@/components/landing/FeatureBento";
import { Testimonial } from "@/components/landing/Testimonial";
import { Pricing } from "@/components/landing/Pricing";
import { FAQ } from "@/components/landing/FAQ";
import { FinalCTA } from "@/components/landing/FinalCTA";
import { Footer } from "@/components/landing/Footer";

export default function Home() {
  return (
    <main className="bg-white text-zinc-950">
      <Nav />
      <Hero />
      <TrustBar />
      <Problem />
      {/* Drei Spotlight-Differenzierer mit vollem Mockup … */}
      <div id="features">
        <FeatureHandover />
        <FeatureTickets />
        <FeatureSign />
      </div>
      {/* … der Rest als kompaktes Raster statt sieben gleichförmiger Sektionen. */}
      <FeatureBento />
      <Testimonial />
      <Pricing />
      <FAQ />
      <FinalCTA />
      <Footer />
    </main>
  );
}

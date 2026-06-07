import { SiteNav } from "@/components/landing/SiteNav";
import { Hero } from "@/components/landing/Hero";
import { LogosStrip } from "@/components/landing/LogosStrip";
import { LeitstelleRail } from "@/components/landing/LeitstelleRail";
import { ModulesBento } from "@/components/landing/ModulesBento";
import { Pricing } from "@/components/landing/Pricing";
import { FAQ } from "@/components/landing/FAQ";
import { FinalCTA } from "@/components/landing/FinalCTA";
import { Footer } from "@/components/landing/Footer";

export default function Home() {
  return (
    <main className="bg-canvas text-ink-soft">
      <SiteNav />
      <Hero />
      <LogosStrip />
      <LeitstelleRail />
      <ModulesBento />
      <Pricing />
      <FAQ />
      <FinalCTA />
      <Footer />
    </main>
  );
}

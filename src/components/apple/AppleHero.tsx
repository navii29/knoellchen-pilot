import { AppleLink } from "./AppleButton";
import { AppShot } from "./AppShot";
import { Reveal } from "./Reveal";

/**
 * Cinematic, product-first hero (Apple MacBook-Pro grade): pure black stage,
 * a crisp solid-white headline, one blue action — and the product itself
 * glowing in the dark as the star. No gradient text, no badge, no color blob.
 */
export const AppleHero = () => {
  return (
    <section id="produkt" className="grain relative bg-black text-white overflow-hidden">
      {/* ambient light so the void has depth, not flat black */}
      <div
        className="absolute left-1/2 -translate-x-1/2 -top-20 w-[1200px] h-[760px] pointer-events-none"
        style={{
          background:
            "radial-gradient(55% 55% at 50% 35%, rgba(110,140,255,0.22), rgba(60,90,200,0.08) 45%, transparent 72%)",
        }}
        aria-hidden
      />
      <div className="relative z-[1] max-w-[1120px] mx-auto px-5 pt-36 sm:pt-44 text-center">
        <Reveal as="div">
          <p className="text-[15px] sm:text-[17px] font-medium text-azure-sky tracking-tight">
            Strafzettel-Verwaltung für Autovermietungen
          </p>
          <h1 className="apple-display mt-3 text-[42px] sm:text-[64px] lg:text-[78px] text-white mx-auto max-w-[16ch] leading-[1.04]">
            Der Strafzettel ist nicht Ihrer. Aber die Rechnung schon.
          </h1>
          <p className="mt-6 text-[18px] sm:text-[21px] leading-[1.45] text-white/65 max-w-[52ch] mx-auto">
            Als Halter bekommen Sie jeden Bußgeldbescheid Ihrer Mietwagen. Knöllchen-Pilot
            liest den Bescheid aus, findet den Mieter über den Mietvertrag und belastet ihm
            Bußgeld plus Bearbeitungsgebühr weiter — automatisch.
          </p>

          <div className="mt-9 flex flex-col sm:flex-row items-center justify-center gap-x-7 gap-y-3">
            <AppleLink href="/register" variant="azure" size="lg">
              Kostenlos testen
            </AppleLink>
            <a
              href="#funktionen"
              className="inline-flex items-center gap-1 text-[17px] text-azure-sky hover:opacity-80 transition-opacity"
            >
              Tour ansehen
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6" /></svg>
            </a>
          </div>
        </Reveal>
      </div>

      {/* the product, glowing in the dark — bleeds off the bottom edge */}
      <Reveal as="div" delay={140} className="relative z-[1] mt-16 sm:mt-20">
        <div className="relative max-w-[1040px] mx-auto px-5">
          {/* intentional single-hue light from the screen, not a rainbow blob */}
          <div
            className="absolute left-1/2 -translate-x-1/2 -top-10 w-[80%] h-[60%] pointer-events-none"
            style={{ background: "radial-gradient(closest-side, rgba(0,122,255,0.35), transparent 70%)", filter: "blur(40px)" }}
            aria-hidden
          />
          <div className="relative translate-y-6 sm:translate-y-10">
            <AppShot />
          </div>
        </div>
        {/* fade the product into the seam below */}
        <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-b from-transparent to-black pointer-events-none" aria-hidden />
      </Reveal>
    </section>
  );
};

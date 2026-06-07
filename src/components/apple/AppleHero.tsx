import { AppleLink } from "./AppleButton";
import { AppShot } from "./AppShot";
import { Reveal } from "./Reveal";

export const AppleHero = () => {
  return (
    <section id="produkt" className="relative overflow-hidden bg-white pt-28 sm:pt-32">
      {/* iridescent bloom behind the headline */}
      <div className="absolute inset-x-0 top-0 flex justify-center pointer-events-none" aria-hidden>
        <div className="aurora w-[760px] h-[520px] -mt-24 opacity-70" />
      </div>

      <div className="relative max-w-[1080px] mx-auto px-5 text-center">
        <Reveal as="div">
          <div className="inline-flex items-center gap-2 rounded-pill bg-frost/80 px-3.5 py-1.5 text-[12.5px] text-graphite-soft mb-7">
            <span className="w-1.5 h-1.5 rounded-full bg-azure" />
            Jetzt mit KI-Strafzettel-Erkennung
          </div>

          <h1 className="apple-display text-[44px] sm:text-[68px] lg:text-[84px] text-graphite mx-auto max-w-[14ch]">
            Der Papierkram,
            <br className="hidden sm:block" /> <span className="text-iridescent">automatisch erledigt.</span>
          </h1>

          <p className="mt-6 text-[19px] sm:text-[21px] leading-[1.4] text-graphite-soft max-w-[40ch] mx-auto">
            Verträge, Übergaben und Strafzettel — eine Plattform, die den Behördenkram
            ausliest, zuordnet und für Sie weiterbelastet.
          </p>

          <div className="mt-9 flex flex-col sm:flex-row items-center justify-center gap-x-7 gap-y-3">
            <AppleLink href="/register" variant="azure" size="lg">
              Kostenlos testen
            </AppleLink>
            <a
              href="#produkt"
              className="inline-flex items-center gap-1 text-[17px] text-azure-link hover:opacity-70 transition-opacity"
            >
              Tour ansehen
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6" /></svg>
            </a>
          </div>
          <p className="mt-5 text-[13px] text-graphite-muted">
            14 Tage gratis · keine Kreditkarte · Daten in der EU
          </p>
        </Reveal>

        {/* product shot floating on a gradient stage */}
        <Reveal as="div" delay={120} className="mt-14 sm:mt-20">
          <div className="relative mx-auto max-w-[920px]">
            <div className="absolute -inset-x-10 -bottom-10 top-10 aurora opacity-40 pointer-events-none" aria-hidden />
            <AppShot className="relative" />
          </div>
        </Reveal>
      </div>
    </section>
  );
};

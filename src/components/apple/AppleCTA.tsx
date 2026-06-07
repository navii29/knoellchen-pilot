import { ShieldCheck } from "lucide-react";
import { AppleLink } from "./AppleButton";
import { Reveal } from "./Reveal";

export const AppleCTA = () => {
  return (
    <section className="relative mesh-dark text-white overflow-hidden">
      {/* subtle iridescent bloom top-center */}
      <div
        className="absolute inset-x-0 top-0 flex justify-center pointer-events-none"
        aria-hidden
      >
        <div className="aurora w-[700px] h-[360px] -mt-16 opacity-50" />
      </div>

      <div className="relative max-w-[760px] mx-auto px-5 py-32 sm:py-40 text-center">
        <Reveal as="div">
          {/* eyebrow */}
          <div className="inline-flex items-center gap-2 text-[13px] text-white/45 mb-7">
            <span className="w-1.5 h-1.5 rounded-full bg-azure-sky" />
            Jetzt starten
          </div>

          {/* headline */}
          <h2 className="apple-display text-[38px] sm:text-[58px] lg:text-[68px] text-white mx-auto max-w-[14ch]">
            Bereit, den Papierkram abzugeben?
          </h2>

          {/* sub-copy */}
          <p className="mt-6 text-[18px] sm:text-[20px] leading-[1.45] text-white/60 max-w-[38ch] mx-auto">
            Knöllchen-Pilot übernimmt. Von der KI-Auslese bis zur Weiterbelastung
            &mdash; vollständig automatisiert.
          </p>

          {/* CTAs */}
          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <AppleLink href="/register" variant="azure" size="lg">
              Kostenlos testen
            </AppleLink>
            <AppleLink href="/login" variant="ghost-dark" size="lg">
              Anmelden
            </AppleLink>
          </div>

          {/* trust line */}
          <div className="mt-8 inline-flex items-center gap-2 text-[13px] text-white/40">
            <ShieldCheck size={14} strokeWidth={2} className="shrink-0" />
            14 Tage gratis &middot; keine Kreditkarte &middot; Daten in der EU &middot; DSGVO-konform
          </div>
        </Reveal>
      </div>
    </section>
  );
};

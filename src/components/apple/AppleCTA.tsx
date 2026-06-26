import { ShieldCheck } from "lucide-react";
import { AppleLink } from "./AppleButton";
import { Reveal } from "./Reveal";

export const AppleCTA = () => {
  return (
    <section className="relative mesh-dark text-white overflow-hidden">
      {/* iridescent ribbon — ambient flair, floating above the headline */}
      <div className="absolute inset-x-0 -top-16 flex justify-center pointer-events-none" aria-hidden>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/brand/aurora-ribbon.webp"
          alt=""
          className="w-[520px] max-w-[90%] opacity-70 blur-[1px] select-none"
          style={{ maskImage: "radial-gradient(closest-side, #000 55%, transparent)" }}
        />
      </div>
      <div className="absolute inset-x-0 top-0 flex justify-center pointer-events-none" aria-hidden>
        <div className="aurora w-[640px] h-[300px] -mt-10 opacity-40" />
      </div>

      <div className="relative max-w-[760px] mx-auto px-5 py-32 sm:py-40 text-center">
        <Reveal as="div">
          {/* eyebrow */}
          <div className="inline-flex items-center gap-2 text-[13px] text-white/45 mb-7">
            <span className="w-1.5 h-1.5 rounded-full bg-azure-sky" />
            Jetzt starten
          </div>

          {/* headline */}
          <h2 className="apple-display text-[34px] sm:text-[52px] lg:text-[62px] text-white mx-auto max-w-[16ch]">
            Bereit, kein fremdes Bußgeld mehr zu zahlen?
          </h2>

          {/* sub-copy */}
          <p className="mt-6 text-[18px] sm:text-[20px] leading-[1.45] text-white/60 max-w-[42ch] mx-auto">
            Von der Software-Auslese bis zur Weiterbelastung übernimmt Knöllchen-Pilot jeden
            Schritt. Sie reichen nur den Bescheid ein.
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

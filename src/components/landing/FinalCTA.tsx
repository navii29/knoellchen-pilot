/**
 * FinalCTA — Dark bg-void closing section.
 * Grid-dark texture, signal glow, big font-display headline.
 * Ties back to the Leitstelle concept.
 */

import { ButtonLink } from "@/components/ui/Button";

export const FinalCTA = () => {
  return (
    <section className="relative bg-void text-on-dark overflow-hidden">
      {/* engineering grid */}
      <div className="absolute inset-0 grid-dark [mask-image:radial-gradient(110%_80%_at_50%_100%,#000_20%,transparent_80%)]" />
      {/* signal glow — bottom center */}
      <div
        className="absolute -bottom-32 left-1/2 -translate-x-1/2 w-[700px] h-[400px] rounded-full blur-[100px] opacity-20"
        style={{ background: "radial-gradient(circle, #FF5A1F 0%, transparent 65%)" }}
      />

      <div className="relative max-w-wide mx-auto px-5 lg:px-8 py-24 lg:py-36 text-center">
        {/* kicker */}
        <span className="kicker text-white/45">Leitstelle starten</span>

        {/* headline */}
        <h2 className="mt-5 font-display font-extrabold text-[32px] sm:text-[44px] lg:text-[58px] leading-[1.0] tracking-tightest text-white text-balance">
          Die Leitstelle wartet.
          <br />
          <span className="text-white/40">Der nächste Strafzettel nicht.</span>
        </h2>

        {/* subcopy */}
        <p className="mt-6 text-[16px] lg:text-[17px] leading-relaxed text-white/55 max-w-xl mx-auto">
          Richten Sie Ihre Leitstelle in unter 30 Minuten ein.
          Laden Sie Fahrzeuge und Buchungen hoch — und lassen Sie die Strecke arbeiten.
        </p>

        {/* CTAs */}
        <div className="mt-9 flex flex-col sm:flex-row gap-3 items-center justify-center">
          <ButtonLink href="/register" variant="signal" size="lg">
            14 Tage gratis testen
          </ButtonLink>
          <ButtonLink href="/login" variant="outline-dark" size="lg">
            Anmelden
          </ButtonLink>
        </div>

        {/* trust line */}
        <div className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 font-mono text-[11.5px] text-white/35">
          <span className="flex items-center gap-2">
            <span className="live-dot" />
            Keine Kreditkarte erforderlich
          </span>
          <span>Daten in der EU</span>
          <span>DSGVO-konform</span>
          <span>Monatlich kündbar</span>
        </div>
      </div>
    </section>
  );
};

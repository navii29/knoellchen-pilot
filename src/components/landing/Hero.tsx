import { ButtonLink } from "@/components/ui/Button";
import { Plate } from "@/components/ui/Plate";

const PIPE = [
  { label: "Neu", dot: "#B45309" },
  { label: "Zugeordnet", dot: "#1D4ED8" },
  { label: "Weiterbelastet", dot: "#6D28D9", active: true },
  { label: "Bezahlt", dot: "#15803D" },
];

export const Hero = () => {
  return (
    <section className="relative bg-void text-on-dark overflow-hidden">
      {/* engineering grid + signal glow */}
      <div className="absolute inset-0 grid-dark [mask-image:radial-gradient(120%_90%_at_50%_0%,#000_30%,transparent_85%)]" />
      <div
        className="absolute -top-40 left-1/2 -translate-x-1/2 w-[820px] h-[520px] rounded-full blur-[120px] opacity-25"
        style={{ background: "radial-gradient(circle, #FF5A1F 0%, transparent 65%)" }}
      />

      <div className="relative max-w-wide mx-auto px-5 lg:px-8 pt-28 pb-16 lg:pt-36 lg:pb-24">
        <div className="grid lg:grid-cols-[1.05fr_0.95fr] gap-12 lg:gap-10 items-center">
          {/* ── copy ── */}
          <div>
            <span className="kicker text-white/55">Die Leitstelle für Autovermietungen</span>
            <h1 className="mt-5 font-display font-extrabold text-white text-[32px] sm:text-[46px] lg:text-[60px] leading-[1.02] sm:leading-[0.98] tracking-tightest">
              Der Papierkram fährt.
              <br />
              Sie behalten den{" "}
              <span className="mark">Überblick</span>.
            </h1>
            <p className="mt-6 text-[16px] lg:text-[17px] leading-relaxed text-white/65 max-w-xl">
              Verträge, Übergaben, Schäden und Strafzettel laufen in einer Leitstelle
              zusammen — die den Behördenkram selbst ausliest, zuordnet und an Ihre
              Mieter weiterbelastet. Sie greifen nur noch ein, wenn es zählt.
            </p>

            <div className="mt-8 flex flex-col sm:flex-row gap-3">
              <ButtonLink href="/register" variant="signal" size="lg">
                14 Tage gratis testen
              </ButtonLink>
              <ButtonLink href="#leitstelle" variant="outline-dark" size="lg">
                So funktioniert die Strecke
              </ButtonLink>
            </div>

            <div className="mt-7 flex flex-wrap items-center gap-x-6 gap-y-2 text-[12.5px] font-mono text-white/40">
              <span className="flex items-center gap-2"><span className="live-dot" /> Keine Kreditkarte</span>
              <span>Daten in der EU</span>
              <span>DSGVO-konform</span>
            </div>
          </div>

          {/* ── live console centerpiece ── */}
          <div className="relative">
            <div className="rounded-frame border border-hairline-dark bg-void-800/80 backdrop-blur-sm shadow-frame overflow-hidden">
              {/* console header */}
              <div className="flex items-center justify-between px-4 h-11 border-b border-hairline-dark bg-void-700/60">
                <div className="flex items-center gap-2.5 font-mono text-[11px] tracking-widest text-white/55 uppercase">
                  <span className="live-dot" /> Leitstelle · Live
                </div>
                <div className="font-mono text-[11px] text-white/35 tnum">AZ&nbsp;KP-2041</div>
              </div>

              {/* incoming + extraction */}
              <div className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="kicker text-white/45">Eingang · Bußgeldbescheid</span>
                  <span className="font-mono text-[10.5px] px-1.5 py-0.5 rounded bg-signal-soft text-signal-ink">
                    Software 98% ausgelesen
                  </span>
                </div>

                <div className="rounded-panel border border-hairline-dark bg-void-700/50 p-3.5 space-y-3">
                  <div className="flex items-center justify-between">
                    <Plate value="B-KP 2041" size="md" />
                    <span className="font-mono text-[11px] text-white/40">12.05.2026 · 14:32</span>
                  </div>
                  <div className="grid grid-cols-2 gap-3 font-mono text-[12px]">
                    <Field label="Verstoß" value="Parken im Halteverbot" />
                    <Field label="Behörde" value="Bußgeldstelle Berlin" />
                    <Field label="Fahrer" value="M. Krause" matched />
                    <Field label="Bußgeld" value="55,00 €" />
                  </div>
                </div>

                {/* re-billing line */}
                <div className="flex items-center justify-between rounded-panel border border-hairline-dark bg-void-700/30 px-3.5 py-2.5">
                  <span className="font-mono text-[11.5px] text-white/55">Weiterbelastung an Mieter</span>
                  <span className="font-mono text-[13px] font-medium text-white tnum">
                    55,00 € <span className="text-white/35">+</span> 25,00 €
                  </span>
                </div>
              </div>

              {/* pipeline rail */}
              <div className="px-4 pb-4">
                <div className="flex items-stretch gap-1">
                  {PIPE.map((s, i) => (
                    <div key={s.label} className="flex-1">
                      <div
                        className="h-1 rounded-full"
                        style={{ background: i <= 2 ? s.dot : "rgba(255,255,255,0.12)" }}
                      />
                      <div className="mt-2 flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full" style={{ background: s.dot, opacity: i <= 2 ? 1 : 0.35 }} />
                        <span
                          className={`font-mono text-[10px] tracking-tight ${
                            s.active ? "text-white" : "text-white/40"
                          }`}
                        >
                          {s.label}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* floating telemetry tag */}
            <div className="hidden sm:flex absolute -left-4 -bottom-4 items-center gap-2 rounded-panel border border-hairline-dark bg-void-800 px-3 py-2 shadow-frame">
              <span className="font-mono text-[20px] font-bold text-signal tnum leading-none">7&nbsp;Min</span>
              <span className="font-mono text-[10px] text-white/45 leading-tight">
                gespart pro
                <br />
                Strafzettel
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

const Field = ({ label, value, matched }: { label: string; value: string; matched?: boolean }) => (
  <div>
    <div className="text-white/35 text-[10px] uppercase tracking-wider">{label}</div>
    <div className={`mt-0.5 ${matched ? "text-signal" : "text-white/85"}`}>{value}</div>
  </div>
);

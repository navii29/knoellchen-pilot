"use client";

import { useEffect, useRef, useState } from "react";
import { Inbox, UserCheck, BadgeEuro, Check } from "lucide-react";
import { Reveal } from "./Reveal";

const DWELL = 3200; // ms per stage

const STEPS = [
  { Icon: Inbox, label: "Eingang & KI-Auslese", desc: "Bescheid kommt per Upload oder E-Mail. Die KI liest alles aus." },
  { Icon: UserCheck, label: "Fahrer zuordnen", desc: "Tatzeit trifft auf Mietvertrag — der richtige Mieter steht fest." },
  { Icon: BadgeEuro, label: "Weiterbelastung", desc: "Anschreiben, Rechnung und Ihre Gebühr entstehen automatisch." },
  { Icon: Check, label: "Bezahlt & erledigt", desc: "Zahlungseingang wird erfasst — der Fall schließt sich." },
];

const RAIL = [
  { label: "Neu", color: "#86868b" },
  { label: "Zugeordnet", color: "#0071e3" },
  { label: "Weiterbelastet", color: "#8668ff" },
  { label: "Bezahlt", color: "#34c759" },
];

export const HowItWorks = () => {
  const [active, setActive] = useState(0);
  const [playing, setPlaying] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);

  // start the loop only once the section is on screen
  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([e]) => setPlaying(e.isIntersecting),
      { threshold: 0.3 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    if (!playing) return;
    const t = setInterval(() => setActive((a) => (a + 1) % STEPS.length), DWELL);
    return () => clearInterval(t);
  }, [playing]);

  return (
    <section className="grain relative mesh-dark text-white overflow-hidden" ref={rootRef}>
      <div className="relative z-[1] max-w-[1120px] mx-auto px-5 py-24 sm:py-32">
        <Reveal as="div" className="text-center mb-14 max-w-[42ch] mx-auto">
          <p className="text-[14px] font-medium text-azure-sky mb-4">So funktioniert es</p>
          <h2 className="apple-display text-[32px] sm:text-[48px] text-white leading-[1.05]">
            In Sekunden vom Bescheid zur Rechnung.
          </h2>
        </Reveal>

        <div className="grid lg:grid-cols-[0.85fr_1.15fr] gap-8 lg:gap-14 items-center">
          {/* stepper */}
          <div className="space-y-1.5">
            {STEPS.map((s, i) => {
              const on = i === active;
              return (
                <button
                  key={s.label}
                  onClick={() => setActive(i)}
                  className={`w-full text-left rounded-2xl p-4 transition-colors duration-300 ${
                    on ? "bg-white/[0.07]" : "hover:bg-white/[0.03]"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={`inline-flex items-center justify-center w-9 h-9 rounded-full transition-colors duration-300 ${
                        on ? "bg-azure text-white" : "bg-white/10 text-white/60"
                      }`}
                    >
                      <s.Icon size={17} strokeWidth={2} />
                    </span>
                    <span className={`text-[16px] font-semibold tracking-tight transition-colors ${on ? "text-white" : "text-white/55"}`}>
                      {s.label}
                    </span>
                  </div>
                  <div
                    className={`grid transition-all duration-300 ${on ? "grid-rows-[1fr] opacity-100 mt-2" : "grid-rows-[0fr] opacity-0"}`}
                  >
                    <p className="overflow-hidden pl-12 text-[14px] leading-[1.5] text-white/55">{s.desc}</p>
                  </div>
                  {/* auto-advance bar */}
                  <div className="mt-3 ml-12 h-[3px] rounded-full bg-white/10 overflow-hidden">
                    {on && (
                      <div
                        key={`${active}-${playing}`}
                        className="h-full bg-azure origin-left"
                        style={{ animation: playing ? `fillbar ${DWELL}ms linear forwards` : undefined }}
                      />
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          {/* animated stage */}
          <div className="relative">
            <div
              className="absolute left-1/2 -translate-x-1/2 top-0 w-[80%] h-[70%] pointer-events-none"
              style={{ background: "radial-gradient(closest-side, rgba(0,113,227,0.30), transparent)", filter: "blur(50px)" }}
              aria-hidden
            />
            <div className="relative glass-dark rounded-apple p-5 sm:p-7 shadow-glassdark min-h-[360px]">
              {/* the document / panel that morphs through stages */}
              <Stage active={active} />

              {/* persistent pipeline rail */}
              <div className="mt-6 flex items-center gap-1.5">
                {RAIL.map((r, i) => (
                  <div key={r.label} className="flex-1">
                    <div className="h-1 rounded-full bg-white/10 overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{ width: i <= active ? "100%" : "0%", background: r.color }}
                      />
                    </div>
                    <div className={`mt-2 text-[10.5px] font-medium transition-colors duration-300 ${i <= active ? "text-white/80" : "text-white/35"}`}>
                      {r.label}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

/* The morphing content area — one block per stage, cross-faded. */
function Stage({ active }: { active: number }) {
  return (
    <div className="relative h-[224px]">
      {/* Stage 0 — Eingang & KI-Auslese */}
      <Pane on={active === 0}>
        <div className="flex items-center justify-between mb-3">
          <span className="text-[12px] text-white/45">Eingang · Bußgeldbescheid</span>
          <span className="text-[11px] px-2 py-0.5 rounded-full bg-azure/20 text-azure-sky font-medium">KI liest aus · 98%</span>
        </div>
        <div className="relative rounded-2xl border border-white/10 bg-white/[0.03] p-4 overflow-hidden">
          {/* scan sweep */}
          {active === 0 && (
            <div
              className="absolute inset-x-0 top-0 h-10 pointer-events-none"
              style={{ background: "linear-gradient(180deg, rgba(0,148,255,0.35), transparent)", animation: "scansweep 3s linear infinite" }}
              aria-hidden
            />
          )}
          <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-[13px]">
            <Field k="Kennzeichen" v="B·MK 2041" delay={0} on={active === 0} />
            <Field k="Tatzeit" v="12.05. · 14:32" delay={140} on={active === 0} />
            <Field k="Verstoß" v="Parken im Halteverbot" delay={280} on={active === 0} />
            <Field k="Bußgeld" v="55,00 €" delay={420} on={active === 0} />
          </div>
        </div>
      </Pane>

      {/* Stage 1 — Fahrer zuordnen */}
      <Pane on={active === 1}>
        <div className="text-[12px] text-white/45 mb-3">Zuordnung · Mietvertrag</div>
        <div className="flex items-center gap-3">
          <div className="flex-1 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-[13px]">
            <div className="text-white/45 text-[11px]">Kennzeichen</div>
            <div className="font-semibold text-white">B·MK 2041</div>
          </div>
          <div className="text-azure-sky">
            <svg width="28" height="20" viewBox="0 0 28 20" fill="none" stroke="currentColor" strokeWidth="2"><path d="M2 10h22m0 0-6-6m6 6-6 6" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </div>
          <div className="flex-1 rounded-2xl border border-azure/40 bg-azure/10 px-4 py-3 text-[13px]">
            <div className="text-white/45 text-[11px]">Mieter · MV-2026-0058</div>
            <div className="font-semibold text-white">Markus Krause</div>
          </div>
        </div>
        <div className="mt-3 inline-flex items-center gap-1.5 text-[12px] text-[#34c759]">
          <Check size={14} strokeWidth={2.5} /> Eindeutig zugeordnet
        </div>
      </Pane>

      {/* Stage 2 — Weiterbelastung */}
      <Pane on={active === 2}>
        <div className="text-[12px] text-white/45 mb-3">Rechnung · Weiterbelastung an Mieter</div>
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-[13px] space-y-2">
          <Row k="Bußgeld" v="55,00 €" />
          <Row k="Bearbeitungsgebühr" v="25,00 €" />
          <div className="h-px bg-white/10 my-1" />
          <div className="flex items-center justify-between">
            <span className="text-white/70">Gesamt</span>
            <span className="text-[20px] font-semibold text-white tabular-nums">80,00 €</span>
          </div>
        </div>
        <div className="mt-3 flex gap-2 text-[11px] text-white/45">
          <span className="px-2 py-1 rounded-lg bg-white/5">Anschreiben</span>
          <span className="px-2 py-1 rounded-lg bg-white/5">Rechnung</span>
          <span className="px-2 py-1 rounded-lg bg-white/5">versendet</span>
        </div>
      </Pane>

      {/* Stage 3 — Bezahlt */}
      <Pane on={active === 3}>
        <div className="h-full flex flex-col items-center justify-center text-center">
          <div className="w-16 h-16 rounded-full bg-[#34c759]/15 flex items-center justify-center mb-4">
            <div className="w-11 h-11 rounded-full bg-[#34c759] flex items-center justify-center">
              <Check size={24} strokeWidth={3} className="text-white" />
            </div>
          </div>
          <div className="text-[19px] font-semibold text-white">Bezahlt · Fall geschlossen</div>
          <div className="text-[13.5px] text-white/55 mt-1.5 max-w-[34ch]">
            80,00 € eingegangen. Sie mussten nichts tun.
          </div>
        </div>
      </Pane>
    </div>
  );
}

function Pane({ on, children }: { on: boolean; children: React.ReactNode }) {
  return (
    <div
      className={`absolute inset-0 transition-all duration-500 ${on ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2 pointer-events-none"}`}
      aria-hidden={!on}
    >
      {children}
    </div>
  );
}

function Field({ k, v, delay, on }: { k: string; v: string; delay: number; on: boolean }) {
  return (
    <div
      className="transition-all duration-500"
      style={{ opacity: on ? 1 : 0, transform: on ? "none" : "translateY(6px)", transitionDelay: on ? `${delay}ms` : "0ms" }}
    >
      <div className="text-white/40 text-[10.5px] uppercase tracking-wide">{k}</div>
      <div className="text-white/90 mt-0.5">{v}</div>
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-white/55">{k}</span>
      <span className="text-white/90 tabular-nums">{v}</span>
    </div>
  );
}

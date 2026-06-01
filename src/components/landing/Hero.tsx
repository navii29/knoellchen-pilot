import Link from "next/link";
import { BrowserFrame } from "./BrowserFrame";
import { FadeUp } from "./FadeUp";
import { BOOKING_URL } from "@/lib/links";

const DashboardMock = () => (
  <div className="grid grid-cols-[110px_1fr] sm:grid-cols-[170px_1fr] h-[360px] sm:h-[460px] text-[10px] sm:text-[11px]">
    {/* Sidebar */}
    <aside className="border-r border-black/[0.06] bg-stone-50/60 p-3 flex flex-col gap-1">
      <div className="flex items-center gap-2 mb-3 px-2">
        <div className="w-5 h-5 rounded-md bg-gradient-to-br from-teal-400 to-emerald-500" />
        <span className="font-semibold text-stone-900">Knöllchen-Pilot</span>
      </div>
      {[
        ["Dashboard", true],
        ["Strafzettel", false],
        ["Verträge", false],
        ["Fahrzeuge", false],
        ["Kunden", false],
        ["Übergaben", false],
        ["Buchungen", false],
        ["Einstellungen", false],
      ].map(([label, active]) => (
        <div
          key={label as string}
          className={`px-2.5 h-7 rounded-md flex items-center text-[11px] ${
            active ? "bg-teal-600 text-white font-medium" : "text-stone-600 hover:bg-stone-100"
          }`}
        >
          {label}
        </div>
      ))}
      <div className="mt-auto p-2 rounded-md bg-white ring-1 ring-black/[0.06] flex items-center gap-2">
        <div className="w-6 h-6 rounded-full bg-gradient-to-br from-amber-300 to-pink-400" />
        <div className="leading-tight">
          <div className="text-[10.5px] font-medium text-stone-900">Eazycar GmbH</div>
          <div className="text-[9.5px] text-stone-500">Pro Plan</div>
        </div>
      </div>
    </aside>

    {/* Main */}
    <div className="p-4 overflow-hidden">
      <div className="flex items-center justify-between mb-3">
        <div>
          <div className="text-[14px] font-semibold text-stone-900 leading-tight">
            Guten Morgen, Oliver 👋
          </div>
          <div className="text-[11px] text-stone-500">28. April 2026 · 12 offene Vorgänge</div>
        </div>
        <div className="flex gap-2">
          <div className="px-2.5 h-7 rounded-md bg-stone-100 text-stone-700 text-[10.5px] flex items-center font-medium">
            Suchen
          </div>
          <div className="px-3 h-7 rounded-md bg-teal-600 text-white text-[10.5px] flex items-center font-medium">
            + Hochladen
          </div>
        </div>
      </div>

      {/* Stat row */}
      <div className="grid grid-cols-4 gap-2 mb-3">
        {[
          ["Neu", "8", "amber"],
          ["Zugeordnet", "14", "blue"],
          ["Weiterbelastet", "32", "violet"],
          ["Bezahlt", "127", "emerald"],
        ].map(([label, val, color]) => (
          <div
            key={label as string}
            className="rounded-md ring-1 ring-black/[0.06] bg-white p-2.5"
          >
            <div className="flex items-center gap-1.5 mb-1">
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  color === "amber"
                    ? "bg-amber-500"
                    : color === "blue"
                    ? "bg-blue-500"
                    : color === "violet"
                    ? "bg-violet-500"
                    : "bg-emerald-500"
                }`}
              />
              <span className="text-[9.5px] uppercase tracking-wide text-stone-500">{label}</span>
            </div>
            <div className="text-[18px] font-semibold tabular-nums text-stone-900 leading-none">
              {val}
            </div>
          </div>
        ))}
      </div>

      {/* Tickets list */}
      <div className="rounded-md ring-1 ring-black/[0.06] bg-white overflow-hidden">
        <div className="px-3 h-8 border-b border-black/[0.06] flex items-center gap-3 text-[10px] uppercase tracking-wide text-stone-500 font-medium">
          <span className="w-16">Nr.</span>
          <span className="w-20">Kennz.</span>
          <span className="flex-1">Verstoß</span>
          <span className="w-20">Mieter</span>
          <span className="w-14 text-right">Betrag</span>
          <span className="w-20 text-right">Status</span>
        </div>
        {[
          ["KP-2041", "M-AB 1234", "Parken im Halteverbot", "S. Müller", "55,00", "neu", "amber"],
          ["KP-2040", "B-CD 5678", "Geschwindigkeit +21", "T. Schmidt", "115,00", "zugeordnet", "blue"],
          ["KP-2039", "F-EF 9012", "Parken in 2. Reihe", "L. Weber", "85,00", "weiterbelastet", "violet"],
          ["KP-2038", "K-GH 3456", "Rotlichtverstoß", "M. Wagner", "200,00", "bezahlt", "emerald"],
          ["KP-2037", "M-IJ 7890", "Falschparken", "P. Becker", "45,00", "neu", "amber"],
        ].map((row, i) => (
          <div
            key={i}
            className="px-3 h-9 border-b border-black/[0.04] last:border-0 flex items-center gap-3 text-[10.5px] text-stone-700"
          >
            <span className="w-16 font-mono text-stone-500">{row[0]}</span>
            <span className="w-20 font-mono">{row[1]}</span>
            <span className="flex-1 truncate text-stone-900">{row[2]}</span>
            <span className="w-20 truncate">{row[3]}</span>
            <span className="w-14 text-right font-mono tabular-nums text-stone-900">€ {row[4]}</span>
            <span className="w-20 flex justify-end">
              <span
                className={`px-1.5 h-4 rounded text-[9.5px] font-medium flex items-center ${
                  row[6] === "amber"
                    ? "bg-amber-100 text-amber-800"
                    : row[6] === "blue"
                    ? "bg-blue-100 text-blue-800"
                    : row[6] === "violet"
                    ? "bg-violet-100 text-violet-800"
                    : "bg-emerald-100 text-emerald-800"
                }`}
              >
                {row[5]}
              </span>
            </span>
          </div>
        ))}
      </div>
    </div>
  </div>
);

export const Hero = () => {
  return (
    <section className="relative overflow-hidden bg-black pt-28 sm:pt-40 pb-16 sm:pb-28">
      {/* Background video — auch auf Mobile. preload="metadata" lädt nur
          den Header, das Video startet erst beim Decoden. */}
      <video
        autoPlay
        loop
        muted
        playsInline
        preload="metadata"
        poster="/hero-poster.jpg"
        aria-hidden="true"
        className="absolute inset-0 w-full h-full object-cover opacity-40"
      >
        <source src="/hero-video.mp4" type="video/mp4" />
      </video>

      {/* Dark-Vignetten-Overlay: oben weicher, unten satter, damit
          Headline lesbar bleibt und der Übergang zum nächsten Block sauber ist. */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(0,0,0,0.45)_0%,rgba(0,0,0,0.75)_55%,rgba(0,0,0,0.95)_100%)]" />

      {/* Radial glow obenauf — wie vorher, gibt der Page den Teal-Akzent */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/2 top-[34%] -translate-x-1/2 w-[1100px] h-[1100px] rounded-full bg-[radial-gradient(circle_at_center,rgba(45,212,191,0.20),rgba(45,212,191,0.05)_40%,transparent_70%)] blur-2xl" />
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-8 lg:px-12 text-center">
        <FadeUp>
          <div className="inline-flex items-center gap-2 px-3 h-7 rounded-full bg-white/5 ring-1 ring-white/10 text-[12px] text-white/70 mb-8">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Aktuell in Pilotphase mit Vermietungen aus DACH
          </div>
        </FadeUp>

        <FadeUp delay={80}>
          <h1
            className="font-display text-white leading-[1.02] tracking-[-0.035em] font-medium text-balance max-w-5xl mx-auto"
            style={{ fontSize: "clamp(34px, 9vw, 84px)" }}
          >
            Mehr als nur Knöllchen.
            <br />
            <span className="bg-gradient-to-br from-teal-200 via-emerald-300 to-teal-500 bg-clip-text text-transparent">
              Die KI-Plattform für Autovermietungen.
            </span>
          </h1>
        </FadeUp>

        <FadeUp delay={160}>
          <p
            className="mt-5 sm:mt-6 max-w-2xl mx-auto leading-[1.45] text-white/60 text-balance"
            style={{ fontSize: "clamp(15px, 3.5vw, 20px)" }}
          >
            Verträge unterschreiben am Tablet. Schäden per Computer Vision
            vergleichen. Strafzettel in 30 Sekunden weiterbelasten —
            statt 30 Minuten.
          </p>
        </FadeUp>

        <FadeUp delay={240}>
          <div className="mt-8 sm:mt-10 flex flex-col sm:flex-row gap-3 items-center justify-center">
            <Link
              href="/register"
              className="w-full sm:w-auto inline-flex items-center justify-center h-12 px-6 rounded-full bg-white text-black text-[15px] font-medium hover:bg-white/90 transition-colors shadow-[0_8px_30px_-8px_rgba(255,255,255,0.4)]"
            >
              30 Tage gratis testen
            </Link>
            <a
              href={BOOKING_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full sm:w-auto inline-flex items-center justify-center h-12 px-6 rounded-full bg-white/5 ring-1 ring-white/10 text-white text-[15px] font-medium hover:bg-white/10 transition-colors"
            >
              Live-Demo mit dem Gründer
            </a>
          </div>
          <div className="mt-4 text-[12.5px] text-white/40">
            Keine Kreditkarte. Keine Setup-Gebühr. Monatlich kündbar.
          </div>
        </FadeUp>

        {/* MacBook mockup — auf Mobile in Container scrollbar/nicht abgeschnitten */}
        <FadeUp delay={360} className="mt-12 sm:mt-24">
          <div
            className="relative max-w-5xl mx-auto"
            style={{ transform: "scale(min(1, 100%))" }}
          >
            <div className="hidden sm:block relative rounded-[20px] bg-gradient-to-b from-zinc-700 to-zinc-900 p-[10px] shadow-[0_50px_120px_-30px_rgba(0,0,0,0.6),0_0_0_1px_rgba(255,255,255,0.06)]">
              <div className="rounded-[12px] overflow-hidden ring-1 ring-black/40">
                <BrowserFrame url="app.knoellchen-pilot.de/dashboard">
                  <DashboardMock />
                </BrowserFrame>
              </div>
            </div>
            {/* "lid hinge" / base — nur Desktop */}
            <div className="hidden sm:block mx-auto h-2 w-[calc(100%+40px)] -mt-px bg-gradient-to-b from-zinc-800 to-zinc-950 rounded-b-[20px]" />
            <div className="hidden sm:block mx-auto h-1.5 w-24 bg-zinc-700/40 rounded-b-full" />

            {/* Mobile-Variante: kompakter Browser ohne Macbook-Frame */}
            <div className="sm:hidden -mx-2">
              <div className="relative rounded-[14px] bg-gradient-to-b from-zinc-700 to-zinc-900 p-1 shadow-2xl ring-1 ring-white/10 overflow-hidden">
                <div className="rounded-[10px] overflow-hidden">
                  <BrowserFrame url="app.knoellchen-pilot.de">
                    <DashboardMock />
                  </BrowserFrame>
                </div>
              </div>
            </div>

            {/* floating callouts */}
            <div className="hidden lg:flex absolute -left-8 top-20 items-center gap-2 px-3 h-9 rounded-full bg-white/5 backdrop-blur-md ring-1 ring-white/10 text-[12.5px] text-white/80">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              KI liest aus · 1,2s
            </div>
            <div className="hidden lg:flex absolute -right-8 bottom-28 items-center gap-2 px-3 h-9 rounded-full bg-white/5 backdrop-blur-md ring-1 ring-white/10 text-[12.5px] text-white/80">
              ✨ Fahrer auto-zugeordnet
            </div>
          </div>
        </FadeUp>
      </div>
    </section>
  );
};

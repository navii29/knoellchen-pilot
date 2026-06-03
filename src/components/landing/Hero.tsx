import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { BrowserFrame } from "./BrowserFrame";
import { FadeUp } from "./FadeUp";
import { BOOKING_URL } from "@/lib/links";

const DashboardMock = () => (
  <div className="grid grid-cols-[120px_1fr] sm:grid-cols-[180px_1fr] h-[380px] sm:h-[440px] text-[11px]">
    {/* Sidebar */}
    <aside className="border-r border-zinc-200 bg-zinc-50/70 p-3 flex flex-col gap-0.5">
      <div className="flex items-center gap-2 mb-3 px-1.5">
        <div className="w-5 h-5 rounded-md bg-zinc-900 flex items-center justify-center text-white text-[9px] font-semibold">K</div>
        <span className="font-semibold text-zinc-900 tracking-[-0.01em]">Knöllchen-Pilot</span>
      </div>
      {[
        ["Dashboard", true],
        ["Strafzettel", false],
        ["Verträge", false],
        ["Fahrzeuge", false],
        ["Kunden", false],
        ["Übergaben", false],
        ["Auswertung", false],
        ["Einstellungen", false],
      ].map(([label, active]) => (
        <div
          key={label as string}
          className={`px-2.5 h-7 rounded-md flex items-center text-[11px] ${
            active ? "bg-zinc-900 text-white font-medium" : "text-zinc-600"
          }`}
        >
          {label}
        </div>
      ))}
      <div className="mt-auto p-2 rounded-lg bg-white ring-1 ring-zinc-200 flex items-center gap-2">
        <div className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-[9px] font-semibold">SF</div>
        <div className="leading-tight">
          <div className="text-[10.5px] font-medium text-zinc-900">Stadtflotte</div>
          <div className="text-[9.5px] text-zinc-500">Professional</div>
        </div>
      </div>
    </aside>

    {/* Main */}
    <div className="p-4 overflow-hidden">
      <div className="flex items-center justify-between mb-3.5">
        <div>
          <div className="text-[10px] uppercase tracking-wider text-zinc-400 font-medium">Dienstag, 3. Juni</div>
          <div className="text-[14px] font-semibold text-zinc-900 leading-tight mt-0.5">Guten Tag, Stadtflotte.</div>
        </div>
        <div className="px-3 h-7 rounded-lg bg-indigo-600 text-white text-[10.5px] flex items-center font-medium">
          Strafzettel hochladen
        </div>
      </div>

      {/* Stat row */}
      <div className="grid grid-cols-4 gap-2 mb-3">
        {[
          ["Offen", "8", "bg-amber-500"],
          ["Zugeordnet", "14", "bg-blue-500"],
          ["Weiterbelastet", "32", "bg-violet-500"],
          ["Bezahlt", "127", "bg-emerald-500"],
        ].map(([label, val, dot]) => (
          <div key={label as string} className="rounded-lg ring-1 ring-zinc-200 bg-white p-2.5">
            <div className="flex items-center gap-1.5 mb-1">
              <span className={`w-1.5 h-1.5 rounded-full ${dot}`} />
              <span className="text-[9.5px] uppercase tracking-wide text-zinc-500">{label}</span>
            </div>
            <div className="text-[18px] font-semibold tabular-nums text-zinc-900 leading-none">{val}</div>
          </div>
        ))}
      </div>

      {/* Tickets list */}
      <div className="rounded-lg ring-1 ring-zinc-200 bg-white overflow-hidden">
        <div className="px-3 h-8 border-b border-zinc-100 flex items-center gap-3 text-[10px] uppercase tracking-wide text-zinc-400 font-medium">
          <span className="w-14">Nr.</span>
          <span className="w-20">Kennz.</span>
          <span className="flex-1">Verstoß</span>
          <span className="w-16 text-right">Betrag</span>
          <span className="w-20 text-right">Status</span>
        </div>
        {[
          ["KP-2041", "M-AB 1234", "Parken im Halteverbot", "25,00", "Neu", "bg-amber-50 text-amber-700"],
          ["KP-2040", "M-CD 5678", "Geschwindigkeit +21", "115,00", "Zugeordnet", "bg-blue-50 text-blue-700"],
          ["KP-2039", "M-EF 9012", "Parken in 2. Reihe", "55,00", "Weiterbelastet", "bg-violet-50 text-violet-700"],
          ["KP-2038", "M-GH 3456", "Rotlichtverstoß", "200,00", "Bezahlt", "bg-emerald-50 text-emerald-700"],
          ["KP-2037", "M-IJ 7890", "Falschparken", "55,00", "Neu", "bg-amber-50 text-amber-700"],
        ].map((row, i) => (
          <div key={i} className="px-3 h-9 border-b border-zinc-50 last:border-0 flex items-center gap-3 text-[10.5px] text-zinc-700">
            <span className="w-14 font-mono text-zinc-400">{row[0]}</span>
            <span className="w-20 font-mono">{row[1]}</span>
            <span className="flex-1 truncate text-zinc-900">{row[2]}</span>
            <span className="w-16 text-right font-mono tabular-nums text-zinc-900">{row[3]} €</span>
            <span className="w-20 flex justify-end">
              <span className={`px-1.5 h-4 rounded text-[9.5px] font-medium flex items-center ${row[5]}`}>{row[4]}</span>
            </span>
          </div>
        ))}
      </div>
    </div>
  </div>
);

export const Hero = () => {
  return (
    <section className="relative bg-white pt-32 sm:pt-40 pb-16 sm:pb-20 overflow-hidden">
      <div className="max-w-6xl mx-auto px-5 sm:px-8">
        <div className="max-w-3xl">
          <FadeUp>
            <div className="inline-flex items-center gap-2 text-[12.5px] text-zinc-600 mb-6">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-600" />
              In der Pilotphase mit Vermietungen aus DACH
            </div>
          </FadeUp>

          <FadeUp delay={60}>
            <h1 className="text-[40px] sm:text-[60px] lg:text-[68px] leading-[1.03] tracking-[-0.035em] font-semibold text-zinc-950 text-balance">
              Die Betriebssoftware für moderne Autovermietungen.
            </h1>
          </FadeUp>

          <FadeUp delay={120}>
            <p className="mt-6 text-[17px] sm:text-[20px] leading-[1.55] text-zinc-600 max-w-2xl">
              Verträge am Tablet unterschreiben. Schäden per Computer Vision
              beweisen. Strafzettel in 30 Sekunden weiterbelasten. Alles in
              einer Software — statt fünf Excel-Tabellen.
            </p>
          </FadeUp>

          <FadeUp delay={180}>
            <div className="mt-9 flex flex-col sm:flex-row gap-3 sm:items-center">
              <Link
                href="/register"
                className="inline-flex items-center justify-center gap-1.5 h-11 px-5 rounded-lg bg-indigo-600 text-white text-[15px] font-medium hover:bg-indigo-500 transition-colors"
              >
                30 Tage kostenlos testen
                <ArrowRight size={16} />
              </Link>
              <a
                href={BOOKING_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center h-11 px-5 rounded-lg bg-white ring-1 ring-zinc-300 text-zinc-800 text-[15px] font-medium hover:bg-zinc-50 transition-colors"
              >
                Demo mit dem Gründer
              </a>
            </div>
            <div className="mt-4 text-[13px] text-zinc-500">
              Keine Kreditkarte · Monatlich kündbar · Hosting in der EU
            </div>
          </FadeUp>
        </div>

        <FadeUp delay={260}>
          <div className="mt-14 sm:mt-20">
            <BrowserFrame url="app.knoellchen-pilot.de/dashboard">
              <DashboardMock />
            </BrowserFrame>
          </div>
        </FadeUp>
      </div>
    </section>
  );
};

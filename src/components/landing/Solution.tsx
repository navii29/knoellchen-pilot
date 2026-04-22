"use client";

import { useEffect, useState } from "react";
import {
  ArrowRight,
  Building2,
  Check,
  FileStack,
  FileText,
  Mail,
  ReceiptText,
  ScanText,
  Send,
  ShieldCheck,
  UserCheck,
  Wallet,
  AlarmClock,
  Zap,
} from "lucide-react";
import { THEME } from "@/lib/theme";
import { FadeUp } from "./FadeUp";

const steps = [
  {
    Icon: Mail,
    title: "E-Mail kommt rein",
    body: "Behörde schickt Zeugenfragebogen. Wir empfangen an Ihre dedizierte Knöllchen-Adresse.",
    tag: "Eingang",
  },
  {
    Icon: ScanText,
    title: "KI liest alles aus",
    body: "Kennzeichen, Datum, Uhrzeit, Tatort, Verstoß, Bußgeld. Genauigkeit 98,6 %.",
    tag: "OCR",
  },
  {
    Icon: UserCheck,
    title: "Fahrer zuordnen",
    body: "Abgleich mit Ihren Mietverträgen. Richtiger Mieter wird automatisch gefunden.",
    tag: "Matching",
  },
  {
    Icon: FileStack,
    title: "Dokumente erstellen",
    body: "Anschreiben an Mieter, Rechnung (Bußgeld + 25 € Gebühr), Antwort an Behörde.",
    tag: "PDFs",
  },
  {
    Icon: Send,
    title: "Versand & Überwachung",
    body: "E-Mails raus. Fristen, Zahlungen und Mahnungen laufen automatisch weiter.",
    tag: "Automation",
  },
];

export const Solution = () => {
  const [active, setActive] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setActive((a) => (a + 1) % steps.length), 3200);
    return () => clearInterval(t);
  }, []);

  return (
    <section id="loesung" className="relative border-t border-stone-200 bg-stone-50">
      <div className="max-w-6xl mx-auto px-6 py-24 md:py-32">
        <FadeUp>
          <div className="text-xs uppercase tracking-widest text-stone-500 mb-3">Die Lösung</div>
          <h2 className="font-display text-4xl md:text-5xl font-bold tracking-tight max-w-3xl text-balance">
            Fünf Schritte.
            <br />
            <span style={{ color: THEME.primary }}>Null Handarbeit.</span>
          </h2>
        </FadeUp>

        <div className="mt-16 grid lg:grid-cols-[1fr_1.2fr] gap-10 items-start">
          <div className="space-y-3">
            {steps.map((s, i) => {
              const isActive = i === active;
              return (
                <button
                  key={s.title}
                  onClick={() => setActive(i)}
                  className={`w-full text-left rounded-xl p-5 transition-all ring-1 ${
                    isActive
                      ? "bg-white ring-stone-300 shadow-sm"
                      : "bg-transparent ring-stone-200 hover:bg-white/60"
                  }`}
                >
                  <div className="flex items-start gap-4">
                    <div
                      className="w-10 h-10 rounded-lg flex items-center justify-center font-mono text-sm font-semibold"
                      style={{
                        background: isActive ? THEME.primary : "#e7e5e4",
                        color: isActive ? "white" : "#57534e",
                      }}
                    >
                      0{i + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <div className="font-display font-semibold text-[17px]">{s.title}</div>
                        <span className="text-[10px] uppercase tracking-wider font-medium px-1.5 py-0.5 rounded bg-stone-100 text-stone-600">
                          {s.tag}
                        </span>
                      </div>
                      <div className="mt-1 text-sm text-stone-600 leading-relaxed">{s.body}</div>
                    </div>
                    <ArrowRight size={16} className={isActive ? "" : "opacity-0"} />
                  </div>
                </button>
              );
            })}
          </div>

          <div className="lg:sticky lg:top-24">
            <SolutionVisual active={active} />
          </div>
        </div>
      </div>
    </section>
  );
};

const SolutionVisual = ({ active }: { active: number }) => (
  <div className="relative rounded-2xl bg-white ring-1 ring-stone-200 shadow-[0_12px_40px_-12px_rgba(0,0,0,0.15)] overflow-hidden">
    <div className="flex items-center gap-1.5 px-4 h-9 border-b border-stone-200 bg-stone-50">
      <span className="w-2.5 h-2.5 rounded-full bg-stone-300" />
      <span className="w-2.5 h-2.5 rounded-full bg-stone-300" />
      <span className="w-2.5 h-2.5 rounded-full bg-stone-300" />
      <div className="ml-3 text-xs font-mono text-stone-500">knoellchen-pilot.de/automation · KP-2041</div>
    </div>
    <div className="p-6 md:p-8 min-h-[460px]">
      {active === 0 && <StepEmail />}
      {active === 1 && <StepOCR />}
      {active === 2 && <StepMatch />}
      {active === 3 && <StepDocs />}
      {active === 4 && <StepSend />}
    </div>
    <div className="flex gap-1 px-6 pb-5">
      {steps.map((_, i) => (
        <div key={i} className="flex-1 h-1 rounded-full overflow-hidden bg-stone-200">
          <div
            className="h-full transition-all"
            style={{ width: i <= active ? "100%" : "0%", background: THEME.primary }}
          />
        </div>
      ))}
    </div>
  </div>
);

const StepEmail = () => (
  <div className="space-y-4">
    <div className="flex items-center gap-3">
      <div className="w-10 h-10 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center">
        <Mail size={20} />
      </div>
      <div>
        <div className="font-display font-semibold">Zeugenfragebogen eingegangen</div>
        <div className="text-xs text-stone-500 font-mono">eingang@kvr-muenchen.de → tickets@stadtflotte.knp.de</div>
      </div>
    </div>
    <div className="rounded-xl ring-1 ring-stone-200 overflow-hidden">
      <div className="bg-stone-50 px-4 py-2 text-xs text-stone-600 border-b border-stone-200 flex items-center justify-between">
        <span>Zeugenfragebogen_Az-KVR-2026-04-12847.pdf</span>
        <span className="font-mono">218 KB</span>
      </div>
      <div className="p-5 space-y-2 font-mono text-[13px] text-stone-700">
        <div>AZ: <span className="text-stone-500">KVR-2026-04-12847</span></div>
        <div>Kennzeichen: <span className="font-semibold">M-KP 2847</span></div>
        <div>Tatzeit: <span>14.04.2026, 10:42 Uhr</span></div>
        <div>Tatort: <span>Leopoldstraße 82, 80802 München</span></div>
        <div>Tatvorwurf: <span>Parken im Halteverbot</span></div>
        <div>Bußgeld: <span>25,00 €</span></div>
        <div className="text-stone-400 pt-2">Antwortfrist: 28.04.2026</div>
      </div>
    </div>
  </div>
);

const StepOCR = () => {
  const rows: [string, string, number][] = [
    ["Kennzeichen", "M-KP 2847", 0.99],
    ["Tatzeit", "14.04.2026, 10:42", 0.98],
    ["Tatort", "Leopoldstraße 82, München", 0.97],
    ["Verstoß", "Parken im Halteverbot", 0.99],
    ["Behörde", "Kreisverwaltungsref. München", 0.99],
    ["Bußgeld", "25,00 €", 0.99],
    ["Aktenzeichen", "KVR-2026-04-12847", 0.98],
  ];
  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <div
          className="w-10 h-10 rounded-lg flex items-center justify-center"
          style={{ background: THEME.primaryTint, color: THEME.primary }}
        >
          <ScanText size={20} />
        </div>
        <div>
          <div className="font-display font-semibold">Strukturierte Daten extrahiert</div>
          <div className="text-xs text-stone-500">Knöllchen-OCR · Durchschnitt 98,6% Confidence</div>
        </div>
      </div>
      <div className="rounded-xl ring-1 ring-stone-200 divide-y divide-stone-100">
        {rows.map(([k, v, c]) => (
          <div key={k} className="flex items-center px-4 py-2.5 text-sm">
            <div className="w-36 text-stone-500">{k}</div>
            <div className="flex-1 font-mono text-stone-800">{v}</div>
            <div className="flex items-center gap-2">
              <div className="w-20 h-1.5 rounded-full bg-stone-100 overflow-hidden">
                <div className="h-full" style={{ width: `${c * 100}%`, background: THEME.primary }} />
              </div>
              <div className="font-mono text-xs text-stone-500 w-10 text-right">{Math.round(c * 100)}%</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const StepMatch = () => (
  <div className="space-y-5">
    <div className="flex items-center gap-3">
      <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center">
        <UserCheck size={20} />
      </div>
      <div>
        <div className="font-display font-semibold">Fahrer automatisch zugeordnet</div>
        <div className="text-xs text-stone-500">Abgleich mit 142 Mietverträgen · 1 eindeutiger Treffer</div>
      </div>
    </div>
    <div className="rounded-xl ring-1 ring-stone-200 p-5 bg-gradient-to-br from-white to-stone-50">
      <div className="flex items-start gap-4">
        <div className="w-12 h-12 rounded-full bg-stone-900 text-white flex items-center justify-center font-display font-semibold">
          MH
        </div>
        <div className="flex-1">
          <div className="font-display font-semibold text-[17px]">Markus Hofmann</div>
          <div className="text-sm text-stone-500">Klenzestraße 14, 80469 München</div>
          <div className="mt-3 grid grid-cols-2 gap-3 text-xs">
            <div className="bg-white ring-1 ring-stone-200 rounded-lg p-3">
              <div className="text-stone-500">Mietbeginn</div>
              <div className="font-mono font-medium mt-0.5">11.04.2026 14:00</div>
            </div>
            <div className="bg-white ring-1 ring-stone-200 rounded-lg p-3">
              <div className="text-stone-500">Mietende</div>
              <div className="font-mono font-medium mt-0.5">13.04.2026 09:00</div>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1.5 text-xs font-semibold px-2 py-1 rounded-full bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200">
          <Check size={12} /> Match
        </div>
      </div>
      <div className="mt-5 relative h-8">
        <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-1 rounded-full bg-stone-100" />
        <div
          className="absolute top-1/2 -translate-y-1/2 h-1 rounded-full"
          style={{ left: "18%", right: "36%", background: THEME.primary }}
        />
        <div
          className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-white ring-2"
          style={{ left: "18%", borderColor: THEME.primary }}
        />
        <div
          className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-white ring-2"
          style={{ left: "64%", borderColor: THEME.primary }}
        />
        <div className="absolute -top-4 text-[10px] font-mono text-stone-500" style={{ left: "14%" }}>Miete</div>
        <div className="absolute -bottom-4 text-[10px] font-mono" style={{ left: "40%", color: THEME.primary }}>
          Tatzeit 10:42
        </div>
        <div className="absolute -top-4 text-[10px] font-mono text-stone-500" style={{ left: "60%" }}>
          Rückgabe
        </div>
      </div>
    </div>
  </div>
);

const StepDocs = () => {
  const docs = [
    { Icon: FileText, title: "Anschreiben an Mieter", desc: "Hinweis + Zahlungsaufforderung", tag: "PDF" },
    { Icon: ReceiptText, title: "Rechnung", desc: "25,00 € Bußgeld + 25,00 € Gebühr", tag: "PDF", highlight: true },
    { Icon: Building2, title: "Antwort an Behörde", desc: "Zeugenfragebogen ausgefüllt", tag: "PDF" },
  ];
  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-violet-50 text-violet-700 flex items-center justify-center">
          <FileStack size={20} />
        </div>
        <div>
          <div className="font-display font-semibold">Drei Dokumente erstellt</div>
          <div className="text-xs text-stone-500">Automatisch mit Ihren Briefkopfvorlagen</div>
        </div>
      </div>
      <div className="grid gap-3">
        {docs.map((d) => (
          <div
            key={d.title}
            className={`flex items-center gap-4 p-4 rounded-xl ring-1 ${
              d.highlight ? "bg-white ring-stone-300 shadow-sm" : "bg-white ring-stone-200"
            }`}
          >
            <div className="w-11 h-11 rounded-lg bg-stone-100 text-stone-700 flex items-center justify-center">
              <d.Icon size={20} />
            </div>
            <div className="flex-1">
              <div className="font-display font-semibold text-[15px]">{d.title}</div>
              <div className="text-sm text-stone-500">{d.desc}</div>
            </div>
            <span className="text-[10px] uppercase tracking-wider font-mono px-2 py-1 bg-stone-100 rounded">
              {d.tag}
            </span>
          </div>
        ))}
      </div>
      <div className="text-xs text-stone-500 flex items-center gap-2">
        <ShieldCheck size={14} /> Dokumente sind DSGVO-konform und rechtssicher vorformuliert.
      </div>
    </div>
  );
};

const StepSend = () => (
  <div className="space-y-5">
    <div className="flex items-center gap-3">
      <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
        <Send size={20} />
      </div>
      <div>
        <div className="font-display font-semibold">Versand abgeschlossen</div>
        <div className="text-xs text-stone-500">2 E-Mails raus · Fristenkontrolle aktiv</div>
      </div>
    </div>
    <div className="space-y-2">
      <div className="flex items-center gap-3 p-3 rounded-lg bg-emerald-50/50 ring-1 ring-emerald-100">
        <Check size={16} className="text-emerald-700" />
        <div className="flex-1 text-sm">
          <span className="font-medium">An Mieter:</span>{" "}
          <span className="font-mono text-stone-600">markus.hofmann@web.de</span>
        </div>
        <span className="text-xs font-mono text-stone-500">10:42:12</span>
      </div>
      <div className="flex items-center gap-3 p-3 rounded-lg bg-emerald-50/50 ring-1 ring-emerald-100">
        <Check size={16} className="text-emerald-700" />
        <div className="flex-1 text-sm">
          <span className="font-medium">An Behörde:</span>{" "}
          <span className="font-mono text-stone-600">bussgeld@kvr.muenchen.de</span>
        </div>
        <span className="text-xs font-mono text-stone-500">10:42:14</span>
      </div>
      <div className="flex items-center gap-3 p-3 rounded-lg bg-white ring-1 ring-stone-200">
        <AlarmClock size={16} className="text-stone-500" />
        <div className="flex-1 text-sm">
          Frist überwacht — Erinnerung am <span className="font-mono">26.04.2026</span>
        </div>
      </div>
      <div className="flex items-center gap-3 p-3 rounded-lg bg-white ring-1 ring-stone-200">
        <Wallet size={16} className="text-stone-500" />
        <div className="flex-1 text-sm">Zahlung der 25 € Gebühr wird überwacht</div>
      </div>
    </div>
    <div className="mt-4 flex items-center justify-between p-4 rounded-xl text-white" style={{ background: THEME.primary }}>
      <div>
        <div className="text-xs uppercase tracking-wider opacity-80">Gesamtdauer</div>
        <div className="font-display text-2xl font-bold">28 Sekunden</div>
      </div>
      <Zap size={28} />
    </div>
  </div>
);

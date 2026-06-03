"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { FadeUp } from "./FadeUp";

const faqs = [
  {
    q: "Wie genau ist die KI beim Auslesen von Strafzetteln?",
    a: "Knöllchen-Pilot setzt auf Claude Sonnet 4.6 mit Vision-Capabilities. Bei deutschen Bußgeldbescheiden und Anhörungsbögen erreichen wir in internen Tests Erkennungsraten von rund 95 %. Jedes ausgelesene Dokument bekommt einen Confidence-Wert, und vor dem Versand geben Sie es frei — unklare Fälle prüfen Sie also gezielt, bevor etwas rausgeht.",
  },
  {
    q: "Was passiert mit meinen Daten? Ist das DSGVO-konform?",
    a: "Ihre Daten liegen verschlüsselt in einem EU-Rechenzentrum (Supabase, Frankfurt). Knöllchen-Pilot ist DSGVO-konform aufgebaut: AV-Vertrag, Lösch- und Auskunftsrechte gehören dazu. Ihre Kundendaten werden nicht zum Training von KI-Modellen verwendet.",
  },
  {
    q: "Kann ich Knöllchen-Pilot mit meiner bestehenden Software verbinden?",
    a: "LexOffice (Buchhaltung) ist bereits angebunden. GPS-Tracking (Echoes.solutions), Zahlungsabwicklung und E-Mail-Inbound sind in Vorbereitung. Für individuelle Anbindungen sprechen Sie uns gerne an.",
  },
  {
    q: "Wie lange dauert das Onboarding?",
    a: "In den meisten Fällen sind Sie in 30 Minuten startklar. Sie laden Ihre Fahrzeuge und Buchungen per CSV hoch — oder lassen die KI Ihre bestehenden PDFs auslesen. Beim Enterprise-Plan begleiten wir Sie persönlich durch den gesamten Prozess.",
  },
  {
    q: "Was kostet eine KI-Auslesung wirklich?",
    a: "Die Auslesung eines Strafzettels über Claude Vision kostet uns ca. 2 Cent pro Dokument. Im Starter- und Professional-Plan sind großzügige Kontingente enthalten — der Enterprise-Plan hat keine Begrenzung. Sie zahlen einen Pauschalpreis pro Monat, keine versteckten API-Kosten.",
  },
  {
    q: "Kann ich jederzeit kündigen?",
    a: "Ja. Alle Pläne sind monatlich kündbar, ohne Mindestlaufzeit. Beim Enterprise-Plan haben wir flexible Konditionen — sprechen Sie mit unserem Vertrieb.",
  },
];

const Item = ({
  q,
  a,
  open,
  onToggle,
}: {
  q: string;
  a: string;
  open: boolean;
  onToggle: () => void;
}) => (
  <div className="border-b border-zinc-200">
    <button
      onClick={onToggle}
      className="w-full text-left flex items-center justify-between gap-6 py-5 group"
    >
      <span
        className={`text-[16px] sm:text-[17px] font-medium tracking-[-0.01em] transition-colors ${
          open ? "text-zinc-950" : "text-zinc-800 group-hover:text-zinc-950"
        }`}
      >
        {q}
      </span>
      <span
        className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center transition-all ${
          open ? "bg-indigo-600 text-white rotate-45" : "bg-zinc-100 text-zinc-600"
        }`}
      >
        <Plus size={15} strokeWidth={2.25} />
      </span>
    </button>
    <div
      className={`grid transition-[grid-template-rows] duration-300 ease-out ${
        open ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
      }`}
    >
      <div className="overflow-hidden">
        <p className="pb-5 pr-2 sm:pr-10 text-[15px] leading-[1.6] text-zinc-600">{a}</p>
      </div>
    </div>
  </div>
);

export const FAQ = () => {
  const [openIdx, setOpenIdx] = useState(0);
  return (
    <section id="faq" className="bg-white border-t border-zinc-100 py-20 sm:py-28">
      <div className="max-w-3xl mx-auto px-5 sm:px-8">
        <FadeUp>
          <div className="mb-10">
            <div className="text-[12px] font-semibold uppercase tracking-[0.09em] text-indigo-600 mb-4">
              FAQ
            </div>
            <h2 className="text-[30px] sm:text-[42px] leading-[1.08] tracking-[-0.03em] font-semibold text-zinc-950">
              Häufige Fragen
            </h2>
          </div>
        </FadeUp>

        <FadeUp delay={100}>
          <div>
            {faqs.map((f, i) => (
              <Item
                key={f.q}
                q={f.q}
                a={f.a}
                open={openIdx === i}
                onToggle={() => setOpenIdx(openIdx === i ? -1 : i)}
              />
            ))}
          </div>
        </FadeUp>
      </div>
    </section>
  );
};

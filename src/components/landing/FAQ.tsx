"use client";

import { useState } from "react";
import { FadeUp } from "./FadeUp";

const faqs = [
  {
    q: "Wie genau ist die KI beim Auslesen von Strafzetteln?",
    a: "Knöllchen-Pilot setzt auf Claude Sonnet 4.6 mit Vision-Capabilities. Bei deutschen Bußgeldbescheiden und Anhörungsbögen erreichen wir Erkennungsraten von durchschnittlich 95 %. Bei Unsicherheit zeigt das System einen Confidence-Wert an, sodass Sie unklare Fälle gezielt prüfen können.",
  },
  {
    q: "Was passiert mit meinen Daten? Ist das DSGVO-konform?",
    a: "Alle Daten liegen verschlüsselt in deutschen Rechenzentren bei Supabase EU. Wir sind vollständig DSGVO-konform, mit AV-Vertrag, Lösch- und Auskunftsrechten. Ihre Kundendaten werden niemals zum Training von KI-Modellen verwendet.",
  },
  {
    q: "Kann ich Knöllchen-Pilot mit meiner bestehenden Software verbinden?",
    a: "Ja. Wir haben fertige Integrationen für LexOffice (Buchhaltung), Echoes.solutions (GPS-Tracking), Stripe (Zahlungen) und Mailgun (E-Mail-Inbound). Über unsere REST-API können Sie zudem eigene Anbindungen bauen — Webhooks für alle wichtigen Events sind dabei.",
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
}) => {
  return (
    <div className="border-b border-black/[0.08]">
      <button
        onClick={onToggle}
        className="w-full text-left flex items-center justify-between gap-6 py-6 group"
      >
        <span
          className={`text-[17px] sm:text-[19px] font-medium tracking-[-0.01em] transition-colors ${
            open ? "text-stone-900" : "text-stone-800 group-hover:text-stone-900"
          }`}
        >
          {q}
        </span>
        <span
          className={`shrink-0 w-9 h-9 rounded-full flex items-center justify-center transition-all ${
            open ? "bg-stone-900 text-white rotate-45" : "bg-stone-100 text-stone-700"
          }`}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
        </span>
      </button>
      <div
        className={`grid transition-[grid-template-rows] duration-300 ease-out ${
          open ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
        }`}
      >
        <div className="overflow-hidden">
          <p className="pb-6 pr-12 text-[15.5px] leading-[1.6] text-stone-600">{a}</p>
        </div>
      </div>
    </div>
  );
};

export const FAQ = () => {
  const [openIdx, setOpenIdx] = useState(0);
  return (
    <section id="faq" className="bg-stone-50 py-28 sm:py-36">
      <div className="max-w-4xl mx-auto px-6 lg:px-10">
        <FadeUp>
          <div className="text-center mb-14">
            <div className="inline-flex items-center gap-2 px-3 h-7 rounded-full bg-white ring-1 ring-black/[0.06] text-[12px] text-stone-600 mb-6">
              FAQ
            </div>
            <h2 className="font-display text-stone-900 text-[40px] sm:text-[56px] lg:text-[64px] leading-[1.05] tracking-[-0.03em] font-medium text-balance">
              Häufige Fragen.
            </h2>
          </div>
        </FadeUp>

        <FadeUp delay={120}>
          <div className="bg-white rounded-2xl ring-1 ring-black/[0.06] px-6 sm:px-8">
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

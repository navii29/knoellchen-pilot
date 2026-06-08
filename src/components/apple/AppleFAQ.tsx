"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { Reveal } from "./Reveal";

type FAQItem = { q: string; a: string };

const ITEMS: FAQItem[] = [
  {
    q: "Wo werden meine Daten gespeichert? Ist das DSGVO-konform?",
    a: "Alle Daten werden ausschließlich auf EU-Servern (Supabase Frankfurt) gespeichert und verlassen die EU zu keinem Zeitpunkt. Die KI-Analyse erfolgt über die Anthropic API, die keine Daten für Trainingszwecke verwendet. Wir unterhalten einen Auftragsverarbeitungsvertrag (AVV), den Sie auf Anfrage erhalten.",
  },
  {
    q: "Wie liest die KI die Strafzettel aus?",
    a: "Knöllchen-Pilot nutzt Claude Vision (Anthropic) um hochgeladene Fotos oder PDFs von Bußgeldbescheiden und Anhörungsbögen vollständig zu analysieren. Kennzeichen, Tatzeit, Verstoßkategorie, Betrag und Behörden-Aktenzeichen werden automatisch erkannt und dem passenden Mietvertrag zugeordnet.",
  },
  {
    q: "Darf ich das Bußgeld überhaupt an den Mieter weiterbelasten?",
    a: "Ja. Als Halter benennen Sie der Behörde über den Zeugenfragebogen den verantwortlichen Fahrer (Halterauskunft) — das ist der übliche, rechtlich vorgesehene Weg. Die im Mietvertrag vereinbarte Bearbeitungsgebühr stellen Sie dem Mieter zusätzlich in Rechnung. Knöllchen-Pilot erzeugt die nötigen Dokumente passend zu Ihren Vertragsbedingungen.",
  },
  {
    q: "Wann kommt Stripe-Zahlung und E-Mail-Inbound?",
    a: "Stripe-Integration und automatischer E-Mail-Inbound (Mailgun) befinden sich aktuell in der Beta-Phase und werden in Kürze für alle Pläne freigeschaltet. Bis dahin werden Pläne manuell aktiviert. Sie werden per E-Mail informiert, sobald die Features verfügbar sind.",
  },
  {
    q: "Gibt es eine Testphase? Wie lange läuft der Vertrag?",
    a: "Ja. Jeder Plan startet mit 14 Tagen kostenlos, keine Kreditkarte erforderlich. Danach läuft der Vertrag monatlich und ist jederzeit zum Monatsende kundbar. Es gibt keine Mindestlaufzeit und keine Einrichtungsgebühren.",
  },
  {
    q: "Wie erreiche ich den Support?",
    a: "Im Starter-Plan steht Ihnen unser E-Mail-Support zur Verfügung (Antwortzeit werktags < 24 h). Pro-Kunden erhalten Prioritäts-Support mit einer garantierten Antwortzeit von 4 Stunden. Enterprise-Kunden können einen dedizierten Account-Manager und telefonischen Support buchen.",
  },
  {
    q: "Kann ich mehrere Standorte oder Filialen verwalten?",
    a: "Multi-Standort-Verwaltung ist im Enterprise-Plan enthalten. Damit lassen sich mehrere Filialen unter einem Dach führen, mit getrennten Flotten, Buchungen und Abrechnungen je Standort. Für Starter- und Pro-Kunden steht ein einzelnes Organisations-Konto zur Verfügung.",
  },
];

const Item = ({ item, open, onToggle }: { item: FAQItem; open: boolean; onToggle: () => void }) => (
  <div className="border-b border-black/[0.06] last:border-0">
    <button
      className="w-full flex items-start justify-between gap-4 py-5 text-left group"
      onClick={onToggle}
      aria-expanded={open}
    >
      <span className="text-[18px] sm:text-[20px] font-semibold tracking-tight text-graphite leading-[1.25] group-hover:text-azure transition-colors duration-150">
        {item.q}
      </span>
      <ChevronDown
        size={20}
        className={`shrink-0 mt-0.5 text-graphite-muted transition-transform duration-300 ${open ? "rotate-180 text-azure" : ""}`}
        strokeWidth={2}
      />
    </button>

    <div
      className={`overflow-hidden transition-all duration-300 ease-in-out ${open ? "max-h-[400px] pb-5" : "max-h-0"}`}
    >
      <p className="text-[16px] leading-[1.6] text-graphite-soft pr-8">{item.a}</p>
    </div>
  </div>
);

export const AppleFAQ = () => {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const toggle = (i: number) => setOpenIndex(openIndex === i ? null : i);

  return (
    <section id="faq" className="bg-white">
      <div className="max-w-[760px] mx-auto px-5 py-24 sm:py-32">
        <Reveal as="div" className="text-center mb-14">
          <div className="inline-flex items-center gap-2 text-[13px] text-graphite-muted mb-5">
            <span className="w-1.5 h-1.5 rounded-full bg-azure" />
            Häufige Fragen
          </div>
          <h2 className="apple-display text-[34px] sm:text-[52px] text-graphite mx-auto max-w-[18ch]">
            Alles Wichtige auf einen Blick.
          </h2>
        </Reveal>

        <Reveal as="div">
          {ITEMS.map((item, i) => (
            <Item key={i} item={item} open={openIndex === i} onToggle={() => toggle(i)} />
          ))}
        </Reveal>

        <Reveal as="p" className="mt-10 text-center text-[14px] text-graphite-muted">
          Noch offene Fragen?{" "}
          <a href="mailto:hello@knoellchen-pilot.de" className="text-azure-link hover:opacity-70 transition-opacity">
            Schreiben Sie uns.
          </a>
        </Reveal>
      </div>
    </section>
  );
};

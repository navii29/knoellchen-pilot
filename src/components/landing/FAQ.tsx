"use client";

import { useState } from "react";
import { Plus, Minus } from "lucide-react";

const FAQS = [
  {
    q: "Wo liegen meine Daten — ist das DSGVO-konform?",
    a: "Alle Daten liegen verschlüsselt auf Servern in der EU (Supabase EU-Region, Deutschland). Wir arbeiten mit AV-Vertrag, Auskunfts- und Löschrechten nach DSGVO. Ihre Kunden- und Buchungsdaten werden niemals zum Training von Software-Modellen verwendet.",
  },
  {
    q: "Wie funktioniert die Software-Auslesung von Strafzetteln genau?",
    a: "Knöllchen-Pilot nutzt Software (Anthropic) um Bußgeldbescheide und Anhörungsbögen als Bild oder PDF auszulesen. Die Software extrahiert Kennzeichen, Tatzeit, Tatort, Behörde und Betrag — und gibt einen Confidence-Wert zurück. Unter 80 % markiert die Leitstelle den Fall zur manuellen Prüfung. Der Mensch entscheidet, bevor irgendetwas rausgeht.",
  },
  {
    q: "Sind Stripe-Zahlung und E-Mail-Inbound schon live?",
    a: "Noch nicht. Stripe-Zahlungen und automatischer E-Mail-Inbound (Mailgun-Webhook) sind in Entwicklung und werden bald freigeschaltet. Aktuell läuft die Abrechnung per SEPA-Überweisung, Strafzettel werden manuell hochgeladen. Wir halten Sie per In-App-Hinweis auf dem Laufenden.",
  },
  {
    q: "Gibt es eine Mindestlaufzeit oder Testphase?",
    a: "Nein. Sie können Knöllchen-Pilot 14 Tage lang ohne Kreditkarte kostenlos testen. Danach wählen Sie einen Tarif — alle Tarife sind monatlich kündbar, ohne Mindestlaufzeit. Beim Enterprise-Plan sprechen wir individuelle Konditionen ab.",
  },
  {
    q: "Welchen Support bieten Sie an?",
    a: "Starter-Kunden erhalten E-Mail-Support mit Antwort innerhalb von einem Werktag. Pro-Kunden werden priorisiert behandelt. Enterprise-Kunden bekommen einen dedizierten Account-Manager und optional ein SLA. Wir sind ein deutsches Team — kein Outsourcing.",
  },
  {
    q: "Kann ich mehrere Standorte oder Mandanten verwalten?",
    a: "Multi-Mandanten-Fähigkeit ist ab dem Enterprise-Plan verfügbar. Jeder Standort hat dann seine eigene Organisation, eigene Nutzer, Preise und Dokumente — vollständig getrennt. Für einzelne Vermietungen mit einem Standort reicht Starter oder Pro.",
  },
  {
    q: "Was passiert, wenn die Software einen Strafzettel falsch ausliest?",
    a: "Vor jedem Versand sehen Sie die ausgelesenen Daten im Überblick — Felder mit niedrigem Confidence-Wert sind hervorgehoben. Sie korrigieren, was nötig ist, und geben dann frei. Die Leitstelle schickt niemals automatisch etwas raus, ohne Ihre Freigabe.",
  },
];

const AccordionItem = ({
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
  <div className="border-b border-hairline last:border-b-0">
    <button
      onClick={onToggle}
      className="w-full text-left flex items-start justify-between gap-4 py-5 group"
      aria-expanded={open}
    >
      <span
        className={`font-display font-bold text-[15.5px] lg:text-[17px] leading-snug tracking-tight transition-colors ${
          open ? "text-ink" : "text-ink group-hover:text-ink"
        }`}
      >
        {q}
      </span>
      <span
        className={`shrink-0 mt-0.5 w-7 h-7 rounded-panel border flex items-center justify-center transition-colors ${
          open
            ? "border-signal bg-signal text-white"
            : "border-hairline bg-canvas text-ink-muted"
        }`}
      >
        {open ? (
          <Minus size={12} strokeWidth={2.5} />
        ) : (
          <Plus size={12} strokeWidth={2.5} />
        )}
      </span>
    </button>
    <div
      className={`grid transition-[grid-template-rows] duration-200 ease-out ${
        open ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
      }`}
    >
      <div className="overflow-hidden">
        <p className="pb-5 pr-10 text-[14px] leading-relaxed text-ink-soft">{a}</p>
      </div>
    </div>
  </div>
);

export const FAQ = () => {
  const [openIdx, setOpenIdx] = useState(0);

  return (
    <section id="faq" className="bg-canvas border-t border-hairline">
      <div className="max-w-wide mx-auto px-5 lg:px-8 py-20 lg:py-28">
        {/* header */}
        <div className="max-w-2xl mb-12">
          <span className="kicker text-ink-muted">FAQ</span>
          <h2 className="mt-4 font-display font-extrabold text-[28px] lg:text-[38px] text-ink leading-tight tracking-tightest">
            Häufige Fragen.
            <br />
            <span className="text-ink-muted">Klare Antworten.</span>
          </h2>
        </div>

        {/* accordion */}
        <div className="max-w-3xl rounded-card border border-hairline bg-paper shadow-panel overflow-hidden">
          <div className="divide-y divide-hairline px-6">
            {FAQS.map((f, i) => (
              <AccordionItem
                key={f.q}
                q={f.q}
                a={f.a}
                open={openIdx === i}
                onToggle={() => setOpenIdx(openIdx === i ? -1 : i)}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

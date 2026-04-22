"use client";

import { useState } from "react";
import { Minus, Plus } from "lucide-react";
import { FadeUp } from "./FadeUp";

const items = [
  {
    q: "Wie lange dauert die Einrichtung?",
    a: "Etwa 15 Minuten. Sie hinterlegen Ihre Weiterleitungs-E-Mail, laden Ihre aktuellen Mietverträge hoch und wählen Ihren Briefkopf. Dann läuft es.",
  },
  {
    q: "Was brauche ich dafür?",
    a: "Nur eine E-Mail-Adresse, an die Behörden Zeugenfragebögen schicken. Alles andere übernimmt Knöllchen-Pilot.",
  },
  {
    q: "Ist das DSGVO-konform?",
    a: "Ja. Alle Daten liegen ausschließlich auf deutschen Servern (Frankfurt/Nürnberg), verschlüsselt nach BSI-Standard. Auftragsverarbeitungsvertrag inklusive.",
  },
  {
    q: "Kann ich das vorher testen?",
    a: "Ja — 30 Tage kostenlos, ohne Kreditkarte. Sie können bis zu 10 Strafzettel bearbeiten und sehen, wie es in Ihrem Alltag funktioniert.",
  },
  {
    q: "Was, wenn die KI falsch liest?",
    a: "Bei Confidence unter 95 % wird der Fall automatisch zur manuellen Prüfung vorgelegt. Sie haben immer die letzte Kontrolle.",
  },
  {
    q: "Wie läuft die Zahlung der 25 € Gebühr?",
    a: "Die Gebühr wird dem Mieter zusammen mit dem Bußgeld in Rechnung gestellt. Knöllchen-Pilot überwacht Zahlungseingänge und mahnt automatisch.",
  },
];

export const FAQ = () => {
  const [open, setOpen] = useState(0);
  return (
    <section id="faq" className="relative border-t border-stone-200 bg-white">
      <div className="max-w-4xl mx-auto px-6 py-24 md:py-32">
        <FadeUp>
          <div className="text-xs uppercase tracking-widest text-stone-500 mb-3">FAQ</div>
          <h2 className="font-display text-4xl md:text-5xl font-bold tracking-tight">Häufige Fragen.</h2>
        </FadeUp>
        <div className="mt-12 divide-y divide-stone-200 ring-1 ring-stone-200 rounded-2xl overflow-hidden">
          {items.map((it, i) => {
            const isOpen = open === i;
            return (
              <div key={i} className="bg-white">
                <button
                  onClick={() => setOpen(isOpen ? -1 : i)}
                  className="w-full flex items-center justify-between px-6 py-5 text-left"
                >
                  <span className="font-display font-semibold text-[17px]">{it.q}</span>
                  {isOpen ? <Minus size={18} className="text-stone-500" /> : <Plus size={18} className="text-stone-500" />}
                </button>
                {isOpen && <div className="px-6 pb-6 text-stone-600 leading-relaxed max-w-3xl">{it.a}</div>}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

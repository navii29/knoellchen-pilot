import {
  AlarmClock,
  Clock,
  FilePenLine,
  FolderSearch,
  Keyboard,
  MailOpen,
  ReceiptText,
} from "lucide-react";
import { FadeUp } from "./FadeUp";

const items = [
  { Icon: MailOpen, label: "E-Mail öffnen", detail: "Zeugenfragebogen als PDF-Anhang. Manuell lesen." },
  { Icon: Keyboard, label: "Daten abtippen", detail: "Kennzeichen, Datum, Verstoß, Betrag — in Excel." },
  { Icon: FolderSearch, label: "Mietvertrag suchen", detail: "Wer hatte das Auto am 14.04. um 10:42?" },
  { Icon: FilePenLine, label: "Briefe schreiben", detail: "Anschreiben, Rechnung, Antwort an Behörde." },
  { Icon: AlarmClock, label: "Fristen merken", detail: "14 Tage. Vergessen = 40 € Verwarnung für Sie." },
  { Icon: ReceiptText, label: "Gebühr nachverfolgen", detail: "Hat der Mieter die 25 € überwiesen?" },
];

export const Problem = () => (
  <section id="problem" className="relative border-t border-stone-200 bg-white">
    <div className="max-w-6xl mx-auto px-6 py-24 md:py-32">
      <FadeUp>
        <div className="text-xs uppercase tracking-widest text-stone-500 mb-3">Das Problem</div>
        <h2 className="font-display text-4xl md:text-5xl font-bold tracking-tight max-w-3xl text-balance">
          Sie verbringen Stunden mit Strafzetteln
          <br />
          <span className="text-stone-400">statt mit Ihrem Geschäft.</span>
        </h2>
        <p className="mt-5 text-lg text-stone-600 max-w-2xl">
          Jeder Strafzettel frisst 30–45 Minuten. Bei 40 Fällen im Monat sind das über 25 Arbeitsstunden — nur für
          Papierkram.
        </p>
      </FadeUp>

      <div className="mt-14 grid md:grid-cols-3 gap-px bg-stone-200 rounded-2xl overflow-hidden ring-1 ring-stone-200">
        {items.map((it, i) => (
          <FadeUp key={it.label} delay={i * 60}>
            <div className="bg-white p-7 h-full">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-stone-100 flex items-center justify-center text-stone-700">
                  <it.Icon size={18} />
                </div>
                <div className="font-display font-semibold text-[17px]">{it.label}</div>
              </div>
              <div className="mt-3 text-sm text-stone-500 leading-relaxed">{it.detail}</div>
            </div>
          </FadeUp>
        ))}
      </div>

      <FadeUp delay={200}>
        <div className="mt-10 flex items-center gap-4 p-5 rounded-xl bg-stone-950 text-stone-100">
          <div className="w-11 h-11 rounded-full bg-amber-400/10 flex items-center justify-center text-amber-400">
            <Clock size={22} />
          </div>
          <div className="flex-1">
            <div className="font-display font-semibold">30–45 Minuten pro Strafzettel.</div>
            <div className="text-sm text-stone-400">Zeit, die Sie nie wieder zurückbekommen.</div>
          </div>
          <div className="font-display text-2xl font-bold text-amber-400 hidden sm:block">-€</div>
        </div>
      </FadeUp>
    </div>
  </section>
);

import {
  Car,
  FileSignature,
  Plug,
  Smartphone,
  Sparkles,
  TrendingUp,
  UserCheck,
  type LucideIcon,
} from "lucide-react";
import { FadeUp } from "./FadeUp";

const items: { Icon: LucideIcon; title: string; body: string }[] = [
  {
    Icon: FileSignature,
    title: "Verträge & Kalender",
    body: "Mietverträge, Buchungskalender und Fahrzeugverfügbarkeit an einem Ort — keine Doppelbuchungen mehr.",
  },
  {
    Icon: Car,
    title: "Flotten-Management",
    body: "Stammdaten plus TÜV-, Reifen- und Aussteuerungs-Alerts. Sie sehen sofort, welches Fahrzeug Aufmerksamkeit braucht.",
  },
  {
    Icon: Sparkles,
    title: "KI-Sprachassistent",
    body: "Fragen Sie in normaler Sprache, welche Autos heute frei sind — oder legen Sie ganze Verträge per Befehl an.",
  },
  {
    Icon: TrendingUp,
    title: "Dynamische Preise",
    body: "Saison-, Wochenend- und Nachfrageregeln berechnen automatisch die optimale Tagesrate je Fahrzeug.",
  },
  {
    Icon: UserCheck,
    title: "Kunden & Führerschein-Scan",
    body: "Führerscheinfoto hochladen — Name, Adresse, Klasse und Gültigkeit werden ausgelesen und geprüft.",
  },
  {
    Icon: Smartphone,
    title: "Self-Service Kundenportal",
    body: "Mieter erledigen Check-in, Foto-Upload und Unterschrift selbst — per Magic-Link, ganz ohne Login.",
  },
  {
    Icon: Plug,
    title: "Integrationen",
    body: "LexOffice für die Buchhaltung ist angebunden. Weitere Anbindungen sind in Vorbereitung — oder sprechen Sie uns an.",
  },
];

export const FeatureBento = () => (
  <section className="bg-white border-t border-zinc-100 py-20 sm:py-28">
    <div className="max-w-6xl mx-auto px-5 sm:px-8">
      <FadeUp>
        <div className="max-w-2xl mb-12">
          <div className="text-[12px] font-semibold uppercase tracking-[0.09em] text-indigo-600 mb-4">
            Alles in einer App
          </div>
          <h2 className="text-[30px] sm:text-[42px] leading-[1.08] tracking-[-0.03em] font-semibold text-zinc-950 text-balance">
            Eine Software für den ganzen Betrieb.
          </h2>
          <p className="mt-4 text-[16px] text-zinc-600 leading-relaxed">
            Über Schäden und Strafzettel hinaus deckt Knöllchen-Pilot den
            kompletten Vermietungs-Alltag ab.
          </p>
        </div>
      </FadeUp>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {items.map((it, i) => (
          <FadeUp key={it.title} delay={(i % 3) * 60}>
            <div className="h-full rounded-xl border border-zinc-200 p-6 hover:border-zinc-300 transition-colors">
              <div className="w-10 h-10 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                <it.Icon size={19} strokeWidth={1.9} />
              </div>
              <div className="mt-4 text-[16px] font-semibold text-zinc-950">{it.title}</div>
              <p className="mt-1.5 text-[14px] leading-relaxed text-zinc-500">{it.body}</p>
            </div>
          </FadeUp>
        ))}
      </div>
    </div>
  </section>
);

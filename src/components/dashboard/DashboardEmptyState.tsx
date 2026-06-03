"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Car, Loader2, Sparkles, Upload, Users } from "lucide-react";

const Action = ({
  href,
  Icon,
  title,
  desc,
}: {
  href: string;
  Icon: typeof Car;
  title: string;
  desc: string;
}) => (
  <Link
    href={href}
    className="group flex items-start gap-3.5 rounded-2xl bg-white ring-1 ring-stone-200 p-5 hover:ring-stone-300 hover:shadow-sm transition"
  >
    <div className="w-10 h-10 rounded-xl bg-teal-50 ring-1 ring-teal-100 text-teal-700 flex items-center justify-center shrink-0">
      <Icon size={18} strokeWidth={1.75} />
    </div>
    <div className="min-w-0">
      <div className="flex items-center gap-1 text-[14.5px] font-medium text-stone-900">
        {title}
        <ArrowRight size={14} className="text-stone-400 group-hover:translate-x-0.5 transition-transform" />
      </div>
      <div className="text-[13px] text-stone-500 mt-0.5 leading-snug">{desc}</div>
    </div>
  </Link>
);

export const DashboardEmptyState = () => {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const loadDemo = async () => {
    setLoading(true);
    try {
      await fetch("/api/demo/seed", { method: "POST" });
      router.refresh();
    } catch {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-3xl bg-white ring-1 ring-black/[0.05] p-8 sm:p-12">
      <div className="max-w-2xl">
        <div className="inline-flex items-center gap-2 px-3 h-7 rounded-full bg-teal-50 ring-1 ring-teal-100 text-[12px] text-teal-700 font-medium mb-5">
          <Sparkles size={13} />
          Erste Schritte
        </div>
        <h2 className="font-display font-medium text-[24px] sm:text-[30px] leading-[1.1] tracking-[-0.02em] text-stone-900">
          Willkommen — richten wir Ihre Vermietung ein.
        </h2>
        <p className="text-[14.5px] text-stone-500 mt-3 leading-relaxed">
          Legen Sie Ihre Flotte an, importieren Sie Verträge oder laden Sie den
          ersten Strafzettel hoch. Möchten Sie das Produkt erst gefahrlos
          ausprobieren? Laden Sie eine komplette Beispiel-Vermietung — jederzeit
          wieder entfernbar.
        </p>
      </div>

      <div className="mt-7 grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
        <Action href="/dashboard/vehicles/new" Icon={Car} title="Fahrzeug anlegen" desc="Bauen Sie Ihre Flotte auf — oder per CSV importieren." />
        <Action href="/dashboard/customers/new" Icon={Users} title="Kunde anlegen" desc="Führerschein scannen, Daten automatisch erfassen." />
        <Action href="/dashboard/upload" Icon={Upload} title="Strafzettel hochladen" desc="KI liest Aktenzeichen, Tatort, Bußgeld & Frist aus." />
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-3 border-t border-stone-100 pt-6">
        <button
          onClick={loadDemo}
          disabled={loading}
          className="inline-flex items-center gap-2 px-4 h-10 rounded-full bg-stone-900 text-white text-[14px] font-medium hover:bg-stone-800 transition disabled:opacity-60"
        >
          {loading ? <Loader2 size={15} className="animate-spin" /> : <Sparkles size={15} />}
          Beispieldaten laden
        </button>
        <span className="text-[12.5px] text-stone-400">
          Erstellt eine fiktive Flotte mit Verträgen, Strafzetteln & Auswertungen.
        </span>
      </div>
    </div>
  );
};

import Link from "next/link";
import {
  Car,
  Coins,
  FileText,
  Hourglass,
  Inbox,
  LayoutDashboard,
  Play,
  Settings,
  Sparkles,
  TrendingUp,
  Upload,
} from "lucide-react";
import { THEME, STATUS_META } from "@/lib/theme";
import type { TicketStatus } from "@/lib/types";
import { FadeUp } from "./FadeUp";

const stats = [
  { label: "Neue Eingänge", value: "3", Icon: Inbox, color: "#f59e0b" },
  { label: "Offen", value: "5", Icon: Hourglass, color: "#60a5fa" },
  { label: "Bearbeitungsgebühren", value: "325 €", Icon: Coins, color: THEME.primary },
  { label: "Gesamtvolumen", value: "1.480 €", Icon: TrendingUp, color: "#34d399" },
];

const rows: Array<{ status: TicketStatus; plate: string; off: string; amt: string; when: string }> = [
  { status: "neu", plate: "M-KP 2847", off: "Parken im Halteverbot", amt: "50,00 €", when: "vor 23 Min." },
  { status: "neu", plate: "M-AV 1204", off: "Geschw. +21 km/h", amt: "140,00 €", when: "vor 1 Std." },
  { status: "neu", plate: "M-RT 9912", off: "Parken auf Gehweg", amt: "80,00 €", when: "vor 3 Std." },
  { status: "zugeordnet", plate: "M-KP 2310", off: "Parken ohne Parkschein", amt: "45,00 €", when: "gestern" },
  { status: "weiterbelastet", plate: "M-KP 0418", off: "Rotlichtverstoß", amt: "115,00 €", when: "vor 5 Tagen" },
  { status: "bezahlt", plate: "M-KP 7744", off: "Absolutes Halteverbot", amt: "50,00 €", when: "vor 9 Tagen" },
];

export const DashboardPreview = () => (
  <section
    id="dashboard"
    className="relative border-t border-stone-200 bg-stone-950 text-stone-100 overflow-hidden"
  >
    <div
      className="absolute inset-0 opacity-[0.06]"
      style={{
        backgroundImage:
          "linear-gradient(to right, white 1px, transparent 1px), linear-gradient(to bottom, white 1px, transparent 1px)",
        backgroundSize: "48px 48px",
      }}
    />
    <div className="relative max-w-6xl mx-auto px-6 py-24 md:py-32">
      <FadeUp>
        <div className="text-xs uppercase tracking-widest text-stone-400 mb-3">Dashboard</div>
        <h2 className="font-display text-4xl md:text-5xl font-bold tracking-tight max-w-3xl text-balance">
          Ihre gesamte Strafzettel-
          <br />
          Operation auf einem Screen.
        </h2>
        <p className="mt-5 text-lg text-stone-400 max-w-2xl">
          Eingänge, Zuordnungen, Gebühren, Fristen — alles in Echtzeit. Ein Klick zur Detailansicht.
        </p>
      </FadeUp>

      <FadeUp delay={150}>
        <div className="mt-14 rounded-2xl overflow-hidden ring-1 ring-white/10 shadow-[0_30px_80px_-20px_rgba(0,0,0,0.5)]">
          <MiniDashboard />
        </div>
      </FadeUp>

      <FadeUp delay={250}>
        <div className="mt-10 flex flex-col sm:flex-row items-center justify-between gap-4 p-6 rounded-xl bg-white/5 ring-1 ring-white/10">
          <div>
            <div className="font-display font-semibold text-lg">Live-Demo ausprobieren</div>
            <div className="text-sm text-stone-400">
              Klicken Sie sich durch echte Strafzettel, Detailansichten und Upload-Flow.
            </div>
          </div>
          <Link
            href="/register"
            className="inline-flex items-center gap-2 px-5 py-3 rounded-lg font-semibold text-stone-900 bg-white hover:bg-stone-100"
          >
            <Play size={16} /> Konto erstellen
          </Link>
        </div>
      </FadeUp>
    </div>
  </section>
);

const MiniDashboard = () => (
  <div className="bg-white text-stone-900">
    <div className="flex items-center justify-between px-5 h-11 border-b border-stone-200 bg-stone-50">
      <div className="flex items-center gap-4">
        <div className="flex gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-stone-300" />
          <span className="w-2.5 h-2.5 rounded-full bg-stone-300" />
          <span className="w-2.5 h-2.5 rounded-full bg-stone-300" />
        </div>
        <div className="text-xs font-mono text-stone-500">app.knoellchen-pilot.de/dashboard</div>
      </div>
      <div className="text-xs text-stone-500">Stadtflotte München · 14.04.2026</div>
    </div>
    <div className="grid grid-cols-[200px_1fr]">
      <div className="bg-stone-50 border-r border-stone-200 p-3 text-sm">
        <div className="flex items-center gap-2 px-2 py-2">
          <div
            className="w-6 h-6 rounded-md flex items-center justify-center"
            style={{ background: THEME.primary }}
          >
            <Sparkles size={13} className="text-white" />
          </div>
          <span className="font-display font-semibold text-[13px]">Knöllchen-Pilot</span>
        </div>
        <div className="mt-3 space-y-0.5">
          {[
            { Icon: LayoutDashboard, label: "Dashboard", active: true },
            { Icon: FileText, label: "Strafzettel", active: false, badge: "12" },
            { Icon: Car, label: "Fahrzeuge", active: false },
            { Icon: Settings, label: "Einstellungen", active: false },
          ].map((it) => (
            <div
              key={it.label}
              className={`flex items-center gap-2 px-2 py-1.5 rounded-md ${
                it.active ? "bg-white ring-1 ring-stone-200 font-medium" : "text-stone-600"
              }`}
            >
              <it.Icon size={14} />
              <span className="text-[13px]">{it.label}</span>
              {it.badge && (
                <span className="ml-auto text-[10px] font-mono px-1.5 rounded bg-stone-200 text-stone-700">
                  {it.badge}
                </span>
              )}
            </div>
          ))}
        </div>
      </div>
      <div className="p-5">
        <div className="flex items-center justify-between">
          <div>
            <div className="font-display font-bold text-xl">Dashboard</div>
            <div className="text-xs text-stone-500">Heute, 14.04.2026</div>
          </div>
          <button className="text-xs px-3 py-1.5 rounded-md text-white inline-flex items-center gap-1.5" style={{ background: THEME.primary }}>
            <Upload size={12} /> Strafzettel hochladen
          </button>
        </div>
        <div className="mt-4 grid grid-cols-4 gap-3">
          {stats.map((s) => (
            <div key={s.label} className="rounded-lg ring-1 ring-stone-200 p-3 bg-white">
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-stone-500">{s.label}</span>
                <s.Icon size={13} style={{ color: s.color }} />
              </div>
              <div className="mt-1 font-display font-bold text-xl">{s.value}</div>
            </div>
          ))}
        </div>
        <div className="mt-4 rounded-lg ring-1 ring-stone-200 bg-white overflow-hidden">
          <div className="px-4 py-2.5 text-xs text-stone-500 border-b border-stone-100 flex items-center justify-between">
            <span className="font-medium text-stone-700">Strafzettel</span>
            <span>Filter: Alle · Heute</span>
          </div>
          <div>
            {rows.map((r) => {
              const m = STATUS_META[r.status];
              return (
                <div
                  key={r.plate + r.off}
                  className="grid grid-cols-[100px_1fr_auto_auto_auto] items-center gap-3 px-4 py-2.5 border-b border-stone-50 last:border-0 text-[13px]"
                >
                  <span className={`inline-flex items-center gap-1.5 text-[11px] font-medium px-1.5 py-0.5 rounded ${m.bg} ${m.text}`}>
                    <span className="w-1.5 h-1.5 rounded-full" style={{ background: m.dot }} /> {m.label}
                  </span>
                  <span className="font-mono font-semibold">{r.plate}</span>
                  <span className="text-stone-600 truncate">{r.off}</span>
                  <span className="font-mono tabular-nums w-20 text-right">{r.amt}</span>
                  <span className="text-xs text-stone-400 w-20 text-right">{r.when}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  </div>
);

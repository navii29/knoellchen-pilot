"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AlertTriangle, Calendar as CalendarIcon, ChevronLeft, ChevronRight } from "lucide-react";
import {
  addDays,
  colorForContract,
  layoutWeek,
  parseIso,
  toIso,
  weekDays,
  type LaidContract,
} from "@/lib/calendar";
import type { Contract, Vehicle } from "@/lib/types";

const WEEKDAY = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];

const fmtDayHeader = (d: Date) =>
  `${d.getDate().toString().padStart(2, "0")}.${(d.getMonth() + 1).toString().padStart(2, "0")}`;

const fmtRange = (start: Date, end: Date) => {
  const sameMonth = start.getMonth() === end.getMonth();
  const sameYear = start.getFullYear() === end.getFullYear();
  const startStr = `${start.getDate()}.${sameMonth && sameYear ? "" : (start.getMonth() + 1) + "."}`;
  const endStr = `${end.getDate()}.${(end.getMonth() + 1).toString().padStart(2, "0")}.${end.getFullYear()}`;
  return `${startStr} – ${endStr}`;
};

const TRACK_HEIGHT = 28; // px pro Track innerhalb einer Vehicle-Zeile
const TRACK_GAP = 4;
const ROW_PADDING = 8;

export const CalendarClient = ({
  vehicles,
  contracts,
  weekStartIso,
  todayIso,
}: {
  vehicles: Vehicle[];
  contracts: Contract[];
  weekStartIso: string;
  todayIso: string;
}) => {
  const router = useRouter();
  const weekStart = useMemo(() => parseIso(weekStartIso), [weekStartIso]);
  const days = useMemo(() => weekDays(weekStart), [weekStart]);

  const prevWeek = toIso(addDays(weekStart, -7));
  const nextWeek = toIso(addDays(weekStart, 7));
  const today = toIso(new Date());

  // Index Verträge pro Vehicle
  const byVehicle = useMemo(() => {
    const map = new Map<string, Contract[]>();
    for (const c of contracts) {
      const list = map.get(c.plate) ?? [];
      list.push(c);
      map.set(c.plate, list);
    }
    return map;
  }, [contracts]);

  // Today-Spalte (1-7) oder null wenn ausserhalb der Woche
  const todayCol = useMemo(() => {
    const t = parseIso(todayIso);
    const startMs = weekStart.getTime();
    const endMs = addDays(weekStart, 7).getTime();
    if (t.getTime() < startMs || t.getTime() >= endMs) return null;
    return Math.round((t.getTime() - startMs) / 86_400_000) + 1;
  }, [todayIso, weekStart]);

  return (
    <>
      <div className="flex items-end justify-between gap-3 flex-wrap mb-4">
        <div>
          <div className="font-display font-bold text-2xl tracking-tight">Kalender</div>
          <p className="text-sm text-stone-500 mt-1">
            Flottenbelegung pro Woche · {fmtRange(weekStart, addDays(weekStart, 6))}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href={`/dashboard/calendar?week=${prevWeek}`}
            className="inline-flex items-center gap-1 text-sm px-3 py-1.5 rounded-md bg-white ring-1 ring-stone-200 hover:bg-stone-50"
          >
            <ChevronLeft size={14} /> Vorherige
          </Link>
          <Link
            href={`/dashboard/calendar?week=${today}`}
            className="inline-flex items-center gap-1 text-sm px-3 py-1.5 rounded-md bg-white ring-1 ring-stone-200 hover:bg-stone-50"
          >
            <CalendarIcon size={14} /> Heute
          </Link>
          <Link
            href={`/dashboard/calendar?week=${nextWeek}`}
            className="inline-flex items-center gap-1 text-sm px-3 py-1.5 rounded-md bg-white ring-1 ring-stone-200 hover:bg-stone-50"
          >
            Nächste <ChevronRight size={14} />
          </Link>
        </div>
      </div>

      <div className="rounded-xl bg-white shadow-[0_1px_3px_rgba(0,0,0,0.04)] overflow-hidden">
        {/* Header-Reihe */}
        <div
          className="grid border-b border-stone-200 bg-stone-50/50 sticky top-0 z-10"
          style={{ gridTemplateColumns: `220px repeat(7, minmax(80px, 1fr))` }}
        >
          <div className="px-4 py-3 text-[11px] uppercase tracking-wider text-stone-500 font-semibold">
            Fahrzeug
          </div>
          {days.map((d, i) => {
            const iso = toIso(d);
            const isToday = iso === today;
            const isWeekend = i >= 5;
            return (
              <div
                key={iso}
                className={`px-2 py-3 text-center border-l border-stone-100 ${
                  isWeekend ? "bg-stone-50" : ""
                }`}
              >
                <div
                  className={`text-[11px] font-medium ${
                    isToday ? "text-teal-700" : "text-stone-500"
                  }`}
                >
                  {WEEKDAY[i]}
                </div>
                <div
                  className={`font-mono text-sm tabular-nums mt-0.5 ${
                    isToday ? "text-teal-700 font-semibold" : "text-stone-900"
                  }`}
                >
                  {fmtDayHeader(d)}
                </div>
              </div>
            );
          })}
        </div>

        {/* Vehicle-Zeilen */}
        {vehicles.length === 0 ? (
          <div className="px-5 py-12 text-center text-sm text-stone-500">
            Noch keine Fahrzeuge — leg zuerst welche unter &bdquo;Fahrzeuge&ldquo; an.
          </div>
        ) : (
          vehicles.map((v) => (
            <VehicleRow
              key={v.id}
              vehicle={v}
              contracts={byVehicle.get(v.plate) ?? []}
              weekStart={weekStart}
              todayIso={todayIso}
              todayCol={todayCol}
              onOpen={(id) => router.push(`/dashboard/contracts/${id}`)}
            />
          ))
        )}
      </div>

      <div className="mt-4 text-xs text-stone-500 flex items-center gap-4 flex-wrap">
        <span className="inline-flex items-center gap-1.5">
          <span className="w-3 h-3 rounded bg-teal-100 ring-1 ring-teal-300" /> Aktiver Vertrag
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="w-3 h-3 rounded overdue-blink" /> Überfällige Rückgabe
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="w-px h-3 bg-teal-500" /> Heute
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="w-3 h-3 rounded bg-stone-50" /> Wochenende
        </span>
      </div>
    </>
  );
};

const VehicleRow = ({
  vehicle,
  contracts,
  weekStart,
  todayIso,
  todayCol,
  onOpen,
}: {
  vehicle: Vehicle;
  contracts: Contract[];
  weekStart: Date;
  todayIso: string;
  todayCol: number | null;
  onOpen: (id: string) => void;
}) => {
  const { laid, trackCount } = useMemo(
    () => layoutWeek(contracts, weekStart, todayIso),
    [contracts, weekStart, todayIso]
  );

  const rowHeight = trackCount * TRACK_HEIGHT + (trackCount - 1) * TRACK_GAP + ROW_PADDING * 2;

  return (
    <div
      className="grid border-b border-stone-100 last:border-0 hover:bg-stone-50/40 transition-colors"
      style={{ gridTemplateColumns: `220px repeat(7, minmax(80px, 1fr))`, minHeight: rowHeight }}
    >
      <div className="px-4 py-3 flex items-center gap-2 border-r border-stone-100">
        <div className="min-w-0">
          <div className="font-mono font-semibold text-sm">{vehicle.plate}</div>
          <div className="text-xs text-stone-500 truncate">{vehicle.vehicle_type || "—"}</div>
        </div>
      </div>

      {/* 7 Day-Cells als Background */}
      <div
        className="relative col-span-7 grid"
        style={{ gridTemplateColumns: `repeat(7, minmax(80px, 1fr))` }}
      >
        {Array.from({ length: 7 }, (_, i) => {
          const isWeekend = i >= 5;
          const isToday = todayCol === i + 1;
          return (
            <div
              key={i}
              className={`border-l border-stone-100 first:border-l-0 ${
                isWeekend ? "bg-stone-50" : ""
              } ${isToday ? "bg-teal-50/40" : ""}`}
              style={{ height: rowHeight }}
            />
          );
        })}

        {/* Today vertical line — über den Cells */}
        {todayCol != null && (
          <div
            className="absolute top-0 bottom-0 w-px bg-teal-500 z-10 pointer-events-none"
            style={{ left: `calc((${todayCol - 1} / 7) * 100% + (1 / 7) * 50%)` }}
          />
        )}

        {/* Contract bars — absolut positioniert */}
        {laid.map((l) => (
          <ContractBar key={l.contract.id} laid={l} onOpen={onOpen} />
        ))}
      </div>
    </div>
  );
};

const ContractBar = ({
  laid,
  onOpen,
}: {
  laid: LaidContract;
  onOpen: (id: string) => void;
}) => {
  const c = laid.contract;
  const color = colorForContract(c.id);
  const top = ROW_PADDING + laid.track * (TRACK_HEIGHT + TRACK_GAP);
  const leftPct = ((laid.startCol - 1) / 7) * 100;
  const widthPct = (laid.span / 7) * 100;

  // Innerhalb der Zelle Padding (links/rechts) damit Bars nicht 100% touchen
  const inset = 4; // px

  const baseStyle: React.CSSProperties = {
    position: "absolute",
    top,
    left: `calc(${leftPct}% + ${inset}px)`,
    width: `calc(${widthPct}% - ${inset * 2}px)`,
    height: TRACK_HEIGHT,
    background: laid.isOverdue ? undefined : color.bg,
    color: laid.isOverdue ? "#7f1d1d" : color.text,
    boxShadow: laid.isOverdue ? undefined : `inset 0 0 0 1px ${color.ring}`,
    borderTopLeftRadius: laid.clippedLeft ? 2 : 6,
    borderBottomLeftRadius: laid.clippedLeft ? 2 : 6,
    borderTopRightRadius: laid.clippedRight ? 2 : 6,
    borderBottomRightRadius: laid.clippedRight ? 2 : 6,
  };

  return (
    <button
      onClick={() => onOpen(c.id)}
      title={`${c.contract_nr} · ${c.renter_name}`}
      className={`px-2.5 text-xs font-medium flex items-center gap-1.5 hover:brightness-95 transition z-20 truncate ${
        laid.isOverdue ? "overdue-blink" : ""
      }`}
      style={baseStyle}
    >
      {laid.isOverdue && <AlertTriangle size={11} className="shrink-0" />}
      <span className="truncate">{c.renter_name}</span>
      {laid.clippedRight && <ChevronRight size={11} className="shrink-0 opacity-60" />}
    </button>
  );
};

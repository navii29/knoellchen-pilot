"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AlertTriangle, ChevronLeft, ChevronRight } from "lucide-react";
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
import { Plate } from "@/components/ui/Plate";

const WEEKDAY = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];
const MONTHS = [
  "Januar",
  "Februar",
  "März",
  "April",
  "Mai",
  "Juni",
  "Juli",
  "August",
  "September",
  "Oktober",
  "November",
  "Dezember",
];

const TRACK_HEIGHT = 32;
const TRACK_GAP = 4;
const ROW_PADDING = 10;
const ROW_MIN_HEIGHT = TRACK_HEIGHT + ROW_PADDING * 2;

const monthYearLabel = (start: Date, end: Date) => {
  if (start.getMonth() === end.getMonth() && start.getFullYear() === end.getFullYear()) {
    return `${MONTHS[start.getMonth()]} ${start.getFullYear()}`;
  }
  if (start.getFullYear() === end.getFullYear()) {
    return `${MONTHS[start.getMonth()].slice(0, 3)} – ${MONTHS[end.getMonth()].slice(0, 3)} ${start.getFullYear()}`;
  }
  return `${MONTHS[start.getMonth()].slice(0, 3)} ${start.getFullYear()} – ${MONTHS[end.getMonth()].slice(0, 3)} ${end.getFullYear()}`;
};

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
  const weekEnd = addDays(weekStart, 6);

  const prevWeek = toIso(addDays(weekStart, -7));
  const nextWeek = toIso(addDays(weekStart, 7));
  const today = toIso(new Date());

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
      <div className="flex items-end justify-between gap-4 flex-wrap mb-4 md:mb-6">
        <div>
          <div className="kicker text-ink-muted mb-2">KW {getIsoWeek(weekStart)} · Flottenbelegung</div>
          <div className="font-display font-extrabold text-ink text-[26px] md:text-[30px] leading-[1.05] tracking-tightest">
            {monthYearLabel(weekStart, weekEnd)}
          </div>
        </div>

        <div className="inline-flex items-center rounded-btn bg-paper border border-hairline shadow-panel overflow-hidden">
          <Link
            href={`/dashboard/calendar?week=${prevWeek}`}
            className="px-2.5 py-1.5 text-ink-soft hover:bg-canvas hover:text-ink transition-colors border-r border-hairline"
            aria-label="Vorherige Woche"
          >
            <ChevronLeft size={16} />
          </Link>
          <Link
            href={`/dashboard/calendar?week=${today}`}
            className="px-3.5 py-1.5 text-[13px] font-medium text-ink-soft hover:bg-canvas hover:text-ink transition-colors border-r border-hairline"
          >
            Heute
          </Link>
          <Link
            href={`/dashboard/calendar?week=${nextWeek}`}
            className="px-2.5 py-1.5 text-ink-soft hover:bg-canvas hover:text-ink transition-colors"
            aria-label="Nächste Woche"
          >
            <ChevronRight size={16} />
          </Link>
        </div>
      </div>

      <div className="panel overflow-hidden">
       <div className="overflow-x-auto">
        <div
          className="min-w-[760px] grid border-b border-hairline bg-canvas/60"
          style={{ gridTemplateColumns: `200px repeat(7, minmax(80px, 1fr))` }}
        >
          <div className="th px-4 py-3 border-r border-hairline">
            Fahrzeug
          </div>
          {days.map((d, i) => {
            const iso = toIso(d);
            const isToday = iso === today;
            const isWeekend = i >= 5;
            return (
              <div
                key={iso}
                className="px-2 py-3 flex flex-col items-center justify-center gap-1 border-l border-hairline first:border-l-0"
              >
                <div
                  className={`text-[10px] font-mono font-medium uppercase tracking-wider ${
                    isToday ? "text-signal" : isWeekend ? "text-ink-muted/50" : "text-ink-muted"
                  }`}
                >
                  {WEEKDAY[i]}
                </div>
                {isToday ? (
                  <div className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-signal text-white text-[13px] font-semibold tabular-nums font-mono">
                    {d.getDate()}
                  </div>
                ) : (
                  <div
                    className={`text-sm font-mono tnum ${
                      isWeekend ? "text-ink-muted/40" : "text-ink"
                    }`}
                  >
                    {d.getDate()}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {vehicles.length === 0 ? (
          <div className="px-5 py-16 text-center text-sm text-ink-muted min-w-[760px]">
            Noch keine Fahrzeuge — leg zuerst welche unter &bdquo;Fahrzeuge&ldquo; an.
          </div>
        ) : (
          <div className="relative min-w-[760px]">
            {vehicles.map((v, idx) => (
              <VehicleRow
                key={v.id}
                vehicle={v}
                contracts={byVehicle.get(v.plate) ?? []}
                weekStart={weekStart}
                todayIso={todayIso}
                todayCol={todayCol}
                zebra={idx % 2 === 1}
                onOpen={(id) => router.push(`/dashboard/contracts/${id}`)}
              />
            ))}

            {/* Heute-Linie durchgängig über alle Zeilen */}
            {todayCol != null && (
              <div
                className="absolute top-0 bottom-0 z-20 pointer-events-none"
                style={{
                  left: `calc(200px + ((${todayCol - 1} + 0.5) / 7) * (100% - 200px))`,
                  transform: "translateX(-1px)",
                }}
              >
                <div className="w-0.5 h-full bg-signal" />
                <div
                  className="absolute -top-1 -left-[5px] w-0 h-0"
                  style={{
                    borderLeft: "6px solid transparent",
                    borderRight: "6px solid transparent",
                    borderTop: "6px solid #FF5A1F",
                  }}
                />
              </div>
            )}
          </div>
        )}
       </div>
       <div className="md:hidden text-[11px] text-ink-muted px-3 py-2 border-t border-hairline bg-canvas/60">
         ← horizontal scrollen, um alle Tage zu sehen →
       </div>
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
  zebra,
  onOpen,
}: {
  vehicle: Vehicle;
  contracts: Contract[];
  weekStart: Date;
  todayIso: string;
  todayCol: number | null;
  zebra: boolean;
  onOpen: (id: string) => void;
}) => {
  const { laid, trackCount } = useMemo(
    () => layoutWeek(contracts, weekStart, todayIso),
    [contracts, weekStart, todayIso]
  );

  const rowHeight = Math.max(
    ROW_MIN_HEIGHT,
    trackCount * TRACK_HEIGHT + (trackCount - 1) * TRACK_GAP + ROW_PADDING * 2
  );

  return (
    <div
      className={`group grid border-b border-hairline last:border-0 transition-colors ${
        zebra ? "bg-canvas/40" : "bg-paper"
      } hover:bg-canvas/60`}
      style={{ gridTemplateColumns: `200px repeat(7, 1fr)`, minHeight: rowHeight }}
    >
      <div className="px-4 py-3 flex items-center gap-2 border-r border-hairline">
        <div className="min-w-0 w-full">
          <Plate value={vehicle.plate} size="sm" />
          <div className="text-[11px] text-ink-muted truncate mt-1.5">
            {vehicle.vehicle_type || "—"}
          </div>
        </div>
      </div>

      {/* 7 Day-Cells als Hintergrund mit Hover */}
      <div
        className="relative col-span-7 grid"
        style={{ gridTemplateColumns: `repeat(7, 1fr)` }}
      >
        {Array.from({ length: 7 }, (_, i) => {
          const isToday = todayCol === i + 1;
          return (
            <div
              key={i}
              className={`border-l border-hairline first:border-l-0 transition-colors hover:bg-canvas/80 ${
                isToday ? "bg-signal/5" : ""
              }`}
              style={{ height: rowHeight }}
            />
          );
        })}

        {/* Contract bars */}
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

  const inset = 3;

  const baseStyle: React.CSSProperties = {
    position: "absolute",
    top,
    left: `calc(${leftPct}% + ${inset}px)`,
    width: `calc(${widthPct}% - ${inset * 2}px)`,
    height: TRACK_HEIGHT,
    background: laid.isOverdue ? "#dc2626" : color.bg,
    color: "#ffffff",
    boxShadow: laid.isOverdue
      ? "0 1px 2px rgba(220,38,38,0.25)"
      : `0 1px 2px rgba(0,0,0,0.06)`,
  };

  return (
    <button
      onClick={() => onOpen(c.id)}
      title={`${c.contract_nr} · ${c.renter_name}`}
      onMouseEnter={(e) => {
        if (!laid.isOverdue) e.currentTarget.style.background = color.bgHover;
      }}
      onMouseLeave={(e) => {
        if (!laid.isOverdue) e.currentTarget.style.background = color.bg;
      }}
      className={`px-3 text-[12px] font-medium flex items-center gap-1.5 rounded-md transition-all z-10 truncate text-left ${
        laid.isOverdue ? "overdue-pulse" : ""
      }`}
      style={baseStyle}
    >
      {laid.isOverdue && <AlertTriangle size={12} className="shrink-0 text-white" />}
      <span className="truncate flex-1">{c.renter_name}</span>
      {laid.clippedRight && (
        <ChevronRight size={12} className="shrink-0 opacity-80" />
      )}
    </button>
  );
};

// ISO-Woche: 1-53 nach ISO-8601 (Mo=Start, Woche 1 enthält 4. Januar)
const getIsoWeek = (d: Date): number => {
  const target = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const dayNr = (target.getDay() + 6) % 7;
  target.setDate(target.getDate() - dayNr + 3);
  const firstThursday = new Date(target.getFullYear(), 0, 4);
  const diff = (target.getTime() - firstThursday.getTime()) / 86_400_000;
  return 1 + Math.round(diff / 7);
};

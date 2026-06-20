"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowDownLeft,
  ArrowUpRight,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Plus,
  Search,
} from "lucide-react";
import { Plate } from "@/components/ui/Plate";
import type { Contract, Vehicle } from "@/lib/types";
import {
  addDays,
  CAL_STATUS_META,
  calStatus,
  type CalStatus,
  type CalView,
  type LaidContract,
  layoutRange,
  overbookedContractIds,
  parseIso,
  rangeDays,
  stepAnchor,
  toIso,
} from "@/lib/calendar";

const MONTHS = [
  "Januar", "Februar", "März", "April", "Mai", "Juni",
  "Juli", "August", "September", "Oktober", "November", "Dezember",
];
const WEEKDAY = ["So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"];

const VEHICLE_COL = 200;
const DAY_W: Record<CalView, number> = { week: 96, "2week": 62, month: 42 };
const TRACK_H = 22;
const TRACK_GAP = 3;
const ROW_PAD = 6;
const ROW_MIN = 52;

const VIEW_LABEL: Record<CalView, string> = {
  week: "Woche",
  "2week": "2 Wochen",
  month: "Monat",
};

const STATUS_ORDER: CalStatus[] = ["geplant", "aktiv", "ueberfaellig", "abgeschlossen"];

const VEHICLE_FILTERS: { value: string; label: string }[] = [
  { value: "alle", label: "Alle Fahrzeuge" },
  { value: "aktiv", label: "Aktiv" },
  { value: "werkstatt", label: "Werkstatt" },
  { value: "inaktiv", label: "Inaktiv" },
  { value: "ausgesteuert", label: "Archiv" },
];

export const CalendarClient = ({
  vehicles,
  contracts,
  view,
  rangeStartIso,
  dayCount,
  anchorIso,
  todayIso,
}: {
  vehicles: Vehicle[];
  contracts: Contract[];
  view: CalView;
  rangeStartIso: string;
  dayCount: number;
  anchorIso: string;
  todayIso: string;
}) => {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [onlyBooked, setOnlyBooked] = useState(false);
  const [vehFilter, setVehFilter] = useState("alle");

  const rangeStart = useMemo(() => parseIso(rangeStartIso), [rangeStartIso]);
  const anchor = useMemo(() => parseIso(anchorIso), [anchorIso]);
  const days = useMemo(() => rangeDays(rangeStart, dayCount), [rangeStart, dayCount]);
  const dayW = DAY_W[view];
  const totalWidth = VEHICLE_COL + dayCount * dayW;

  const byVehicle = useMemo(() => {
    const map = new Map<string, Contract[]>();
    for (const c of contracts) {
      const arr = map.get(c.plate) ?? [];
      arr.push(c);
      map.set(c.plate, arr);
    }
    return map;
  }, [contracts]);

  // Heute: Abholungen (pickup == heute) + Rückgaben (Ende == heute)
  const todayMoves = useMemo(() => {
    const pickups: Contract[] = [];
    const returns: Contract[] = [];
    for (const c of contracts) {
      if (c.pickup_date === todayIso) pickups.push(c);
      const end = c.actual_return_date ?? c.return_date;
      if (end === todayIso) returns.push(c);
    }
    return { pickups, returns };
  }, [contracts, todayIso]);

  // Fahrzeuge filtern (Suche, Status, nur belegte)
  const shownVehicles = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return vehicles.filter((v) => {
      if (vehFilter !== "alle" && v.status !== vehFilter) return false;
      const list = byVehicle.get(v.plate) ?? [];
      if (onlyBooked && list.length === 0) return false;
      if (!needle) return true;
      const hay = [v.plate, v.vehicle_type, v.manufacturer, v.model]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      if (hay.includes(needle)) return true;
      return list.some((c) => c.renter_name.toLowerCase().includes(needle));
    });
  }, [vehicles, byVehicle, q, onlyBooked, vehFilter]);

  const periodLabel = useMemo(() => {
    if (view === "month") return `${MONTHS[anchor.getMonth()]} ${anchor.getFullYear()}`;
    const end = addDays(rangeStart, dayCount - 1);
    const sameMonth = rangeStart.getMonth() === end.getMonth();
    const a = `${rangeStart.getDate()}.`;
    const b = `${end.getDate()}. ${MONTHS[end.getMonth()].slice(0, 3)} ${end.getFullYear()}`;
    return sameMonth ? `${a}–${b}` : `${a} ${MONTHS[rangeStart.getMonth()].slice(0, 3)} – ${b}`;
  }, [view, anchor, rangeStart, dayCount]);

  const navHref = (v: CalView, date: string) => `/dashboard/calendar?view=${v}&date=${date}`;
  const prev = navHref(view, toIso(stepAnchor(view, anchor, -1)));
  const next = navHref(view, toIso(stepAnchor(view, anchor, 1)));
  const todayHref = navHref(view, todayIso);

  return (
    <>
      {/* ── Kopf: Titel + Navigation ── */}
      <div className="flex items-center justify-between gap-3 flex-wrap mb-4">
        <div>
          <div className="kicker text-ink-muted mb-1.5">Flottenbelegung</div>
          <h1 className="font-display font-extrabold text-ink text-[24px] leading-none tracking-tightest">
            {periodLabel}
          </h1>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Ansicht-Umschalter */}
          <div className="inline-flex rounded-btn border border-hairline overflow-hidden">
            {(["week", "2week", "month"] as CalView[]).map((v) => (
              <Link
                key={v}
                href={navHref(v, anchorIso)}
                className={`px-3 h-9 inline-flex items-center text-[13px] border-l border-hairline first:border-l-0 ${
                  view === v ? "bg-ink text-white" : "text-ink-soft hover:bg-canvas"
                }`}
              >
                {VIEW_LABEL[v]}
              </Link>
            ))}
          </div>
          {/* Navigation */}
          <div className="inline-flex items-center gap-1">
            <Link href={prev} aria-label="Zurück" className="w-9 h-9 inline-flex items-center justify-center rounded-btn border border-hairline text-ink-soft hover:bg-canvas">
              <ChevronLeft size={16} />
            </Link>
            <Link href={todayHref} className="px-3 h-9 inline-flex items-center rounded-btn border border-hairline text-[13px] text-ink-soft hover:bg-canvas">
              Heute
            </Link>
            <Link href={next} aria-label="Weiter" className="w-9 h-9 inline-flex items-center justify-center rounded-btn border border-hairline text-ink-soft hover:bg-canvas">
              <ChevronRight size={16} />
            </Link>
          </div>
        </div>
      </div>

      {/* ── Filterzeile ── */}
      <div className="flex items-center gap-2 flex-wrap mb-3">
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Kennzeichen, Modell, Mieter…"
            className="h-9 w-64 pl-9 pr-3 rounded-btn border border-hairline bg-paper text-[13px] outline-none focus:border-ink/30"
          />
        </div>
        <select
          value={vehFilter}
          onChange={(e) => setVehFilter(e.target.value)}
          className="h-9 px-3 rounded-btn border border-hairline bg-paper text-[13px] text-ink-soft outline-none"
        >
          {VEHICLE_FILTERS.map((f) => (
            <option key={f.value} value={f.value}>{f.label}</option>
          ))}
        </select>
        <label className="inline-flex items-center gap-2 h-9 px-3 rounded-btn border border-hairline bg-paper text-[13px] text-ink-soft cursor-pointer select-none">
          <input type="checkbox" checked={onlyBooked} onChange={(e) => setOnlyBooked(e.target.checked)} className="w-4 h-4 accent-signal" />
          Nur belegte
        </label>

        {/* Legende */}
        <div className="ml-auto flex items-center gap-3 flex-wrap text-[11.5px] text-ink-muted">
          {STATUS_ORDER.map((s) => (
            <span key={s} className="inline-flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm" style={{ background: CAL_STATUS_META[s].bg }} />
              {CAL_STATUS_META[s].label}
            </span>
          ))}
        </div>
      </div>

      {/* ── Heute-Panel ── */}
      <div className="flex items-center gap-4 flex-wrap mb-3 rounded-card border border-hairline bg-paper px-4 py-2.5">
        <div className="flex items-center gap-1.5 text-[12px] font-medium text-ink">
          <CalendarDays size={14} className="text-signal" /> Heute
        </div>
        <MovesChips Icon={ArrowUpRight} label="Abholungen" items={todayMoves.pickups} color="#0d9488" router={router} />
        <MovesChips Icon={ArrowDownLeft} label="Rückgaben" items={todayMoves.returns} color="#2563eb" router={router} />
      </div>

      {/* ── Gantt-Gitter (sticky Kopf + Fahrzeug-Spalte) ── */}
      <div className="panel overflow-hidden">
        <div className="overflow-auto scroll-thin" style={{ maxHeight: "calc(100vh - 320px)" }}>
          <div style={{ width: totalWidth }}>
            {/* Kopfzeile */}
            <div
              className="grid sticky top-0 z-20 bg-canvas/95 backdrop-blur border-b border-hairline"
              style={{ gridTemplateColumns: `${VEHICLE_COL}px repeat(${dayCount}, ${dayW}px)` }}
            >
              <div className="th px-4 py-2.5 border-r border-hairline sticky left-0 z-30 bg-canvas/95">
                Fahrzeug
              </div>
              {days.map((d) => {
                const iso = toIso(d);
                const isToday = iso === todayIso;
                const weekend = d.getDay() === 0 || d.getDay() === 6;
                const firstOfMonth = d.getDate() === 1;
                return (
                  <div
                    key={iso}
                    className={`px-1 py-2 flex flex-col items-center justify-center gap-0.5 border-l border-hairline first:border-l-0 ${
                      weekend ? "bg-ink/[0.02]" : ""
                    } ${firstOfMonth ? "border-l-ink/20" : ""}`}
                  >
                    <div className={`text-[9px] font-mono uppercase tracking-wide ${isToday ? "text-signal" : weekend ? "text-ink-muted/50" : "text-ink-muted"}`}>
                      {WEEKDAY[d.getDay()]}
                    </div>
                    {isToday ? (
                      <div className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-signal text-white text-[12px] font-semibold tnum font-mono">
                        {d.getDate()}
                      </div>
                    ) : (
                      <div className={`text-[13px] font-mono tnum ${weekend ? "text-ink-muted/50" : "text-ink"}`}>
                        {d.getDate()}
                      </div>
                    )}
                    {firstOfMonth && (
                      <div className="text-[8px] font-mono uppercase text-ink-muted/70">
                        {MONTHS[d.getMonth()].slice(0, 3)}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Zeilen */}
            {shownVehicles.length === 0 ? (
              <div className="px-5 py-16 text-center text-sm text-ink-muted">
                {vehicles.length === 0
                  ? "Noch keine Fahrzeuge — bitte zuerst welche unter Fahrzeuge anlegen."
                  : "Keine Fahrzeuge passend zum Filter."}
              </div>
            ) : (
              shownVehicles.map((v, idx) => (
                <VehicleRow
                  key={v.id}
                  vehicle={v}
                  contracts={byVehicle.get(v.plate) ?? []}
                  rangeStart={rangeStart}
                  dayCount={dayCount}
                  dayW={dayW}
                  todayIso={todayIso}
                  zebra={idx % 2 === 1}
                  onOpen={(id) => router.push(`/dashboard/contracts/${id}`)}
                />
              ))
            )}
          </div>
        </div>
      </div>

      <p className="text-[11.5px] text-ink-muted mt-2">
        Tipp: Klick auf eine freie Fläche legt einen Vertrag mit Fahrzeug + Datum vorausgefüllt an.
      </p>
    </>
  );
};

const MovesChips = ({
  Icon,
  label,
  items,
  color,
  router,
}: {
  Icon: typeof ArrowUpRight;
  label: string;
  items: Contract[];
  color: string;
  router: ReturnType<typeof useRouter>;
}) => (
  <div className="flex items-center gap-2 min-w-0">
    <span className="inline-flex items-center gap-1 text-[12px] text-ink-soft shrink-0">
      <Icon size={13} style={{ color }} />
      <span className="tnum font-medium">{items.length}</span> {label}
    </span>
    <div className="flex items-center gap-1.5 flex-wrap">
      {items.slice(0, 4).map((c) => (
        <button
          key={c.id}
          onClick={() => router.push(`/dashboard/contracts/${c.id}`)}
          className="inline-flex items-center gap-1 px-1.5 h-5 rounded-full border border-hairline bg-canvas text-[11px] text-ink-soft hover:bg-paper"
          title={`${c.contract_nr} · ${c.renter_name}`}
        >
          <span className="font-mono">{c.plate}</span>
          <span className="truncate max-w-[90px]">{c.renter_name}</span>
        </button>
      ))}
      {items.length > 4 && (
        <span className="text-[11px] text-ink-muted">+{items.length - 4}</span>
      )}
    </div>
  </div>
);

const VehicleRow = ({
  vehicle,
  contracts,
  rangeStart,
  dayCount,
  dayW,
  todayIso,
  zebra,
  onOpen,
}: {
  vehicle: Vehicle;
  contracts: Contract[];
  rangeStart: Date;
  dayCount: number;
  dayW: number;
  todayIso: string;
  zebra: boolean;
  onOpen: (id: string) => void;
}) => {
  const { laid, trackCount } = useMemo(
    () => layoutRange(contracts, rangeStart, dayCount, todayIso),
    [contracts, rangeStart, dayCount, todayIso]
  );
  const overbooked = useMemo(() => overbookedContractIds(contracts), [contracts]);
  const rowHeight = Math.max(
    ROW_MIN,
    trackCount * TRACK_H + (trackCount - 1) * TRACK_GAP + ROW_PAD * 2
  );
  const rowBg = zebra ? "bg-canvas/40" : "bg-paper";

  return (
    <div
      className={`grid border-b border-hairline last:border-0 ${rowBg}`}
      style={{ gridTemplateColumns: `${VEHICLE_COL}px repeat(${dayCount}, ${dayW}px)`, minHeight: rowHeight }}
    >
      {/* Fahrzeug (sticky links) */}
      <div className={`px-4 py-2.5 flex flex-col justify-center gap-1 border-r border-hairline sticky left-0 z-10 ${rowBg}`}>
        <Plate value={vehicle.plate} size="sm" />
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="text-[11px] text-ink-muted truncate">{vehicle.vehicle_type || "—"}</span>
          {overbooked.size > 0 && (
            <span
              className="inline-flex items-center gap-0.5 text-[10px] text-red-600 shrink-0"
              title="Doppelbelegung — überschneidende Verträge"
            >
              <AlertTriangle size={11} /> Konflikt
            </span>
          )}
        </div>
      </div>

      {/* Tages-Fläche: leere Zellen = klickbar (neuer Vertrag) + Vertragsbalken */}
      <div className="relative col-span-full grid" style={{ gridColumn: `2 / span ${dayCount}`, gridTemplateColumns: `repeat(${dayCount}, 1fr)` }}>
        {Array.from({ length: dayCount }, (_, i) => {
          const d = addDays(rangeStart, i);
          const iso = toIso(d);
          const isToday = iso === todayIso;
          const weekend = d.getDay() === 0 || d.getDay() === 6;
          return (
            <Link
              key={i}
              href={`/dashboard/contracts/new?plate=${encodeURIComponent(vehicle.plate)}&pickup=${iso}`}
              title={`Neuer Vertrag · ${vehicle.plate} · ${iso}`}
              className={`group/cell relative border-l border-hairline first:border-l-0 transition-colors hover:bg-signal/[0.06] ${
                isToday ? "bg-signal/5" : weekend ? "bg-ink/[0.015]" : ""
              }`}
              style={{ height: rowHeight }}
            >
              <Plus
                size={13}
                className="absolute top-1.5 left-1/2 -translate-x-1/2 text-signal opacity-0 group-hover/cell:opacity-60 transition-opacity"
              />
            </Link>
          );
        })}

        {laid.map((l) => (
          <ContractBar
            key={l.contract.id}
            laid={l}
            dayCount={dayCount}
            conflict={overbooked.has(l.contract.id)}
            todayIso={todayIso}
            onOpen={onOpen}
          />
        ))}
      </div>
    </div>
  );
};

const ContractBar = ({
  laid,
  dayCount,
  conflict,
  todayIso,
  onOpen,
}: {
  laid: LaidContract;
  dayCount: number;
  conflict: boolean;
  todayIso: string;
  onOpen: (id: string) => void;
}) => {
  const c = laid.contract;
  const status: CalStatus = laid.isOverdue ? "ueberfaellig" : calStatus(c, todayIso);
  const meta = CAL_STATUS_META[status];
  const top = ROW_PAD + laid.track * (TRACK_H + TRACK_GAP);
  const leftPct = ((laid.startCol - 1) / dayCount) * 100;
  const widthPct = (laid.span / dayCount) * 100;
  const inset = 2;

  return (
    <button
      onClick={() => onOpen(c.id)}
      title={`${c.contract_nr} · ${c.renter_name} · ${meta.label}${conflict ? " · DOPPELBELEGUNG" : ""}`}
      onMouseEnter={(e) => (e.currentTarget.style.background = meta.bgHover)}
      onMouseLeave={(e) => (e.currentTarget.style.background = meta.bg)}
      className={`absolute px-2 text-[11.5px] font-medium flex items-center gap-1 rounded-md transition-colors z-[5] truncate text-left text-white ${
        status === "ueberfaellig" ? "overdue-pulse" : ""
      }`}
      style={{
        top,
        left: `calc(${leftPct}% + ${inset}px)`,
        width: `calc(${widthPct}% - ${inset * 2}px)`,
        height: TRACK_H,
        background: meta.bg,
        boxShadow: conflict ? "0 0 0 2px #dc2626, 0 1px 2px rgba(0,0,0,0.1)" : "0 1px 2px rgba(0,0,0,0.08)",
      }}
    >
      {!laid.clippedLeft && status !== "ueberfaellig" && (
        <ArrowUpRight size={11} className="shrink-0 opacity-80" />
      )}
      {status === "ueberfaellig" && <AlertTriangle size={11} className="shrink-0" />}
      <span className="truncate flex-1">{c.renter_name}</span>
      {laid.clippedRight && <ChevronRight size={11} className="shrink-0 opacity-80" />}
    </button>
  );
};

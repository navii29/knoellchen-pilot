"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AlertTriangle, Loader2 } from "lucide-react";
import { Plate } from "@/components/ui/Plate";
import { platesEqual } from "@/lib/plate";

/**
 * Kennzeichen-Combobox fuer die Vertragsanlage.
 * Sucht Fahrzeuge ueber /api/vehicles/availability (inkl. Verfuegbarkeit im
 * gewaehlten Zeitraum), erlaubt aber weiterhin freie Texteingabe.
 * Bei Ueberschneidung mit einem bestehenden Vertrag erscheint eine
 * nicht-blockierende Warnung (Vorausbuchungen bleiben erlaubt).
 */

type AvailabilityConflict = {
  contract_nr: string | null;
  renter_name: string | null;
  pickup_date: string;
  return_date: string;
};

type AvailabilityVehicle = {
  id: string;
  plate: string;
  name: string;
  vehicle_type: string | null;
  manufacturer: string | null;
  model: string | null;
  color: string | null;
  first_registration: string | null;
  fuel_type: string | null;
  fin_number: string | null;
  category: string | null;
  status: string | null;
  daily_rate: number | null;
  deposit: number | null;
  pickup_location: string | null;
  available: boolean;
  conflicts: AvailabilityConflict[];
};

// Daten, die bei Auswahl an die Vertrags-Maske übergeben werden.
export type PickedVehicle = {
  plate: string;
  vehicle_type: string;
  manufacturer: string | null;
  model: string | null;
  color: string | null;
  first_registration: string | null;
  fuel_type: string | null;
  fin_number: string | null;
  daily_rate: number | null;
  deposit: number | null;
};

const fmtDate = (iso: string) => {
  const [y, m, d] = iso.split("-");
  if (!y || !m || !d) return iso;
  return `${d}.${m}.${y}`;
};

const fmtDateShort = (iso: string) => {
  const [, m, d] = iso.split("-");
  if (!m || !d) return iso;
  return `${d}.${m}.`;
};

const buildUrl = (q: string, from: string, to: string) => {
  const params = new URLSearchParams();
  if (q) params.set("q", q);
  if (from && to) {
    params.set("from", from);
    params.set("to", to);
  }
  const qs = params.toString();
  return `/api/vehicles/availability${qs ? `?${qs}` : ""}`;
};

export const VehiclePicker = ({
  plate,
  vehicleType,
  pickupDate,
  returnDate,
  onSelect,
  onPlateChange,
  required = false,
}: {
  plate: string;
  vehicleType: string;
  pickupDate: string;
  returnDate: string;
  onSelect: (v: PickedVehicle) => void;
  onPlateChange: (plate: string) => void;
  required?: boolean;
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const fetchSeq = useRef(0);
  const lastQueried = useRef<string | null>(null);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<AvailabilityVehicle[]>([]);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [guardConflict, setGuardConflict] = useState<AvailabilityConflict | null>(null);

  const runFetch = useCallback(
    async (q: string) => {
      const seq = ++fetchSeq.current;
      setLoading(true);
      try {
        const res = await fetch(buildUrl(q, pickupDate, returnDate));
        const j = (await res.json().catch(() => ({}))) as { vehicles?: AvailabilityVehicle[] };
        if (seq !== fetchSeq.current) return;
        setResults(Array.isArray(j.vehicles) ? j.vehicles : []);
        setActiveIndex(-1);
      } catch {
        if (seq === fetchSeq.current) setResults([]);
      } finally {
        if (seq === fetchSeq.current) setLoading(false);
      }
    },
    [pickupDate, returnDate]
  );

  // Zeitraum geaendert -> Cache-Marke verwerfen, damit neu geladen wird.
  useEffect(() => {
    lastQueried.current = null;
  }, [pickupDate, returnDate]);

  // Debounced Suche, solange das Dropdown offen ist.
  useEffect(() => {
    if (!open) return;
    const q = plate.trim();
    if (lastQueried.current === q) return;
    const handle = setTimeout(() => {
      lastQueried.current = q;
      void runFetch(q);
    }, 300);
    return () => clearTimeout(handle);
  }, [plate, open, runFetch]);

  // Klick ausserhalb schliesst das Dropdown.
  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  // Ueberschneidungs-Wache: gewaehltes Kennzeichen gegen den Zeitraum pruefen.
  useEffect(() => {
    const q = plate.trim();
    if (!q || !pickupDate || !returnDate) {
      setGuardConflict(null);
      return;
    }
    let cancelled = false;
    const handle = setTimeout(async () => {
      try {
        const res = await fetch(buildUrl(q, pickupDate, returnDate));
        const j = (await res.json().catch(() => ({}))) as { vehicles?: AvailabilityVehicle[] };
        if (cancelled) return;
        const match = (j.vehicles ?? []).find((v) => platesEqual(v.plate, q));
        setGuardConflict(match && !match.available ? match.conflicts[0] ?? null : null);
      } catch {
        if (!cancelled) setGuardConflict(null);
      }
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(handle);
    };
  }, [plate, pickupDate, returnDate]);

  const openList = () => {
    setOpen(true);
    const q = plate.trim();
    if (lastQueried.current !== q) {
      lastQueried.current = q;
      void runFetch(q);
    }
  };

  const select = (v: AvailabilityVehicle) => {
    onSelect({
      plate: v.plate,
      vehicle_type: v.vehicle_type || vehicleType,
      manufacturer: v.manufacturer,
      model: v.model,
      color: v.color,
      first_registration: v.first_registration,
      fuel_type: v.fuel_type,
      fin_number: v.fin_number,
      daily_rate: v.daily_rate,
      deposit: v.deposit,
    });
    setOpen(false);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Escape") {
      setOpen(false);
      return;
    }
    if (!open && (e.key === "ArrowDown" || e.key === "ArrowUp")) {
      e.preventDefault();
      openList();
      return;
    }
    if (!open || results.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => (i + 1) % results.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => (i <= 0 ? results.length - 1 : i - 1));
    } else if (e.key === "Enter") {
      if (activeIndex >= 0 && activeIndex < results.length) {
        e.preventDefault();
        select(results[activeIndex]);
      }
    }
  };

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <input
          value={plate}
          required={required}
          onChange={(e) => {
            onPlateChange(e.target.value);
            setOpen(true);
          }}
          onFocus={openList}
          onClick={openList}
          onKeyDown={onKeyDown}
          placeholder="Kennzeichen suchen…"
          className="field font-mono uppercase pr-9"
          autoComplete="off"
          role="combobox"
          aria-expanded={open}
          aria-autocomplete="list"
          aria-label="Kennzeichen"
        />
        {loading && (
          <Loader2
            size={14}
            className="animate-spin text-ink-muted absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none"
          />
        )}
      </div>

      {open && (
        <div
          role="listbox"
          className="absolute z-30 left-0 right-0 mt-1 bg-paper border border-hairline rounded-card shadow-raised max-h-72 overflow-auto"
        >
          {results.length === 0 && !loading && (
            <div className="px-3 py-3 text-[12.5px] text-ink-muted">
              Keine Fahrzeuge gefunden — das Kennzeichen kann auch frei eingetragen werden.
            </div>
          )}
          {results.map((v, idx) => {
            const conflict = v.conflicts[0];
            return (
              <button
                key={v.id}
                type="button"
                role="option"
                aria-selected={idx === activeIndex}
                onMouseDown={(e) => {
                  e.preventDefault();
                  select(v);
                }}
                onMouseEnter={() => setActiveIndex(idx)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 text-left border-b border-hairline last:border-b-0 transition-colors ${
                  idx === activeIndex ? "bg-canvas" : ""
                }`}
              >
                <Plate value={v.plate} size="sm" className="shrink-0" />
                <span className="flex-1 min-w-0 flex items-center gap-2">
                  <span className="text-[13px] text-ink truncate">
                    {v.name || v.vehicle_type || "—"}
                  </span>
                  {v.category && (
                    <span className="shrink-0 text-[10.5px] uppercase tracking-wide text-ink-muted border border-hairline rounded-btn px-1.5 py-0.5">
                      {v.category}
                    </span>
                  )}
                </span>
                <span className="shrink-0 text-right">
                  {v.available ? (
                    <span className="inline-flex items-center gap-1.5 text-[12px] text-[#15803D]">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#15803D]" aria-hidden />
                      Frei
                    </span>
                  ) : (
                    <span className="text-[11.5px] text-[#B45309]">
                      Belegt
                      {conflict
                        ? ` ${fmtDateShort(conflict.pickup_date)}–${fmtDateShort(conflict.return_date)} · ${conflict.renter_name ?? "unbekannt"}`
                        : ""}
                    </span>
                  )}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {guardConflict && (
        <div className="mt-2 flex items-start gap-2 rounded-panel border border-[#F59E0B]/40 bg-[#FFFBEB] px-3 py-2.5 text-[12.5px] text-[#92400E]">
          <AlertTriangle size={14} className="shrink-0 mt-0.5" />
          <div className="leading-snug">
            Achtung: Überschneidung — {plate.trim()} ist {fmtDate(guardConflict.pickup_date)}–
            {fmtDate(guardConflict.return_date)} an {guardConflict.renter_name ?? "unbekannt"}
            {guardConflict.contract_nr ? ` (${guardConflict.contract_nr})` : ""} vermietet.
            Vorausbuchungen sind möglich — bitte prüfen Sie den Zeitraum.
          </div>
        </div>
      )}
    </div>
  );
};

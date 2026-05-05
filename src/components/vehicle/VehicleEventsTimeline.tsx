"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Plus,
  Wrench,
  Disc,
  ShieldCheck,
  AlertOctagon,
  FileText,
  Sparkles,
  Trash2,
  Paperclip,
  type LucideIcon,
} from "lucide-react";
import { fmtDate, fmtEur } from "@/lib/utils";
import {
  EVENT_TYPE_META,
  computeDue,
  type VehicleEvent,
  type VehicleEventType,
} from "@/lib/vehicle-events";
import { AddEventModal } from "./AddEventModal";

const TYPE_ICON: Record<VehicleEventType, LucideIcon> = {
  service: Wrench,
  tires: Disc,
  tuev: ShieldCheck,
  repair: AlertOctagon,
  insurance: FileText,
  other: Sparkles,
};

export const VehicleEventsTimeline = ({
  vehicleId,
  events,
}: {
  vehicleId: string;
  events: VehicleEvent[];
}) => {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const onDelete = async (id: string) => {
    if (!confirm("Diesen Eintrag wirklich löschen?")) return;
    setBusyId(id);
    try {
      const res = await fetch(`/api/vehicles/${vehicleId}/events/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        alert("Löschen fehlgeschlagen.");
        return;
      }
      router.refresh();
    } finally {
      setBusyId(null);
    }
  };

  return (
    <>
      <div className="rounded-xl bg-white ring-1 ring-stone-200 p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-stone-500 font-semibold">
            <Wrench size={13} />
            Historie
            <span className="ml-1 text-stone-400 font-normal normal-case tracking-normal">
              ({events.length})
            </span>
          </div>
          <button
            onClick={() => setOpen(true)}
            className="inline-flex items-center gap-1.5 h-8 px-3 rounded-full bg-stone-900 text-white text-[12.5px] font-medium hover:bg-stone-800"
          >
            <Plus size={13} />
            Eintrag hinzufügen
          </button>
        </div>

        {events.length === 0 ? (
          <div className="py-8 text-center text-sm text-stone-500">
            <div className="w-10 h-10 mx-auto rounded-full bg-stone-100 flex items-center justify-center mb-2">
              <Wrench size={16} className="text-stone-400" />
            </div>
            Noch keine Einträge. Service-, Reifen- und TÜV-Termine erscheinen hier.
          </div>
        ) : (
          <ol className="relative">
            <span className="absolute left-[15px] top-1 bottom-1 w-px bg-stone-200" />
            {events.map((ev) => {
              const meta = EVENT_TYPE_META[ev.type];
              const Icon = TYPE_ICON[ev.type];
              const due = ev.next_due_date ? computeDue(ev.next_due_date) : null;
              return (
                <li key={ev.id} className="relative pl-12 pb-5 last:pb-0">
                  <span
                    className="absolute left-0 top-0 w-8 h-8 rounded-full flex items-center justify-center"
                    style={{
                      background: meta.bg,
                      boxShadow: `inset 0 0 0 1px ${meta.ring}`,
                      color: meta.color,
                    }}
                  >
                    <Icon size={14} />
                  </span>

                  <div className="rounded-lg ring-1 ring-stone-100 px-4 py-3 group">
                    <div className="flex items-start justify-between gap-3 flex-wrap">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-baseline gap-2 flex-wrap">
                          <span
                            className="inline-flex items-center px-1.5 h-5 rounded text-[11px] font-medium"
                            style={{
                              background: meta.bg,
                              color: meta.text,
                              boxShadow: `inset 0 0 0 1px ${meta.ring}`,
                            }}
                          >
                            {meta.short}
                          </span>
                          <span className="text-[13px] text-stone-500 tabular-nums">
                            {fmtDate(ev.date)}
                          </span>
                          {ev.km_at_event != null && (
                            <span className="text-[12px] text-stone-400 tabular-nums">
                              · {ev.km_at_event.toLocaleString("de-DE")} km
                            </span>
                          )}
                        </div>
                        {ev.description && (
                          <div className="mt-1.5 text-[14px] text-stone-800 leading-snug">
                            {ev.description}
                          </div>
                        )}
                        <div className="mt-1 text-[12.5px] text-stone-500 flex items-center gap-3 flex-wrap">
                          {ev.provider && <span>{ev.provider}</span>}
                          {ev.cost != null && (
                            <span className="tabular-nums">{fmtEur(ev.cost)}</span>
                          )}
                          {ev.document_path && (
                            <a
                              href={`/api/vehicles/${ev.vehicle_id}/events/${ev.id}/document`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-stone-600 hover:text-stone-900"
                            >
                              <Paperclip size={12} />
                              Beleg
                            </a>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {due && (
                          <span
                            className="inline-flex items-center gap-1.5 px-2 h-6 rounded text-[11px] font-medium tabular-nums"
                            style={{
                              background: due.bg,
                              color: due.textColor,
                              boxShadow: `inset 0 0 0 1px ${due.ring}`,
                            }}
                          >
                            <span
                              className="w-1.5 h-1.5 rounded-full"
                              style={{ background: due.color }}
                            />
                            Nächster Termin: {fmtDate(ev.next_due_date)}
                          </span>
                        )}
                        <button
                          onClick={() => onDelete(ev.id)}
                          disabled={busyId === ev.id}
                          className="opacity-0 group-hover:opacity-100 transition-opacity p-1 text-stone-400 hover:text-rose-600 disabled:opacity-30"
                          title="Löschen"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  </div>
                </li>
              );
            })}
          </ol>
        )}
      </div>

      <AddEventModal vehicleId={vehicleId} open={open} onClose={() => setOpen(false)} />
    </>
  );
};

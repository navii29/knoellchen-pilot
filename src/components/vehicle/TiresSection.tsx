"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Calendar,
  Camera,
  ChevronDown,
  ChevronRight,
  Disc,
  History,
  Plus,
  Trash2,
} from "lucide-react";
import { fmtDate } from "@/lib/utils";
import {
  TIRE_TYPE_META,
  TIRE_CONDITION_META,
  TIRE_POSITIONS,
  TREAD_LEVEL_META,
  treadLevel,
  worstTreadLevel,
  type TirePhoto,
  type VehicleTire,
} from "@/lib/tires";
import { TireChangeModal } from "./TireChangeModal";
import { TirePhotosModal } from "./TirePhotosModal";

export type TireWithPhotos = VehicleTire & { photos: TirePhoto[] };

export const TiresSection = ({
  vehicleId,
  tires,
}: {
  vehicleId: string;
  tires: TireWithPhotos[];
}) => {
  const router = useRouter();
  const [changeOpen, setChangeOpen] = useState(false);
  const [photosTireId, setPhotosTireId] = useState<string | null>(null);
  const [openHistoryIds, setOpenHistoryIds] = useState<Set<string>>(new Set());
  const [busyId, setBusyId] = useState<string | null>(null);

  const current = tires.find((t) => t.is_current) ?? null;
  const history = tires.filter((t) => !t.is_current);

  const toggleHistory = (id: string) => {
    setOpenHistoryIds((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const remove = async (tireId: string) => {
    if (!confirm("Diesen Reifensatz inkl. Fotos löschen?")) return;
    setBusyId(tireId);
    try {
      const res = await fetch(`/api/vehicles/${vehicleId}/tires/${tireId}`, {
        method: "DELETE",
      });
      if (res.ok) router.refresh();
    } finally {
      setBusyId(null);
    }
  };

  return (
    <>
      <div className="rounded-xl bg-white ring-1 ring-stone-200 p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-stone-500 font-semibold">
            <Disc size={13} />
            Reifen
            <span className="ml-1 text-stone-400 font-normal normal-case tracking-normal">
              ({tires.length} Sätze)
            </span>
          </div>
          <button
            type="button"
            onClick={() => setChangeOpen(true)}
            className="inline-flex items-center gap-1.5 h-8 px-3 rounded-full bg-stone-900 text-white text-[12.5px] font-medium hover:bg-stone-800"
          >
            <Plus size={13} />
            {current ? "Reifenwechsel" : "Reifensatz anlegen"}
          </button>
        </div>

        {current ? (
          <CurrentTireCard
            tire={current}
            vehicleId={vehicleId}
            onManagePhotos={() => setPhotosTireId(current.id)}
          />
        ) : (
          <div className="py-7 text-center text-sm text-stone-500">
            <Disc size={18} className="mx-auto text-stone-300 mb-1.5" />
            Noch kein Reifensatz dokumentiert.
          </div>
        )}

        {history.length > 0 && (
          <div className="mt-5 pt-5 border-t border-stone-100">
            <div className="flex items-center gap-2 text-[11.5px] uppercase tracking-wider text-stone-500 font-semibold mb-2">
              <History size={11} />
              Historie · {history.length} {history.length === 1 ? "Satz" : "Sätze"}
            </div>
            <div className="rounded-lg ring-1 ring-stone-100 divide-y divide-stone-100 overflow-hidden">
              {history.map((t) => {
                const open = openHistoryIds.has(t.id);
                const meta = TIRE_TYPE_META[t.type];
                return (
                  <div key={t.id}>
                    <button
                      type="button"
                      onClick={() => toggleHistory(t.id)}
                      className="w-full px-4 py-2.5 grid grid-cols-[24px_1fr_auto_24px] items-center gap-3 hover:bg-stone-50 text-left"
                    >
                      <span
                        className="inline-flex w-5 h-5 rounded items-center justify-center text-[10px]"
                        style={{
                          background: meta.bg,
                          color: meta.text,
                          boxShadow: `inset 0 0 0 1px ${meta.ring}`,
                        }}
                      >
                        {meta.emoji}
                      </span>
                      <div className="min-w-0">
                        <div className="text-[13.5px] text-stone-900 truncate">
                          {meta.label}
                          {(t.brand || t.model) && (
                            <span className="ml-1 text-stone-500">
                              · {[t.brand, t.model].filter(Boolean).join(" ")}
                            </span>
                          )}
                        </div>
                        <div className="text-[11.5px] text-stone-500 tabular-nums">
                          {t.mounted_at ? fmtDate(t.mounted_at) : "—"}
                          {t.dismounted_at && ` → ${fmtDate(t.dismounted_at)}`}
                          {t.km_at_mount != null &&
                            ` · ${t.km_at_mount.toLocaleString("de-DE")} km`}
                        </div>
                      </div>
                      <span className="text-[11px] text-stone-400">
                        {t.size ?? ""}
                      </span>
                      {open ? (
                        <ChevronDown size={14} className="text-stone-400" />
                      ) : (
                        <ChevronRight size={14} className="text-stone-400" />
                      )}
                    </button>
                    {open && (
                      <div className="px-4 pb-4 pt-1 bg-stone-50/60">
                        <TreadGrid tire={t} compact />
                        {t.storage_location && (
                          <div className="mt-2 text-[11.5px] text-stone-600">
                            Lagerort:{" "}
                            <span className="font-medium">{t.storage_location}</span>
                          </div>
                        )}
                        {t.notes && (
                          <div className="mt-1 text-[11.5px] text-stone-600">
                            {t.notes}
                          </div>
                        )}
                        <div className="mt-3 flex items-center justify-between gap-2">
                          <button
                            type="button"
                            onClick={() => setPhotosTireId(t.id)}
                            className="inline-flex items-center gap-1 text-[11.5px] text-stone-600 hover:text-stone-900"
                          >
                            <Camera size={11} />
                            Fotos verwalten ({t.photos.length})
                          </button>
                          <button
                            type="button"
                            onClick={() => remove(t.id)}
                            disabled={busyId === t.id}
                            className="inline-flex items-center gap-1 text-[11.5px] text-stone-500 hover:text-rose-700 disabled:opacity-40"
                          >
                            <Trash2 size={11} />
                            Löschen
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {changeOpen && (
        <TireChangeModal
          vehicleId={vehicleId}
          currentTire={current}
          onClose={() => setChangeOpen(false)}
        />
      )}

      {photosTireId &&
        (() => {
          const t = tires.find((x) => x.id === photosTireId);
          if (!t) return null;
          return (
            <TirePhotosModal
              vehicleId={vehicleId}
              tire={t}
              initialPhotos={t.photos}
              onClose={() => setPhotosTireId(null)}
            />
          );
        })()}
    </>
  );
};

const CurrentTireCard = ({
  tire,
  vehicleId,
  onManagePhotos,
}: {
  tire: TireWithPhotos;
  vehicleId: string;
  onManagePhotos: () => void;
}) => {
  const meta = TIRE_TYPE_META[tire.type];
  const condMeta = TIRE_CONDITION_META[tire.condition];
  const worst = worstTreadLevel(tire);

  return (
    <div>
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <span
          className="inline-flex items-center gap-1.5 px-2.5 h-7 rounded-full text-[12.5px] font-medium"
          style={{
            background: meta.bg,
            color: meta.text,
            boxShadow: `inset 0 0 0 1px ${meta.ring}`,
          }}
        >
          <span>{meta.emoji}</span>
          {meta.label}
        </span>
        {tire.condition && (
          <span
            className="inline-flex items-center gap-1.5 px-2 h-6 rounded-full text-[11.5px] font-medium bg-white ring-1 ring-stone-200 text-stone-700"
            title="Zustand"
          >
            <span
              className="w-1.5 h-1.5 rounded-full"
              style={{ background: condMeta.color }}
            />
            {condMeta.label}
          </span>
        )}
        {worst === "critical" && (
          <span className="inline-flex items-center gap-1.5 px-2 h-6 rounded-full text-[11.5px] font-medium bg-rose-50 text-rose-700 ring-1 ring-rose-200">
            ⚠ Wechsel empfohlen
          </span>
        )}
      </div>

      <div className="grid sm:grid-cols-[1fr_220px] gap-4">
        <div className="space-y-3">
          <div className="text-[13.5px] text-stone-700">
            <span className="font-medium text-stone-900">
              {[tire.brand, tire.model].filter(Boolean).join(" ") || "Marke unbekannt"}
            </span>
            {tire.size && (
              <span className="ml-2 text-stone-500 font-mono">{tire.size}</span>
            )}
            {tire.dot_number && (
              <span className="ml-2 text-stone-400 text-[12px]">DOT {tire.dot_number}</span>
            )}
          </div>

          <TreadGrid tire={tire} />

          <div className="text-[12.5px] text-stone-600 flex items-center gap-3 flex-wrap">
            {tire.mounted_at && (
              <span className="inline-flex items-center gap-1">
                <Calendar size={11} className="text-stone-400" />
                Montiert seit {fmtDate(tire.mounted_at)}
              </span>
            )}
            {tire.km_at_mount != null && (
              <span className="tabular-nums">
                bei {tire.km_at_mount.toLocaleString("de-DE")} km
              </span>
            )}
          </div>
        </div>

        <div>
          <PhotoGrid tire={tire} vehicleId={vehicleId} />
          <button
            type="button"
            onClick={onManagePhotos}
            className="mt-2 w-full inline-flex items-center justify-center gap-1.5 h-8 rounded-md ring-1 ring-stone-200 text-[12px] text-stone-700 font-medium hover:bg-stone-50"
          >
            <Camera size={12} />
            {tire.photos.length === 0
              ? "Fotos hinzufügen"
              : `Fotos verwalten (${tire.photos.length}/6)`}
          </button>
        </div>
      </div>
    </div>
  );
};

const TreadGrid = ({
  tire,
  compact,
}: {
  tire: VehicleTire;
  compact?: boolean;
}) => (
  <div className={`grid grid-cols-2 gap-1.5 max-w-xs ${compact ? "text-[11.5px]" : "text-[12.5px]"}`}>
    {TIRE_POSITIONS.map((p) => {
      const v = tire[p.key] as number | null;
      const lvl = treadLevel(v);
      const m = TREAD_LEVEL_META[lvl];
      return (
        <div
          key={p.key}
          className="rounded-lg px-2.5 py-1.5"
          style={{
            background: m.bg,
            boxShadow: `inset 0 0 0 1px ${m.ring}`,
          }}
        >
          <div className="text-[10px] uppercase tracking-wider font-semibold" style={{ color: m.text }}>
            {p.short}
          </div>
          <div
            className="font-mono font-semibold tabular-nums"
            style={{ color: m.color }}
          >
            {v != null ? `${Number(v).toFixed(1).replace(".", ",")} mm` : "—"}
          </div>
        </div>
      );
    })}
  </div>
);

const PhotoGrid = ({
  tire,
  vehicleId,
}: {
  tire: TireWithPhotos;
  vehicleId: string;
}) => {
  if (tire.photos.length === 0) {
    return (
      <div className="rounded-lg ring-1 ring-stone-100 bg-stone-50 px-3 py-4 text-center text-[12px] text-stone-500">
        Keine Fotos
      </div>
    );
  }
  return (
    <div className="grid grid-cols-3 gap-1">
      {tire.photos.slice(0, 6).map((p) => (
        <a
          key={p.id}
          href={`/api/vehicles/${vehicleId}/tires/${tire.id}/photo-url?path=${encodeURIComponent(p.photo_path)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="aspect-square rounded-md bg-stone-100 ring-1 ring-stone-200 overflow-hidden flex items-center justify-center text-[10px] text-stone-500 font-medium hover:ring-stone-300"
          title={p.position}
        >
          {p.position}
        </a>
      ))}
    </div>
  );
};

"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Loader2, MapPin, RefreshCcw, Settings } from "lucide-react";
import { relTime } from "@/lib/utils";
import { Panel, PanelHeader } from "@/components/ui/Panel";

const buildOsmEmbedSrc = (lat: number, lng: number, zoom = 0.012) => {
  const bbox = [lng - zoom, lat - zoom, lng + zoom, lat + zoom]
    .map((n) => n.toFixed(6))
    .join(",");
  return `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${lat.toFixed(6)},${lng.toFixed(6)}`;
};

export const GpsLocation = ({
  vehicleId,
  hasDevice,
  initialLat,
  initialLng,
  initialUpdatedAt,
}: {
  vehicleId: string;
  hasDevice: boolean;
  initialLat: number | null;
  initialLng: number | null;
  initialUpdatedAt: string | null;
}) => {
  const router = useRouter();
  const [lat, setLat] = useState<number | null>(initialLat);
  const [lng, setLng] = useState<number | null>(initialLng);
  const [updatedAt, setUpdatedAt] = useState<string | null>(initialUpdatedAt);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = async () => {
    setRefreshing(true);
    setError(null);
    try {
      const res = await fetch(`/api/vehicles/${vehicleId}/gps?refresh=true`, {
        method: "GET",
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(j.error ?? "Aktualisierung fehlgeschlagen.");
        return;
      }
      setLat(j.lat ?? null);
      setLng(j.lng ?? null);
      setUpdatedAt(j.recorded_at ?? null);
      router.refresh();
    } finally {
      setRefreshing(false);
    }
  };

  if (!hasDevice) {
    return (
      <Panel flush>
        <PanelHeader title="Standort" Icon={MapPin} />
        <div className="p-5 text-sm text-ink-soft">
          Diesem Fahrzeug ist kein GPS-Tracker zugeordnet.{" "}
          <Link
            href={`/dashboard/vehicles/${vehicleId}`}
            className="inline-flex items-center gap-1 text-signal hover:underline"
          >
            <Settings size={12} /> Tracker-ID im Vertragsformular ergänzen
          </Link>
        </div>
      </Panel>
    );
  }

  const hasPosition = lat != null && lng != null;

  return (
    <Panel flush>
      <PanelHeader
        title="Standort"
        Icon={MapPin}
        actions={
          updatedAt ? (
            <span className="text-[11px] text-ink-muted font-mono">
              {relTime(updatedAt)}
            </span>
          ) : null
        }
      />
      <div className="p-5">
        <div className="flex items-center justify-end mb-3">
          <button
            type="button"
            onClick={refresh}
            disabled={refreshing}
            className="inline-flex items-center gap-1.5 text-[12.5px] h-8 px-3 rounded-btn border border-hairline bg-paper hover:bg-canvas text-ink-soft disabled:opacity-50"
          >
            {refreshing ? (
              <Loader2 size={12} className="animate-spin" />
            ) : (
              <RefreshCcw size={12} />
            )}
            Aktualisieren
          </button>
        </div>

        {!hasPosition ? (
          <div className="py-8 text-center text-sm text-ink-muted">
            Noch keine Position empfangen. Klick auf „Aktualisieren“ um die letzte
            Position vom Tracker zu laden.
          </div>
        ) : (
          <div>
            <div className="rounded-frame overflow-hidden border border-hairline bg-canvas">
              <iframe
                key={`${lat}-${lng}-${updatedAt ?? ""}`}
                title="Fahrzeug-Standort"
                src={buildOsmEmbedSrc(lat, lng)}
                width="100%"
                height="320"
                loading="lazy"
                style={{ border: 0 }}
              />
            </div>
            <div className="mt-3 flex items-center justify-between text-[12.5px] text-ink-muted flex-wrap gap-2">
              <span className="font-mono tabular-nums">
                {lat.toFixed(6)}, {lng.toFixed(6)}
              </span>
              <a
                href={`https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=16/${lat}/${lng}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-signal hover:underline"
              >
                In OpenStreetMap öffnen ↗
              </a>
            </div>
          </div>
        )}

        {error && (
          <div className="mt-3 text-xs rounded-frame px-3 py-2 bg-red-50 border border-red-200 text-red-700">
            {error}
          </div>
        )}
      </div>
    </Panel>
  );
};

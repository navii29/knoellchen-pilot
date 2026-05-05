"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Loader2, MapPin, RefreshCcw, Settings } from "lucide-react";
import { relTime } from "@/lib/utils";

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
      <div className="rounded-xl bg-white ring-1 ring-stone-200 p-5">
        <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-stone-500 font-semibold mb-3">
          <MapPin size={13} />
          Standort
        </div>
        <div className="text-sm text-stone-600">
          Diesem Fahrzeug ist kein GPS-Tracker zugeordnet.{" "}
          <Link
            href={`/dashboard/vehicles/${vehicleId}`}
            className="inline-flex items-center gap-1 text-teal-700 hover:underline"
          >
            <Settings size={12} /> Tracker-ID im Vertragsformular ergänzen
          </Link>
        </div>
      </div>
    );
  }

  const hasPosition = lat != null && lng != null;

  return (
    <div className="rounded-xl bg-white ring-1 ring-stone-200 p-5">
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-stone-500 font-semibold">
          <MapPin size={13} />
          Standort
          {updatedAt && (
            <span className="ml-2 text-stone-400 font-normal normal-case tracking-normal">
              · letztes Update {relTime(updatedAt)}
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={refresh}
          disabled={refreshing}
          className="inline-flex items-center gap-1.5 text-[12.5px] px-2.5 py-1 rounded-md ring-1 ring-stone-200 hover:bg-stone-50 disabled:opacity-50"
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
        <div className="py-8 text-center text-sm text-stone-500">
          Noch keine Position empfangen. Klick auf „Aktualisieren“ um die letzte
          Position vom Tracker zu laden.
        </div>
      ) : (
        <div>
          <div className="rounded-lg overflow-hidden ring-1 ring-stone-200 bg-stone-50">
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
          <div className="mt-3 flex items-center justify-between text-[12.5px] text-stone-500 flex-wrap gap-2">
            <span className="font-mono tabular-nums">
              {lat.toFixed(6)}, {lng.toFixed(6)}
            </span>
            <a
              href={`https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=16/${lat}/${lng}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-teal-700 hover:underline"
            >
              In OpenStreetMap öffnen ↗
            </a>
          </div>
        </div>
      )}

      {error && (
        <div className="mt-3 text-xs rounded-md px-3 py-2 bg-rose-50 ring-1 ring-rose-200 text-rose-700">
          {error}
        </div>
      )}
    </div>
  );
};

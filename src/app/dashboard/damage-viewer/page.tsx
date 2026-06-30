"use client";

// Dev-Harness für den controlled 3D-Viewer (Schritt 1–3). Marker leben hier NUR
// im Browser (lokaler In-Memory-Adapter, keine DB/API) — die echte, persistierte
// Anbindung kommt in Schritt 4 im Handover-Tab. Der Viewer wird per next/dynamic
// mit ssr:false geladen → das 3D-Bundle belastet nur diese Seite.
import { useRef, useState } from "react";
import dynamic from "next/dynamic";
import type { ViewerMarker, NewMarkerInput, MarkerPatch } from "@/components/damage/VehicleViewer3D";

const VehicleViewer3D = dynamic(() => import("@/components/damage/VehicleViewer3D"), {
  ssr: false,
  loading: () => <div style={{ padding: 24, color: "#6b7280" }}>Lädt Viewer…</div>,
});

export default function DamageViewerPage() {
  const [markers, setMarkers] = useState<ViewerMarker[]>([]);
  const idRef = useRef(0);

  const onAdd = (m: NewMarkerInput) =>
    setMarkers((prev) => [
      ...prev,
      { ...m, id: String((idRef.current += 1)), damageType: null, severity: null },
    ]);
  const onUpdate = (id: string, patch: MarkerPatch) =>
    setMarkers((prev) => prev.map((x) => (x.id === id ? { ...x, ...patch } : x)));
  const onRemove = (id: string) => setMarkers((prev) => prev.filter((x) => x.id !== id));
  const onClear = () => setMarkers([]);

  return (
    <div style={{ padding: 24, maxWidth: 1100, margin: "0 auto" }}>
      <h1 style={{ fontSize: 20, fontWeight: 700, marginBottom: 4 }}>
        3D-Fahrzeug-Viewer (Test · In-Memory)
      </h1>
      <p style={{ color: "#6b7280", fontSize: 14, marginBottom: 16 }}>
        Dev-Harness ohne Datenbank — Marker leben nur im Browser. Doppel-Klick/Doppel-Tap setzt einen
        Marker, Zeile antippen zum Bearbeiten. Die persistierte Anbindung an einen echten Vertrag
        kommt im Handover-Tab (Schritt 4).
      </p>
      <VehicleViewer3D
        markers={markers}
        type="pickup"
        onAdd={onAdd}
        onUpdate={onUpdate}
        onRemove={onRemove}
        onClear={onClear}
      />
    </div>
  );
}

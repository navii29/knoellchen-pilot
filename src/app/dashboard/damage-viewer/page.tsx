"use client";

// Test-Unterseite für den minimalen 3D-Viewer (Schritt 1). Der Viewer wird per
// next/dynamic mit ssr:false geladen → das 3D-Bundle (three/r3f/drei) belastet
// nur diese Seite, nicht das übrige Dashboard.
import dynamic from "next/dynamic";

const VehicleViewer3D = dynamic(() => import("@/components/damage/VehicleViewer3D"), {
  ssr: false,
  loading: () => <div style={{ padding: 24, color: "#6b7280" }}>Lädt Viewer…</div>,
});

export default function DamageViewerPage() {
  return (
    <div style={{ padding: 24, maxWidth: 1000, margin: "0 auto" }}>
      <h1 style={{ fontSize: 20, fontWeight: 700, marginBottom: 4 }}>3D-Fahrzeug-Viewer (Test)</h1>
      <p style={{ color: "#6b7280", fontSize: 14, marginBottom: 16 }}>
        Schritt 1: GLB laden + drehen — Maus/Touch zum Drehen, Scrollen zum Zoomen, Rechtsklick zum
        Schwenken. Noch keine Marker.
      </p>
      <VehicleViewer3D />
    </div>
  );
}

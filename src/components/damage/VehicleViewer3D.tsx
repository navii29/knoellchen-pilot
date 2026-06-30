"use client";

// Minimaler 3D-Viewer (Schritt 1): lädt public/vehicle-base.glb und zeigt es
// drehbar (OrbitControls). KEINE Marker, kein Raycasting, keine DB. Bewusst ohne
// <Stage environment> (würde eine HDR-Map extern nachladen) — nur einfache
// Lichter. Eigene ErrorBoundary fängt einen fehlenden/ungültigen GLB ab
// (sichtbare Meldung statt weißer Crash).
import { Component, type ReactNode, Suspense } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Center, Html, useGLTF } from "@react-three/drei";

const MODEL_URL = "/vehicle-base.glb";

function Model() {
  const { scene } = useGLTF(MODEL_URL);
  return <primitive object={scene} />;
}

class ViewerErrorBoundary extends Component<{ children: ReactNode }, { error: boolean }> {
  state = { error: false };
  static getDerivedStateFromError() {
    return { error: true };
  }
  render() {
    if (this.state.error) {
      return (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            height: "100%",
            padding: 24,
            textAlign: "center",
            color: "#b91c1c",
            fontSize: 14,
            lineHeight: 1.5,
          }}
        >
          3D-Modell konnte nicht geladen werden. Bitte prüfen, ob{" "}
          <code style={{ margin: "0 4px" }}>public/vehicle-base.glb</code> vorhanden und gültig ist.
        </div>
      );
    }
    return this.props.children;
  }
}

export default function VehicleViewer3D() {
  return (
    <div
      style={{
        width: "100%",
        height: "70vh",
        minHeight: 420,
        background: "#f4f4f5",
        borderRadius: 12,
        overflow: "hidden",
      }}
    >
      <ViewerErrorBoundary>
        <Canvas camera={{ position: [4, 2.5, 5], fov: 45 }} dpr={[1, 2]}>
          <ambientLight intensity={0.7} />
          <directionalLight position={[5, 8, 5]} intensity={1.1} />
          <directionalLight position={[-5, 3, -5]} intensity={0.4} />
          <Suspense
            fallback={
              <Html center style={{ color: "#6b7280", fontSize: 13, whiteSpace: "nowrap" }}>
                Lädt 3D-Modell…
              </Html>
            }
          >
            <Center>
              <Model />
            </Center>
          </Suspense>
          <OrbitControls makeDefault enableDamping />
        </Canvas>
      </ViewerErrorBoundary>
    </div>
  );
}

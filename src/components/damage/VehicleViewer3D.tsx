"use client";

// 3D-Viewer Schritt 2a+2b (+ Weg A): GLB laden + drehen, DOPPEL-Tap setzt einen
// Marker und schlägt ein BENANNTES Bauteil vor (Scheinwerfer, Tür …), das der
// Operator per Dropdown bestätigen/korrigieren kann. ALLES In-Memory — keine DB,
// kein Speichern, kein Typ/Schweregrad, kein Foto (2c/2d).
//
// Performance: Das Mesh hat ~304k Dreiecke. Kein r3f-Handler am Mesh (sonst
// pointerdown-Raycast → Drehen friert ein); Marker-Raycast läuft manuell beim
// Doppel-Tap, beschleunigt per BVH (three-mesh-bvh) → <1 ms.
//
// Das GLB ist EIN Mesh ohne benannte Teile → Bauteil/Zone kommen aus der
// Trefferposition relativ zur Bounding-Box.
import {
  Component,
  type ReactNode,
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Canvas, createPortal, useThree } from "@react-three/fiber";
import { OrbitControls, Center, Html, useGLTF } from "@react-three/drei";
import * as THREE from "three";
import { computeBoundsTree, disposeBoundsTree, acceleratedRaycast } from "three-mesh-bvh";
import { POSITIONS } from "@/lib/handover";
import type { HandoverPosition } from "@/lib/types";
import { resolvePart, PART_OPTIONS, partLabelById } from "@/lib/vehicle-parts";

// BVH für schnelle Raycasts (siehe oben). Prototype-Patch ist der dokumentierte
// Standard; acceleratedRaycast fällt für Geometrien ohne boundsTree automatisch
// auf den normalen Raycast zurück.
THREE.BufferGeometry.prototype.computeBoundsTree = computeBoundsTree;
THREE.BufferGeometry.prototype.disposeBoundsTree = disposeBoundsTree;
THREE.Mesh.prototype.raycast = acceleratedRaycast;

const MODEL_URL = "/vehicle-base.glb";

// ── KALIBRIERUNG ──────────────────────────────────────────────────────────
// Achsen werden automatisch aus den bbox-Ausdehnungen erkannt (längste = Länge
// = vorne/hinten, mittlere = Breite = links/rechts, kürzeste = Höhe). Nur die
// RICHTUNG pro Achse ist mehrdeutig → drei Vorzeichen.
//   FRONT_AT_MAX / LEFT_AT_MAX  → ABGENOMMEN (vorne/hinten/links/rechts korrekt) — NICHT ändern.
//   TOP_AT_MAX                  → NEU (für die Höhe/Bauteile). Live verifizieren:
//      Dach doppeltippen → vert hoch (~>0.8); Rad → vert niedrig (~<0.2).
//      Stimmt es nicht (Dach unten / Rad oben) → TOP_AT_MAX umdrehen.
const FRONT_AT_MAX = true;
const LEFT_AT_MAX = true;
const TOP_AT_MAX = true;

// Doppel-Tap-/Drag-Schwellen.
const DRAG_PX = 6; // mehr Bewegung zwischen down/up → Drag, kein Tap
const DBL_MS = 300; // max. Abstand zwischen zwei Taps
const DBL_PX = 24; // max. Distanz zwischen zwei Taps

type Marker = {
  id: number;
  x: number;
  y: number;
  z: number; // lokale (Geometrie-)Koordinaten → kleben am Auto bei Re-Center/Skalierung
  lon: number;
  lat: number;
  vert: number; // normalisiert [0,1] → Diagnose + Bauteil-Auflösung
  partId: string | null; // vorgeschlagenes/gewähltes Bauteil (null → grobe Zone)
  zoneLabel: string; // grober Zonen-Fallback (immer gesetzt)
};

const labelFor = (key: HandoverPosition): string =>
  POSITIONS.find((p) => p.key === key)?.label ?? key;

// Drittel: 0 = unteres, 1 = mittleres, 2 = oberes Band einer 0..1-Koordinate.
const third = (t: number): 0 | 1 | 2 => (t < 1 / 3 ? 0 : t < 2 / 3 ? 1 : 2);

const axisComp = (v: THREE.Vector3, ax: number) => (ax === 0 ? v.x : ax === 1 ? v.y : v.z);
const axisMin = (b: THREE.Box3, ax: number) => (ax === 0 ? b.min.x : ax === 1 ? b.min.y : b.min.z);

// Lokaler Trefferpunkt → kanonische Koordinate {lon,lat,vert} ∈ [0,1].
// lon 1=vorne, lat 1=links, vert 1=oben. Achsen aus den bbox-Ausdehnungen
// (längste/mittlere/kürzeste), Richtung über die Kalibrier-Vorzeichen.
function toCanonical(p: THREE.Vector3, bbox: THREE.Box3): { lon: number; lat: number; vert: number } {
  const size = new THREE.Vector3();
  bbox.getSize(size);
  const ranked = [
    [0, size.x],
    [1, size.y],
    [2, size.z],
  ].sort((a, b) => b[1] - a[1]);
  const longAxis = ranked[0][0]; // Länge
  const latAxis = ranked[1][0]; // Breite
  const vertAxis = ranked[2][0]; // Höhe
  const norm = (ax: number, ext: number) => (axisComp(p, ax) - axisMin(bbox, ax)) / (ext || 1);
  const tLong = norm(longAxis, ranked[0][1]);
  const tLat = norm(latAxis, ranked[1][1]);
  const tVert = norm(vertAxis, ranked[2][1]);
  return {
    lon: FRONT_AT_MAX ? tLong : 1 - tLong,
    lat: LEFT_AT_MAX ? tLat : 1 - tLat,
    vert: TOP_AT_MAX ? tVert : 1 - tVert,
  };
}

/**
 * Grobe handover-Zone (Fallback, falls kein Bauteil trifft). UNVERÄNDERT seit der
 * abgenommenen Kalibrierung — eigene Achsen-Erkennung, damit das Zonen-Ergebnis
 * garantiert identisch bleibt. Dach-Mitte → nächste Kante.
 */
function pointToZone(p: THREE.Vector3, bbox: THREE.Box3): HandoverPosition {
  const size = new THREE.Vector3();
  bbox.getSize(size);
  const ranked = [
    [0, size.x],
    [1, size.y],
    [2, size.z],
  ].sort((a, b) => b[1] - a[1]);
  const longAxis = ranked[0][0];
  const latAxis = ranked[1][0];

  const tLong = (axisComp(p, longAxis) - axisMin(bbox, longAxis)) / (ranked[0][1] || 1);
  const tLat = (axisComp(p, latAxis) - axisMin(bbox, latAxis)) / (ranked[1][1] || 1);

  const toFR = (b: 0 | 1 | 2): "front" | "mid" | "rear" =>
    b === 1 ? "mid" : (b === 2) === FRONT_AT_MAX ? "front" : "rear";
  const toLR = (b: 0 | 1 | 2): "left" | "mid" | "right" =>
    b === 1 ? "mid" : (b === 2) === LEFT_AT_MAX ? "left" : "right";

  let fr = toFR(third(tLong));
  let lr = toLR(third(tLat));

  if (fr === "mid" && lr === "mid") {
    if (Math.abs(tLong - 0.5) >= Math.abs(tLat - 0.5)) {
      fr = (tLong > 0.5) === FRONT_AT_MAX ? "front" : "rear";
    } else {
      lr = (tLat > 0.5) === LEFT_AT_MAX ? "left" : "right";
    }
  }

  if (fr === "front") return lr === "left" ? "front_left" : lr === "right" ? "front_right" : "front";
  if (fr === "rear") return lr === "left" ? "rear_left" : lr === "right" ? "rear_right" : "rear";
  return lr === "left" ? "left" : "right";
}

// Anzeige-Label eines Markers: gewähltes Bauteil oder grober Zonen-Fallback.
const markerLabel = (m: Marker): string => (m.partId ? partLabelById(m.partId) : m.zoneLabel);

function Model({ markers, onAdd }: { markers: Marker[]; onAdd: (m: Omit<Marker, "id">) => void }) {
  const { scene } = useGLTF(MODEL_URL);
  const camera = useThree((s) => s.camera);
  const gl = useThree((s) => s.gl);
  const [mesh, setMesh] = useState<THREE.Mesh | null>(null);
  const [bbox, setBbox] = useState<THREE.Box3 | null>(null);

  // Das (eine) Mesh + Geometrie-Bounding-Box + BVH einmal nach dem Laden holen.
  useEffect(() => {
    let found: THREE.Mesh | null = null;
    scene.traverse((o) => {
      if (!found && (o as THREE.Mesh).isMesh) found = o as THREE.Mesh;
    });
    if (found) {
      const m = found as THREE.Mesh;
      m.geometry.computeBoundingBox();
      if (!m.geometry.boundsTree) m.geometry.computeBoundsTree(); // schnelle Raycasts
      setMesh(m);
      setBbox(m.geometry.boundingBox!.clone());
    }
  }, [scene]);

  // Marker-Radius relativ zur Modellgröße (skalierungsunabhängig sichtbar).
  const radius = useMemo(() => {
    if (!bbox) return 0.012;
    const s = new THREE.Vector3();
    bbox.getSize(s);
    return s.length() * 0.012;
  }, [bbox]);

  // Doppel-Tap → manueller Raycast → Marker (Bauteil-Vorschlag + Zonen-Fallback).
  // Mesh bleibt nicht-interaktiv (kein r3f-Handler); Listener passiv → OrbitControls
  // unberührt.
  useEffect(() => {
    if (!mesh || !bbox) return;
    const el = gl.domElement;
    const raycaster = new THREE.Raycaster();
    const ndc = new THREE.Vector2();
    let downX = 0;
    let downY = 0;
    let lastT = 0;
    let lastX = 0;
    let lastY = 0;

    const place = (cx: number, cy: number) => {
      const rect = el.getBoundingClientRect();
      ndc.x = ((cx - rect.left) / rect.width) * 2 - 1;
      ndc.y = -((cy - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(ndc, camera);
      const hits = raycaster.intersectObject(mesh, false); // nur das Mesh, nicht die Marker
      if (!hits.length) return;
      const local = mesh.worldToLocal(hits[0].point.clone()); // Welt → Geometrie-lokal
      const canon = toCanonical(local, bbox);
      const part = resolvePart(canon);
      onAdd({
        x: local.x,
        y: local.y,
        z: local.z,
        lon: canon.lon,
        lat: canon.lat,
        vert: canon.vert,
        partId: part?.partId ?? null,
        zoneLabel: labelFor(pointToZone(local, bbox)),
      });
    };

    const onDown = (e: PointerEvent) => {
      downX = e.clientX;
      downY = e.clientY;
    };
    const onUp = (e: PointerEvent) => {
      if (Math.hypot(e.clientX - downX, e.clientY - downY) > DRAG_PX) {
        lastT = 0; // war ein Drag (Drehen) → kein Tap
        return;
      }
      const near = Math.hypot(e.clientX - lastX, e.clientY - lastY) < DBL_PX;
      if (e.timeStamp - lastT < DBL_MS && near) {
        lastT = 0;
        place(e.clientX, e.clientY); // zweiter Tap → Marker (sofort)
      } else {
        lastT = e.timeStamp;
        lastX = e.clientX;
        lastY = e.clientY;
      }
    };

    el.addEventListener("pointerdown", onDown);
    el.addEventListener("pointerup", onUp);
    return () => {
      el.removeEventListener("pointerdown", onDown);
      el.removeEventListener("pointerup", onUp);
    };
  }, [mesh, bbox, camera, gl, onAdd]);

  return (
    <>
      {/* KEIN Event-Handler am Mesh → nicht-interaktiv → kein pointerdown-Raycast. */}
      <primitive object={scene} />
      {/* Marker als Kinder des Mesh → erben dessen Welt-Transform (kleben am Auto). */}
      {mesh &&
        createPortal(
          <>
            {markers.map((m) => (
              <group key={m.id} position={[m.x, m.y, m.z]}>
                <mesh>
                  <sphereGeometry args={[radius, 16, 16]} />
                  <meshBasicMaterial color="#dc2626" />
                </mesh>
                <Html center style={{ pointerEvents: "none" }}>
                  <span
                    style={{
                      background: "rgba(17,24,39,0.9)",
                      color: "#fff",
                      fontSize: 11,
                      lineHeight: 1,
                      padding: "3px 6px",
                      borderRadius: 6,
                      whiteSpace: "nowrap",
                      fontFamily: "system-ui, sans-serif",
                    }}
                  >
                    {m.id}. {markerLabel(m)}
                  </span>
                </Html>
              </group>
            ))}
          </>,
          mesh
        )}
    </>
  );
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
  const [markers, setMarkers] = useState<Marker[]>([]);
  const idRef = useRef(0);

  const addMarker = useCallback(
    (m: Omit<Marker, "id">) => setMarkers((prev) => [...prev, { ...m, id: (idRef.current += 1) }]),
    []
  );
  const setPartId = useCallback(
    (id: number, partId: string | null) =>
      setMarkers((prev) => prev.map((m) => (m.id === id ? { ...m, partId } : m))),
    []
  );
  const clear = () => setMarkers([]);

  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 16, alignItems: "stretch" }}>
      <div
        style={{
          flex: "1 1 460px",
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
                <Model markers={markers} onAdd={addMarker} />
              </Center>
            </Suspense>
            <OrbitControls makeDefault enableDamping />
          </Canvas>
        </ViewerErrorBoundary>
      </div>

      <aside
        style={{
          flex: "0 1 300px",
          minWidth: 240,
          display: "flex",
          flexDirection: "column",
          gap: 8,
          fontFamily: "system-ui, sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <strong style={{ fontSize: 14 }}>Marker ({markers.length})</strong>
          <button
            onClick={clear}
            disabled={markers.length === 0}
            style={{
              fontSize: 12,
              padding: "4px 10px",
              borderRadius: 6,
              border: "1px solid #d4d4d8",
              background: "#fff",
              color: markers.length ? "#dc2626" : "#a1a1aa",
              cursor: markers.length ? "pointer" : "default",
            }}
          >
            Zurücksetzen
          </button>
        </div>
        <p style={{ fontSize: 12, color: "#6b7280", margin: 0 }}>
          <strong>Doppel-Klick / Doppel-Tap</strong> aufs Auto → Bauteil-Vorschlag. Im Dropdown
          bestätigen/korrigieren. Einzelklick + Ziehen = drehen. In-Memory — nichts wird gespeichert.
        </p>
        {markers.length === 0 ? (
          <p style={{ fontSize: 13, color: "#9ca3af", marginTop: 4 }}>Noch keine Marker.</p>
        ) : (
          <ol style={{ margin: 0, paddingLeft: 0, listStyle: "none", fontSize: 13 }}>
            {markers.map((m) => (
              <li
                key={m.id}
                style={{
                  padding: "8px",
                  borderRadius: 6,
                  background: "#fafafa",
                  border: "1px solid #f0f0f0",
                  marginBottom: 6,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                  <span style={{ color: "#9ca3af" }}>{m.id}.</span>
                  <select
                    value={m.partId ?? ""}
                    onChange={(e) => setPartId(m.id, e.target.value || null)}
                    style={{
                      flex: 1,
                      fontSize: 13,
                      padding: "3px 6px",
                      borderRadius: 6,
                      border: "1px solid #d4d4d8",
                      background: "#fff",
                    }}
                  >
                    <option value="">— grobe Zone ({m.zoneLabel}) —</option>
                    {PART_OPTIONS.map((o) => (
                      <option key={o.id} value={o.id}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </div>
                {/* Diagnose für die Box-Justierung */}
                <code style={{ color: "#a1a1aa", fontSize: 11 }}>
                  lon {m.lon.toFixed(2)} · lat {m.lat.toFixed(2)} · vert {m.vert.toFixed(2)}
                </code>
              </li>
            ))}
          </ol>
        )}
      </aside>
    </div>
  );
}

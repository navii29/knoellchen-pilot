"use client";

// 3D-Viewer Schritt 2a+2b: GLB laden + drehen, DOPPEL-Tap setzt einen Marker an
// der Trefferstelle und erkennt die Karosserie-Zone aus der Position. ALLES
// In-Memory — keine DB, kein Speichern, kein Typ/Schweregrad, kein Foto (2c/2d).
//
// Wichtig (Performance): Das Mesh hat ~304k Dreiecke. Würde ein r3f-Event-Handler
// (onClick/onDoubleClick) am Mesh hängen, läge es im Interaction-Set und r3f würde
// es bei JEDEM pointerdown brute-force raycasten → Stall beim Anfassen → Drehen
// fühlt sich eingefroren an. Darum: KEIN Handler am Mesh (es bleibt nicht-
// interaktiv → OrbitControls flüssig) und der Marker-Raycast läuft MANUELL nur
// beim Doppel-Tap (einmal statt bei jedem Druck).
//
// Das GLB ist EIN Mesh ohne benannte Teile (Tripo-generiert), darum kommt der
// Teil-Name nicht aus dem Mesh, sondern aus der Treffer-Position → Bounding-Box-
// Zonen, deckungsgleich zu handover.ts POSITIONS.
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

// BVH für schnelle Raycasts. Das Mesh hat ~304k Dreiecke; ein Standard-three.js-
// Raycast testet jedes Dreieck einzeln → ~1,5 s pro Klick (DAS war die spürbare
// Verzögerung, KEIN Timer). three-mesh-bvh (schon via @react-three/drei
// installiert) baut einmalig einen Suchbaum → Raycasts in <1 ms. Der Prototype-
// Patch ist der dokumentierte Standard und unkritisch: acceleratedRaycast fällt
// für Geometrien OHNE boundsTree automatisch auf den normalen Raycast zurück.
THREE.BufferGeometry.prototype.computeBoundsTree = computeBoundsTree;
THREE.BufferGeometry.prototype.disposeBoundsTree = disposeBoundsTree;
THREE.Mesh.prototype.raycast = acceleratedRaycast;

const MODEL_URL = "/vehicle-base.glb";

// ── KALIBRIERUNG ──────────────────────────────────────────────────────────
// Die Zone kommt aus der Trefferposition relativ zur Bounding-Box. Welche
// ACHSE Länge bzw. Breite ist, wird automatisch aus den bbox-Ausdehnungen
// erkannt (längste = Länge = vorne/hinten, mittlere = Breite = links/rechts,
// kürzeste = Höhe → ignoriert). Nur die RICHTUNG pro Achse ist mehrdeutig —
// dafür diese zwei Vorzeichen:
//   FRONT_AT_MAX = true  → "vorne" liegt am MAX-Ende der Längsachse
//   LEFT_AT_MAX  = true  → "links" liegt am MAX-Ende der Querachse
//
// LIVE VERIFIZIEREN (zwingend — sonst gespiegelte Zonen → falsche PDF-Sätze):
//   1. Marker sichtbar auf die FRONT setzen (Scheinwerfer/Windschutzscheibe).
//      Label muss "Vorne" zeigen. Zeigt es "Hinten" → FRONT_AT_MAX umdrehen.
//   2. Marker auf die LINKE Seite setzen. Label muss "Links" zeigen.
//      Zeigt es "Rechts" → LEFT_AT_MAX umdrehen.
const FRONT_AT_MAX = true;
const LEFT_AT_MAX = true;

// Doppel-Tap-/Drag-Schwellen.
const DRAG_PX = 6; // mehr Bewegung zwischen down/up → Drag, kein Tap
const DBL_MS = 300; // max. Abstand zwischen zwei Taps
const DBL_PX = 24; // max. Distanz zwischen zwei Taps

type Marker = {
  id: number;
  x: number;
  y: number;
  z: number; // lokale (Geometrie-)Koordinaten → kleben am Auto bei Re-Center/Skalierung
  key: HandoverPosition;
  label: string;
};

const labelFor = (key: HandoverPosition): string =>
  POSITIONS.find((p) => p.key === key)?.label ?? key;

// Drittel: 0 = unteres, 1 = mittleres, 2 = oberes Band einer 0..1-Koordinate.
const third = (t: number): 0 | 1 | 2 => (t < 1 / 3 ? 0 : t < 2 / 3 ? 1 : 2);

const axisComp = (v: THREE.Vector3, ax: number) => (ax === 0 ? v.x : ax === 1 ? v.y : v.z);
const axisMin = (b: THREE.Box3, ax: number) => (ax === 0 ? b.min.x : ax === 1 ? b.min.y : b.min.z);

/**
 * Lokaler Trefferpunkt → handover-Zone (einer der 8 Karosserie-Keys).
 * Erkennt Längs-/Querachse aus den bbox-Ausdehnungen (größte = Länge, mittlere
 * = Breite), bildet je in Drittel ab und wendet die Richtungs-Kalibrierung an.
 * Dach-Mitte (mittel/mittel) → auf die dominante Kante snappen.
 */
function pointToZone(p: THREE.Vector3, bbox: THREE.Box3): HandoverPosition {
  const size = new THREE.Vector3();
  bbox.getSize(size);
  const ranked = [
    [0, size.x],
    [1, size.y],
    [2, size.z],
  ].sort((a, b) => b[1] - a[1]); // größte Ausdehnung zuerst
  const longAxis = ranked[0][0]; // Länge  → vorne/hinten
  const latAxis = ranked[1][0]; // Breite → links/rechts

  const tLong = (axisComp(p, longAxis) - axisMin(bbox, longAxis)) / (ranked[0][1] || 1);
  const tLat = (axisComp(p, latAxis) - axisMin(bbox, latAxis)) / (ranked[1][1] || 1);

  const toFR = (b: 0 | 1 | 2): "front" | "mid" | "rear" =>
    b === 1 ? "mid" : (b === 2) === FRONT_AT_MAX ? "front" : "rear";
  const toLR = (b: 0 | 1 | 2): "left" | "mid" | "right" =>
    b === 1 ? "mid" : (b === 2) === LEFT_AT_MAX ? "left" : "right";

  let fr = toFR(third(tLong));
  let lr = toLR(third(tLat));

  // Dach-Mitte: nächste Kante. Achse mit größerer Abweichung von 0.5 gewinnt.
  if (fr === "mid" && lr === "mid") {
    if (Math.abs(tLong - 0.5) >= Math.abs(tLat - 0.5)) {
      fr = (tLong > 0.5) === FRONT_AT_MAX ? "front" : "rear";
    } else {
      lr = (tLat > 0.5) === LEFT_AT_MAX ? "left" : "right";
    }
  }

  if (fr === "front") return lr === "left" ? "front_left" : lr === "right" ? "front_right" : "front";
  if (fr === "rear") return lr === "left" ? "rear_left" : lr === "right" ? "rear_right" : "rear";
  return lr === "left" ? "left" : "right"; // fr === "mid" → reine Seite (mid/mid ist oben gesnappt)
}

function Model({ markers, onAdd }: { markers: Marker[]; onAdd: (m: Omit<Marker, "id">) => void }) {
  const { scene } = useGLTF(MODEL_URL);
  const camera = useThree((s) => s.camera);
  const gl = useThree((s) => s.gl);
  const [mesh, setMesh] = useState<THREE.Mesh | null>(null);
  const [bbox, setBbox] = useState<THREE.Box3 | null>(null);

  // Das (eine) Mesh + seine Geometrie-Bounding-Box einmal nach dem Laden holen.
  useEffect(() => {
    let found: THREE.Mesh | null = null;
    scene.traverse((o) => {
      if (!found && (o as THREE.Mesh).isMesh) found = o as THREE.Mesh;
    });
    if (found) {
      const m = found as THREE.Mesh;
      m.geometry.computeBoundingBox();
      // BVH einmalig bauen (lebt im useGLTF-Cache weiter) → Doppel-Tap-Raycast <1 ms.
      if (!m.geometry.boundsTree) m.geometry.computeBoundsTree();
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

  // Doppel-Tap → manueller Raycast → Marker. Mesh bleibt nicht-interaktiv
  // (kein r3f-Handler), darum stört das Drehen nicht und es gibt keinen
  // pointerdown-Raycast des großen Mesh. Listener sind passiv → OrbitControls
  // läuft normal weiter.
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
      const key = pointToZone(local, bbox);
      onAdd({ x: local.x, y: local.y, z: local.z, key, label: labelFor(key) });
    };

    const onDown = (e: PointerEvent) => {
      downX = e.clientX;
      downY = e.clientY;
    };
    const onUp = (e: PointerEvent) => {
      // War es ein Drag (Drehen)? Dann kein Tap und Doppel-Tap-Kette zurücksetzen.
      if (Math.hypot(e.clientX - downX, e.clientY - downY) > DRAG_PX) {
        lastT = 0;
        return;
      }
      const near = Math.hypot(e.clientX - lastX, e.clientY - lastY) < DBL_PX;
      if (e.timeStamp - lastT < DBL_MS && near) {
        lastT = 0;
        place(e.clientX, e.clientY); // zweiter Tap → Marker
      } else {
        lastT = e.timeStamp; // erster Tap
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
                    {m.id}. {m.label}
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

  // Stabil halten, damit der Doppel-Tap-Effect in Model nicht bei jedem Render
  // neu an-/abgehängt wird.
  const addMarker = useCallback(
    (m: Omit<Marker, "id">) => setMarkers((prev) => [...prev, { ...m, id: (idRef.current += 1) }]),
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
          flex: "0 1 240px",
          minWidth: 200,
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
          <strong>Doppel-Klick / Doppel-Tap</strong> aufs Auto setzt einen Marker. Einzelklick +
          Ziehen = drehen. In-Memory — nichts wird gespeichert.
        </p>
        {markers.length === 0 ? (
          <p style={{ fontSize: 13, color: "#9ca3af", marginTop: 4 }}>Noch keine Marker.</p>
        ) : (
          <ol style={{ margin: 0, paddingLeft: 0, listStyle: "none", fontSize: 13 }}>
            {markers.map((m) => (
              <li
                key={m.id}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  gap: 8,
                  padding: "6px 8px",
                  borderRadius: 6,
                  background: "#fafafa",
                  border: "1px solid #f0f0f0",
                  marginBottom: 4,
                }}
              >
                <span>
                  <span style={{ color: "#9ca3af" }}>{m.id}.</span> {m.label}
                </span>
                <code style={{ color: "#a1a1aa", fontSize: 11 }}>
                  {m.x.toFixed(2)}/{m.y.toFixed(2)}/{m.z.toFixed(2)}
                </code>
              </li>
            ))}
          </ol>
        )}
      </aside>
    </div>
  );
}

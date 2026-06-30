"use client";

// 3D-Viewer Schritt 2a+2b+2c (+ Weg A): GLB laden + drehen, DOPPEL-Tap setzt
// einen Marker, schlägt ein BENANNTES Bauteil vor und nimmt Schadenstyp +
// Schweregrad auf. ALLES In-Memory — keine DB, kein Speichern, kein Foto.
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
import { ChevronDown, ChevronRight, Trash2 } from "lucide-react";
import { POSITIONS } from "@/lib/handover";
import type { DamageSeverity, HandoverPosition } from "@/lib/types";
import { resolvePart, PART_OPTIONS, partLabelById } from "@/lib/vehicle-parts";
import { DAMAGE_TYPES, SEVERITY_OPTIONS, severityColor } from "@/lib/damage-types";
import { Button } from "@/components/ui/Button";

// BVH für schnelle Raycasts. Prototype-Patch ist Standard; acceleratedRaycast
// fällt für Geometrien ohne boundsTree automatisch auf den normalen Raycast zurück.
THREE.BufferGeometry.prototype.computeBoundsTree = computeBoundsTree;
THREE.BufferGeometry.prototype.disposeBoundsTree = disposeBoundsTree;
THREE.Mesh.prototype.raycast = acceleratedRaycast;

const MODEL_URL = "/vehicle-base.glb";

// ── KALIBRIERUNG (abgenommen — NICHT ändern) ──────────────────────────────
//   FRONT_AT_MAX / LEFT_AT_MAX → vorne/hinten/links/rechts korrekt.
//   TOP_AT_MAX                 → Höhe/Bauteile (live verifiziert).
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
  damageType: string | null; // Schadenstyp (Kratzer/Delle/…), null = nicht gewählt
  severity: DamageSeverity | null; // leicht/schwer, null = nicht eingestuft
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

// Anzeige-Helfer.
const markerLabel = (m: Marker): string => (m.partId ? partLabelById(m.partId) : m.zoneLabel);
const damageTypeLabel = (id: string | null): string =>
  DAMAGE_TYPES.find((t) => t.id === id)?.label ?? "— Typ wählen";
const severityLabel = (sev: DamageSeverity | null): string =>
  SEVERITY_OPTIONS.find((o) => o.value === sev)?.label ?? "— Grad —";

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

  // Doppel-Tap → manueller Raycast → Marker. Mesh bleibt nicht-interaktiv; Listener
  // passiv → OrbitControls unberührt.
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
        damageType: null,
        severity: null,
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
                  <meshBasicMaterial color={severityColor(m.severity)} />
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
  const [openId, setOpenId] = useState<number | null>(null); // nur EINER offen
  const idRef = useRef(0);

  const addMarker = useCallback((m: Omit<Marker, "id">) => {
    const id = (idRef.current += 1);
    setMarkers((prev) => [...prev, { ...m, id }]);
    setOpenId(id); // neuester Marker automatisch aufgeklappt
  }, []);
  const setPartId = useCallback(
    (id: number, partId: string | null) =>
      setMarkers((prev) => prev.map((m) => (m.id === id ? { ...m, partId } : m))),
    []
  );
  const setDamageType = useCallback(
    (id: number, damageType: string | null) =>
      setMarkers((prev) => prev.map((m) => (m.id === id ? { ...m, damageType } : m))),
    []
  );
  const setSeverity = useCallback(
    (id: number, severity: DamageSeverity | null) =>
      setMarkers((prev) => prev.map((m) => (m.id === id ? { ...m, severity } : m))),
    []
  );
  const toggleOpen = useCallback((id: number) => setOpenId((cur) => (cur === id ? null : id)), []);
  const removeMarker = useCallback((id: number) => {
    setMarkers((prev) => prev.filter((m) => m.id !== id));
    setOpenId((cur) => (cur === id ? null : cur));
  }, []);
  const clear = () => {
    setMarkers([]);
    setOpenId(null);
  };

  return (
    <div className="flex flex-wrap gap-4 items-stretch">
      <div className="flex-[1_1_460px] h-[70vh] min-h-[420px] rounded-card border border-hairline bg-canvas overflow-hidden">
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

      <aside className="flex-[0_1_320px] min-w-[260px] flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <strong className="text-[14px] text-ink">Marker ({markers.length})</strong>
          <Button variant="ghost" size="sm" onClick={clear} disabled={markers.length === 0}>
            Zurücksetzen
          </Button>
        </div>
        <p className="text-[12px] text-ink-muted m-0">
          <strong>Doppel-Klick / Doppel-Tap</strong> aufs Auto → Bauteil-Vorschlag. Zeile antippen zum
          Bearbeiten. Einzelklick + Ziehen = drehen. In-Memory — nichts wird gespeichert.
        </p>

        {markers.length === 0 ? (
          <p className="text-[13px] text-ink-muted mt-1">Noch keine Marker.</p>
        ) : (
          <ol className="m-0 p-0 list-none flex flex-col gap-1.5">
            {markers.map((m) => {
              const open = openId === m.id;
              return (
                <li
                  key={m.id}
                  className="rounded-panel border border-hairline bg-paper overflow-hidden"
                >
                  {/* Collapsed-Zeile (klickbar → auf/zu) */}
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={() => toggleOpen(m.id)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        toggleOpen(m.id);
                      }
                    }}
                    className="flex items-center gap-2 px-2.5 py-2 cursor-pointer hover:bg-ink/[0.03] text-[13px]"
                  >
                    {open ? (
                      <ChevronDown size={14} className="shrink-0 text-ink-muted" />
                    ) : (
                      <ChevronRight size={14} className="shrink-0 text-ink-muted" />
                    )}
                    <span
                      className="shrink-0 w-2 h-2 rounded-full"
                      style={{ background: severityColor(m.severity) }}
                      title={severityLabel(m.severity)}
                    />
                    <span className="flex-1 min-w-0 truncate">
                      <span className="text-ink-muted">{m.id}.</span>{" "}
                      <span className="text-ink">{markerLabel(m)}</span>
                      <span className="text-ink-muted">
                        {" · "}
                        {damageTypeLabel(m.damageType)}
                        {" · "}
                        {severityLabel(m.severity)}
                      </span>
                    </span>
                    <button
                      type="button"
                      title="Marker löschen"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeMarker(m.id);
                      }}
                      className="shrink-0 p-1 rounded-btn text-ink-muted hover:text-rose-600 hover:bg-rose-50 transition-colors"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>

                  {/* Expanded: Editierfelder + Diagnose */}
                  {open && (
                    <div className="px-2.5 pb-2.5 pt-1 flex flex-col gap-2 border-t border-hairline">
                      <div className="relative">
                        <select
                          className="field pr-9"
                          value={m.partId ?? ""}
                          onChange={(e) => setPartId(m.id, e.target.value || null)}
                        >
                          <option value="">— grobe Zone ({m.zoneLabel}) —</option>
                          {PART_OPTIONS.map((o) => (
                            <option key={o.id} value={o.id}>
                              {o.label}
                            </option>
                          ))}
                        </select>
                        <ChevronDown
                          size={16}
                          className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-ink-muted"
                        />
                      </div>

                      <div className="relative">
                        <select
                          className="field pr-9"
                          value={m.damageType ?? ""}
                          onChange={(e) => setDamageType(m.id, e.target.value || null)}
                        >
                          <option value="">Schadenstyp wählen</option>
                          {DAMAGE_TYPES.map((t) => (
                            <option key={t.id} value={t.id}>
                              {t.label}
                            </option>
                          ))}
                        </select>
                        <ChevronDown
                          size={16}
                          className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-ink-muted"
                        />
                      </div>

                      <div className="flex gap-1.5">
                        {SEVERITY_OPTIONS.map((o) => {
                          const active = m.severity === o.value;
                          return (
                            <button
                              key={o.value}
                              type="button"
                              onClick={() => setSeverity(m.id, active ? null : o.value)}
                              className="flex-1 h-9 rounded-btn text-[13px] font-medium transition-colors"
                              style={{
                                border: `1px solid ${o.color}`,
                                background: active ? o.color : "transparent",
                                color: active ? "#fff" : o.color,
                              }}
                            >
                              {o.label}
                            </button>
                          );
                        })}
                      </div>

                      <code className="text-[11px] text-ink-muted">
                        lon {m.lon.toFixed(2)} · lat {m.lat.toFixed(2)} · vert {m.vert.toFixed(2)}
                      </code>
                    </div>
                  )}
                </li>
              );
            })}
          </ol>
        )}
      </aside>
    </div>
  );
}

"use client";

// 3D-Viewer (controlled): GLB laden + drehen, Doppel-Tap setzt einen Marker und
// schlägt ein Bauteil vor; Schadenstyp + Schweregrad pro Marker. Der Viewer
// BESITZT die Marker NICHT mehr — er bekommt `markers` + `onAdd/onUpdate/onRemove`
// + `type` als Props (Persistenz/State liegt beim Eltern-Container: Handover-Tab
// oder Dev-Harness). openId (auf/zu) bleibt lokale Ansichts-State.
//
// Performance: Mesh ~304k Dreiecke → kein r3f-Handler am Mesh (sonst friert das
// Drehen ein); Marker-Raycast manuell beim Doppel-Tap, BVH-beschleunigt (<1 ms).
import {
  Component,
  type ReactNode,
  Suspense,
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
import type { DamageSeverity, HandoverPhotoType, HandoverPosition } from "@/lib/types";
import { resolvePart, PART_OPTIONS, partLabelById } from "@/lib/vehicle-parts";
import { DAMAGE_TYPES, SEVERITY_OPTIONS, severityColor } from "@/lib/damage-types";
import { Button } from "@/components/ui/Button";

// BVH für schnelle Raycasts. acceleratedRaycast fällt für Geometrien ohne
// boundsTree automatisch auf den normalen Raycast zurück.
THREE.BufferGeometry.prototype.computeBoundsTree = computeBoundsTree;
THREE.BufferGeometry.prototype.disposeBoundsTree = disposeBoundsTree;
THREE.Mesh.prototype.raycast = acceleratedRaycast;

const MODEL_URL = "/vehicle-base.glb";

// ── KALIBRIERUNG (abgenommen — NICHT ändern) ──────────────────────────────
const FRONT_AT_MAX = true;
const LEFT_AT_MAX = true;
const TOP_AT_MAX = true;

// Doppel-Tap-/Drag-Schwellen.
const DRAG_PX = 6;
const DBL_MS = 300;
const DBL_PX = 24;

// ── Öffentliche Typen (vom Eltern-Container genutzt) ───────────────────────
export type ViewerMarker = {
  id: string;
  x: number;
  y: number;
  z: number; // lokale Geometrie-Koordinaten → Sphere positionieren
  zone: string; // grobe Zone (handover-Key, z. B. "front_left")
  partId: string | null; // gewähltes/vorgeschlagenes Bauteil
  damageType: string | null; // Schadenstyp-Key (Kratzer/Delle/…)
  severity: DamageSeverity | null; // leicht/schwer
};
// Was ein neuer Marker beim Doppel-Tap liefert (id/severity/typ vergibt der Eltern-Container).
export type NewMarkerInput = { x: number; y: number; z: number; zone: string; partId: string | null };
export type MarkerPatch = {
  partId?: string | null;
  damageType?: string | null;
  severity?: DamageSeverity | null;
};

const TYPE_LABEL: Record<HandoverPhotoType, string> = { pickup: "Übergabe", return: "Rückgabe" };

const labelFor = (key: HandoverPosition): string =>
  POSITIONS.find((p) => p.key === key)?.label ?? key;

// Drittel: 0 = unteres, 1 = mittleres, 2 = oberes Band einer 0..1-Koordinate.
const third = (t: number): 0 | 1 | 2 => (t < 1 / 3 ? 0 : t < 2 / 3 ? 1 : 2);

const axisComp = (v: THREE.Vector3, ax: number) => (ax === 0 ? v.x : ax === 1 ? v.y : v.z);
const axisMin = (b: THREE.Box3, ax: number) => (ax === 0 ? b.min.x : ax === 1 ? b.min.y : b.min.z);

// Lokaler Trefferpunkt → kanonische Koordinate {lon,lat,vert} ∈ [0,1].
function toCanonical(p: THREE.Vector3, bbox: THREE.Box3): { lon: number; lat: number; vert: number } {
  const size = new THREE.Vector3();
  bbox.getSize(size);
  const ranked = [
    [0, size.x],
    [1, size.y],
    [2, size.z],
  ].sort((a, b) => b[1] - a[1]);
  const longAxis = ranked[0][0];
  const latAxis = ranked[1][0];
  const vertAxis = ranked[2][0];
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

/** Grobe handover-Zone (Fallback). UNVERÄNDERT seit der abgenommenen Kalibrierung. */
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
const markerLabel = (m: ViewerMarker): string =>
  m.partId ? partLabelById(m.partId) : labelFor(m.zone as HandoverPosition);
const damageTypeLabel = (id: string | null): string =>
  DAMAGE_TYPES.find((t) => t.id === id)?.label ?? "— Typ wählen";
const severityLabel = (sev: DamageSeverity | null): string =>
  SEVERITY_OPTIONS.find((o) => o.value === sev)?.label ?? "— Grad —";

function Model({ markers, onAdd }: { markers: ViewerMarker[]; onAdd: (m: NewMarkerInput) => void }) {
  const { scene } = useGLTF(MODEL_URL);
  const camera = useThree((s) => s.camera);
  const gl = useThree((s) => s.gl);
  const [mesh, setMesh] = useState<THREE.Mesh | null>(null);
  const [bbox, setBbox] = useState<THREE.Box3 | null>(null);

  useEffect(() => {
    let found: THREE.Mesh | null = null;
    scene.traverse((o) => {
      if (!found && (o as THREE.Mesh).isMesh) found = o as THREE.Mesh;
    });
    if (found) {
      const m = found as THREE.Mesh;
      m.geometry.computeBoundingBox();
      if (!m.geometry.boundsTree) m.geometry.computeBoundsTree();
      setMesh(m);
      setBbox(m.geometry.boundingBox!.clone());
    }
  }, [scene]);

  const radius = useMemo(() => {
    if (!bbox) return 0.012;
    const s = new THREE.Vector3();
    bbox.getSize(s);
    return s.length() * 0.012;
  }, [bbox]);

  // Doppel-Tap → manueller Raycast → onAdd(payload). Mesh nicht-interaktiv;
  // Listener passiv → OrbitControls unberührt.
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
      const hits = raycaster.intersectObject(mesh, false);
      if (!hits.length) return;
      const local = mesh.worldToLocal(hits[0].point.clone());
      const canon = toCanonical(local, bbox);
      onAdd({
        x: local.x,
        y: local.y,
        z: local.z,
        zone: pointToZone(local, bbox),
        partId: resolvePart(canon)?.partId ?? null,
      });
    };

    const onDown = (e: PointerEvent) => {
      downX = e.clientX;
      downY = e.clientY;
    };
    const onUp = (e: PointerEvent) => {
      if (Math.hypot(e.clientX - downX, e.clientY - downY) > DRAG_PX) {
        lastT = 0;
        return;
      }
      const near = Math.hypot(e.clientX - lastX, e.clientY - lastY) < DBL_PX;
      if (e.timeStamp - lastT < DBL_MS && near) {
        lastT = 0;
        place(e.clientX, e.clientY);
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
      <primitive object={scene} />
      {mesh &&
        createPortal(
          <>
            {markers.map((m, i) => (
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
                    {i + 1}. {markerLabel(m)}
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

export default function VehicleViewer3D({
  markers,
  type,
  onAdd,
  onUpdate,
  onRemove,
  onClear,
}: {
  markers: ViewerMarker[];
  type: HandoverPhotoType;
  onAdd: (m: NewMarkerInput) => void;
  onUpdate: (id: string, patch: MarkerPatch) => void;
  onRemove: (id: string) => void;
  onClear?: () => void;
}) {
  const [openId, setOpenId] = useState<string | null>(null);

  // Neuesten Marker automatisch aufklappen (wenn die Liste wächst).
  const prevLen = useRef(markers.length);
  useEffect(() => {
    if (markers.length > prevLen.current) setOpenId(markers[markers.length - 1].id);
    prevLen.current = markers.length;
  }, [markers]);

  const toggleOpen = (id: string) => setOpenId((cur) => (cur === id ? null : id));

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
                <Model markers={markers} onAdd={onAdd} />
              </Center>
            </Suspense>
            <OrbitControls makeDefault enableDamping />
          </Canvas>
        </ViewerErrorBoundary>
      </div>

      <aside className="flex-[0_1_320px] min-w-[260px] flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <strong className="text-[14px] text-ink">
            Marker · {TYPE_LABEL[type]} ({markers.length})
          </strong>
          {onClear && (
            <Button variant="ghost" size="sm" onClick={onClear} disabled={markers.length === 0}>
              Zurücksetzen
            </Button>
          )}
        </div>
        <p className="text-[12px] text-ink-muted m-0">
          <strong>Doppel-Klick / Doppel-Tap</strong> aufs Auto → Bauteil-Vorschlag. Zeile antippen zum
          Bearbeiten. Einzelklick + Ziehen = drehen.
        </p>

        {markers.length === 0 ? (
          <p className="text-[13px] text-ink-muted mt-1">Noch keine Marker.</p>
        ) : (
          <ol className="m-0 p-0 list-none flex flex-col gap-1.5">
            {markers.map((m, idx) => {
              const open = openId === m.id;
              return (
                <li
                  key={m.id}
                  className="rounded-panel border border-hairline bg-paper overflow-hidden"
                >
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
                      <span className="text-ink-muted">{idx + 1}.</span>{" "}
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
                        onRemove(m.id);
                        setOpenId((cur) => (cur === m.id ? null : cur));
                      }}
                      className="shrink-0 p-1 rounded-btn text-ink-muted hover:text-rose-600 hover:bg-rose-50 transition-colors"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>

                  {open && (
                    <div className="px-2.5 pb-2.5 pt-1 flex flex-col gap-2 border-t border-hairline">
                      <div className="relative">
                        <select
                          className="field pr-9"
                          value={m.partId ?? ""}
                          onChange={(e) => onUpdate(m.id, { partId: e.target.value || null })}
                        >
                          <option value="">— grobe Zone ({labelFor(m.zone as HandoverPosition)}) —</option>
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
                          onChange={(e) => onUpdate(m.id, { damageType: e.target.value || null })}
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
                              onClick={() => onUpdate(m.id, { severity: active ? null : o.value })}
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

"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowLeft,
  Camera,
  CheckCircle2,
  Loader2,
  ScanSearch,
  Trash2,
  X,
} from "lucide-react";
import { POSITIONS, SEVERITY_STYLE } from "@/lib/handover";
import type { CompareResultMap } from "@/lib/handover";
import type {
  DamageSeverity,
  HandoverPhoto,
  HandoverPhotoType,
  HandoverPosition,
} from "@/lib/types";
import { ProtocolPanel, type ProtocolPrefill } from "./ProtocolPanel";
import dynamic from "next/dynamic";
import type { ViewerMarker, NewMarkerInput, MarkerPatch } from "@/components/damage/VehicleViewer3D";

// 3D-Viewer client-only laden (3D-Bundle belastet nur diesen Tab, kein SSR).
const VehicleViewer3D = dynamic(() => import("@/components/damage/VehicleViewer3D"), {
  ssr: false,
  loading: () => (
    <div className="h-[70vh] min-h-[420px] rounded-card border border-hairline bg-canvas flex items-center justify-center text-[13px] text-ink-muted">
      Lädt 3D-Viewer…
    </div>
  ),
});

// Marker mit Tab-Zuordnung (pickup/return) — wie sie die Seite lädt + der State hält.
export type HandoverMarker = ViewerMarker & { type: HandoverPhotoType };

// API-Zeile (snake_case) → Viewer-Marker (camelCase) + type.
type MarkerRow = {
  id: string;
  type: string;
  zone: string;
  part_id: string | null;
  x: number;
  y: number;
  z: number;
  damage_type: string | null;
  severity: string | null;
};
const rowToMarker = (r: MarkerRow): HandoverMarker => ({
  id: r.id,
  type: r.type as HandoverPhotoType,
  zone: r.zone,
  partId: r.part_id,
  x: r.x,
  y: r.y,
  z: r.z,
  damageType: r.damage_type,
  severity: r.severity as DamageSeverity | null,
});

type PhotoWithUrl = HandoverPhoto & { url: string | null };

type ProtocolPrefillByType = Record<HandoverPhotoType, ProtocolPrefill>;

const fmtComparedAt = (iso: string): string =>
  new Date(iso).toLocaleString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

// Persistierte Map (JSONB) defensiv in unsere Form bringen.
const coerceComparison = (raw: unknown): CompareResultMap =>
  raw && typeof raw === "object" ? (raw as CompareResultMap) : {};

export const HandoverClient = ({
  contractId,
  contractNr,
  plate,
  renterName,
  initialTab,
  initialPhotos,
  initialMarkers,
  initialComparison,
  comparisonAt,
  customerEmail,
  protocolPrefill,
}: {
  contractId: string;
  contractNr: string;
  plate: string;
  renterName: string;
  initialTab: HandoverPhotoType;
  initialPhotos: PhotoWithUrl[];
  initialMarkers: HandoverMarker[];
  initialComparison: unknown;
  comparisonAt: string | null;
  customerEmail: string | null;
  protocolPrefill: ProtocolPrefillByType;
}) => {
  const router = useRouter();
  const [tab, setTab] = useState<HandoverPhotoType>(initialTab);
  const [photos, setPhotos] = useState<PhotoWithUrl[]>(initialPhotos);
  const [uploading, setUploading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [comparing, setComparing] = useState(false);
  // Aus dem persistierten Vergleich initialisieren — Ergebnis ist sofort
  // sichtbar, ohne erneut Tokens zu verbrennen.
  const [results, setResults] = useState<CompareResultMap>(() =>
    coerceComparison(initialComparison)
  );
  const [comparedAt, setComparedAt] = useState<string | null>(comparisonAt);
  const [dragOverKey, setDragOverKey] = useState<string | null>(null);
  const fileRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const autoRunRef = useRef(false);
  const [markers, setMarkers] = useState<HandoverMarker[]>(initialMarkers);
  const markersForTab = markers.filter((m) => m.type === tab);

  const photoFor = (type: HandoverPhotoType, position: HandoverPosition) =>
    photos.find((p) => p.type === type && p.position === position);

  const counts = {
    pickup: photos.filter((p) => p.type === "pickup").length,
    return: photos.filter((p) => p.type === "return").length,
  };

  const upload = async (type: HandoverPhotoType, position: HandoverPosition, file: File) => {
    const key = `${type}-${position}`;
    setUploading(key);
    setError(null);
    const fd = new FormData();
    fd.append("file", file);
    fd.append("type", type);
    fd.append("position", position);
    const res = await fetch(`/api/contracts/${contractId}/handover`, {
      method: "POST",
      body: fd,
    });
    setUploading(null);
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setError(j.error || "Upload fehlgeschlagen");
      return;
    }
    router.refresh();
    // Server-Refresh aktualisiert initialPhotos via Page-Reload — bis dahin lokal mergen
    const j = (await res.json()) as { photo: HandoverPhoto };
    // Wir haben die URL noch nicht — Page-Refresh rekrtiert; lokal optimistisch:
    setPhotos((prev) => {
      const filtered = prev.filter((p) => !(p.type === type && p.position === position));
      return [...filtered, { ...j.photo, url: URL.createObjectURL(file) }];
    });
    setResults((prev) => {
      const next = { ...prev };
      delete next[position];
      return next;
    });
  };

  const remove = async (photo: PhotoWithUrl) => {
    if (!confirm("Foto wirklich löschen?")) return;
    const res = await fetch(`/api/contracts/${contractId}/handover/${photo.id}`, {
      method: "DELETE",
    });
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setError(j.error || "Löschen fehlgeschlagen");
      return;
    }
    setPhotos((prev) => prev.filter((p) => p.id !== photo.id));
    setResults((prev) => {
      const next = { ...prev };
      delete next[photo.position];
      return next;
    });
    router.refresh();
  };

  const compareAll = async () => {
    setComparing(true);
    setError(null);
    const res = await fetch(`/api/contracts/${contractId}/compare-photos`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    setComparing(false);
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setError(j.error || "Vergleich fehlgeschlagen");
      return;
    }
    const j = (await res.json()) as { results: CompareResultMap };
    setResults(j.results);
    setComparedAt(new Date().toISOString());
  };

  const compareOne = async (position: HandoverPosition) => {
    setComparing(true);
    setError(null);
    const res = await fetch(`/api/contracts/${contractId}/compare-photos`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ position }),
    });
    setComparing(false);
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setError(j.error || "Vergleich fehlgeschlagen");
      return;
    }
    const j = (await res.json()) as { results: CompareResultMap };
    setResults((prev) => ({ ...prev, ...j.results }));
    setComparedAt(new Date().toISOString());
  };

  // ── 3D-Schadensmarker (eigene Tabelle, getrennt vom KI-Foto-Vergleich) ──
  // Create pessimistisch (Server vergibt die UUID), Update optimistisch (snappy
  // Dropdowns/Buttons, Rollback bei Fehler), Delete pessimistisch.
  const addMarker = async (input: NewMarkerInput) => {
    setError(null);
    const res = await fetch(`/api/contracts/${contractId}/damage-markers`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: tab,
        zone: input.zone,
        part_id: input.partId,
        x: input.x,
        y: input.y,
        z: input.z,
      }),
    });
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setError(j.error || "Marker speichern fehlgeschlagen");
      return;
    }
    const { marker } = (await res.json()) as { marker: MarkerRow };
    setMarkers((prev) => [...prev, rowToMarker(marker)]);
  };

  const updateMarker = async (id: string, patch: MarkerPatch) => {
    setError(null);
    // Rollback NUR für die hier gepatchten Felder — ein Ganz-Marker-Snapshot
    // würde bei parallelen PATCHes (z. B. Typ + Grad schnell nacheinander) die
    // erfolgreiche andere Änderung mit zurückrollen.
    const target = markers.find((m) => m.id === id);
    const rollback = target
      ? (Object.fromEntries(
          (Object.keys(patch) as (keyof MarkerPatch)[]).map((k) => [k, target[k]])
        ) as MarkerPatch)
      : null;
    setMarkers((prev) => prev.map((m) => (m.id === id ? { ...m, ...patch } : m)));
    const body: Record<string, unknown> = {};
    if ("partId" in patch) body.part_id = patch.partId;
    if ("damageType" in patch) body.damage_type = patch.damageType;
    if ("severity" in patch) body.severity = patch.severity;
    const res = await fetch(`/api/contracts/${contractId}/damage-markers/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setError(j.error || "Marker aktualisieren fehlgeschlagen");
      if (rollback) setMarkers((prev) => prev.map((m) => (m.id === id ? { ...m, ...rollback } : m)));
    }
  };

  const removeMarker = async (id: string) => {
    setError(null);
    const res = await fetch(`/api/contracts/${contractId}/damage-markers/${id}`, {
      method: "DELETE",
    });
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setError(j.error || "Marker löschen fehlgeschlagen");
      return;
    }
    setMarkers((prev) => prev.filter((m) => m.id !== id));
  };

  const completePairs = POSITIONS.filter(
    (p) => photoFor("pickup", p.key) && photoFor("return", p.key)
  ).length;

  // Auto-Run genau einmal beim Mount: nur wenn Rücknahme-Fotos existieren UND
  // noch kein persistierter Vergleich vorliegt. Bereits ausgewertete Verträge
  // laufen NICHT erneut (spart Tokens) — manuelles "neu auswerten" bleibt.
  useEffect(() => {
    if (autoRunRef.current) return;
    autoRunRef.current = true;
    const hasReturnPhotos = initialPhotos.some((p) => p.type === "return");
    if (hasReturnPhotos && !comparisonAt) {
      void compareAll();
    }
    // Absichtlich nur beim Mount — Abhängigkeiten bewusst leer.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <>
      <Link
        href={`/dashboard/contracts/${contractId}`}
        className="inline-flex items-center gap-1.5 text-[13px] text-ink-muted hover:text-ink mb-4"
      >
        <ArrowLeft size={14} /> Zurück zum Vertrag
      </Link>

      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <div className="kicker text-ink-muted mb-2 font-mono">
            {contractNr} · {plate}
          </div>
          <h1 className="font-display font-extrabold text-ink text-[26px] sm:text-[30px] leading-[1.05] tracking-tightest">
            {tab === "return" ? "Rückgabe" : "Übergabe"}
          </h1>
          <p className="text-[14px] text-ink-muted mt-1.5">
            Fotos (10 Positionen), Protokoll &amp; Schäden je Übergabe und Rücknahme. Vergleich
            erkennt neue Schäden via Software.
          </p>
        </div>
        <div className="text-right font-mono text-[12px] text-ink-muted">
          <div>{renterName}</div>
        </div>
      </div>

      <div className="mt-6 inline-flex items-center bg-canvas border border-hairline rounded-btn p-1">
        <TabButton
          active={tab === "pickup"}
          onClick={() => setTab("pickup")}
          label="Übergabe"
          count={counts.pickup}
        />
        <TabButton
          active={tab === "return"}
          onClick={() => setTab("return")}
          label="Rücknahme"
          count={counts.return}
        />
      </div>

      <div className="mt-6 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {POSITIONS.map((p) => {
          const photo = photoFor(tab, p.key);
          const key = `${tab}-${p.key}`;
          const isUploading = uploading === key;
          const result = results[p.key];
          const showResult = tab === "return" && result?.ok;
          const sev = showResult ? result.data.severity : null;
          const sevStyle =
            sev && sev in SEVERITY_STYLE
              ? SEVERITY_STYLE[sev as keyof typeof SEVERITY_STYLE]
              : null;

          return (
            <div
              key={p.key}
              className="bg-paper border border-hairline rounded-card overflow-hidden shadow-panel"
            >
              <div className="aspect-[4/3] bg-canvas relative">
                {photo?.url ? (
                  <>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={photo.url} alt={p.label} className="w-full h-full object-cover" />
                    <button
                      onClick={() => photo && remove(photo)}
                      className="absolute top-1.5 right-1.5 w-7 h-7 rounded-full bg-paper/90 backdrop-blur text-ink-soft hover:text-red-600 flex items-center justify-center border border-hairline"
                      title="Foto löschen"
                    >
                      <Trash2 size={13} />
                    </button>
                    {sevStyle && (
                      <div
                        className="absolute bottom-1.5 left-1.5 right-1.5 px-2 py-1 rounded-frame text-[11px] font-mono font-medium flex items-center gap-1.5"
                        style={{
                          background: sevStyle.bg,
                          color: sevStyle.text,
                          boxShadow: `inset 0 0 0 1px ${sevStyle.ring}`,
                        }}
                      >
                        <span
                          className="w-1.5 h-1.5 rounded-full shrink-0"
                          style={{ background: sevStyle.color }}
                        />
                        <span className="truncate">{sevStyle.label}</span>
                      </div>
                    )}
                  </>
                ) : (
                  <button
                    onClick={() => fileRefs.current[key]?.click()}
                    onDragOver={(e) => {
                      e.preventDefault();
                      if (!isUploading) setDragOverKey(key);
                    }}
                    onDragLeave={() => setDragOverKey((k) => (k === key ? null : k))}
                    onDrop={(e) => {
                      e.preventDefault();
                      setDragOverKey((k) => (k === key ? null : k));
                      if (isUploading) return;
                      const f = e.dataTransfer.files?.[0];
                      if (f) upload(tab, p.key, f);
                    }}
                    className={`absolute inset-0 flex flex-col items-center justify-center gap-2 transition ${
                      dragOverKey === key
                        ? "text-signal bg-signal/5 ring-2 ring-inset ring-signal/50"
                        : "text-ink-muted hover:text-ink hover:bg-canvas/60"
                    }`}
                    disabled={isUploading}
                  >
                    {isUploading ? (
                      <Loader2 size={20} className="animate-spin" />
                    ) : (
                      <Camera size={22} />
                    )}
                    <span className="text-[11px] font-medium">
                      {isUploading ? "Lade hoch…" : "Foto aufnehmen"}
                    </span>
                    {!isUploading && (
                      <span className="text-[10px] text-ink-muted">oder Datei hierher ziehen</span>
                    )}
                  </button>
                )}
                <input
                  ref={(el) => {
                    fileRefs.current[key] = el;
                  }}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) upload(tab, p.key, f);
                    if (fileRefs.current[key]) fileRefs.current[key]!.value = "";
                  }}
                />
              </div>
              <div className="px-3 py-2.5 flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <div className="text-[13px] font-medium text-ink truncate">{p.label}</div>
                  <div className="text-[11px] text-ink-muted truncate">{p.hint}</div>
                </div>
                {photo && tab === "pickup" && photoFor("return", p.key) && !result && (
                  <button
                    onClick={() => compareOne(p.key)}
                    disabled={comparing}
                    className="text-[11.5px] inline-flex items-center gap-1 text-ink-soft hover:text-ink hover:bg-canvas px-2 py-1 rounded-btn border border-hairline transition-colors"
                    title="Diese Position vergleichen"
                  >
                    <ScanSearch size={12} /> Vergl.
                  </button>
                )}
                {tab === "return" && result && !result.ok && (
                  <span className="text-[10px] text-ink-muted" title={result.error}>
                    nicht möglich
                  </span>
                )}
              </div>
              {showResult && result.ok && result.data.description && (
                <div
                  className="border-t border-hairline px-3 py-2 text-[11px] font-mono"
                  style={{ borderColor: sevStyle?.ring, color: sevStyle?.text }}
                >
                  {result.data.description}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {error && (
        <div className="mt-4 text-[13px] text-red-700 bg-red-50 border border-red-200 rounded-panel px-3 py-2 inline-flex items-center gap-2">
          <AlertTriangle size={14} /> {error}
          <button onClick={() => setError(null)} className="ml-2 opacity-70 hover:opacity-100">
            <X size={12} />
          </button>
        </div>
      )}

      <div className="mt-6 flex items-center justify-between flex-wrap gap-3">
        <div className="font-mono text-[12px] text-ink-muted">
          {completePairs} {completePairs === 1 ? "Position" : "Positionen"} mit Vorher- und Nachher-Foto
        </div>
        <button
          onClick={compareAll}
          disabled={comparing || completePairs === 0}
          className="inline-flex items-center gap-1.5 bg-signal text-white text-[13px] px-4 h-9 rounded-btn font-medium shadow-signal hover:bg-signal-strong disabled:opacity-50 transition-colors"
        >
          {comparing ? <Loader2 size={14} className="animate-spin" /> : <ScanSearch size={14} />}
          {comparedAt ? "Neu auswerten" : "Alle Positionen vergleichen"}
        </button>
      </div>

      {Object.keys(results).length > 0 && (
        <ResultSummary results={results} comparedAt={comparedAt} />
      )}

      <div className="mt-8">
        <div className="data-label text-ink-muted mb-3">
          3D-Schadensmarker · {tab === "pickup" ? "Übergabe" : "Rücknahme"}
        </div>
        <VehicleViewer3D
          key={tab}
          markers={markersForTab}
          type={tab}
          onAdd={addMarker}
          onUpdate={updateMarker}
          onRemove={removeMarker}
        />
      </div>

      <ProtocolPanel
        key={tab}
        contractId={contractId}
        type={tab}
        prefill={protocolPrefill[tab]}
        customerEmail={customerEmail}
      />
    </>
  );
};

const TabButton = ({
  active,
  onClick,
  label,
  count,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  count: number;
}) => (
  <button
    onClick={onClick}
    className={`px-4 h-8 rounded-btn text-[13px] font-medium transition-colors ${
      active ? "bg-ink text-white" : "text-ink-soft hover:bg-ink/5"
    }`}
  >
    {label}
    <span
      className={`ml-2 text-[10px] font-mono px-1.5 py-0.5 rounded-full ${
        active ? "text-white/60" : "text-ink-muted"
      }`}
    >
      {count}/10
    </span>
  </button>
);

const ResultSummary = ({
  results,
  comparedAt,
}: {
  results: CompareResultMap;
  comparedAt: string | null;
}) => {
  const counts = { none: 0, minor: 0, major: 0 };
  Object.values(results).forEach((r) => {
    if (r.ok && r.data.severity in counts) {
      counts[r.data.severity as keyof typeof counts] += 1;
    }
  });
  const total = counts.none + counts.minor + counts.major;
  if (total === 0) return null;

  return (
    <div className="mt-4 panel p-4">
      <div className="data-label text-ink-muted mb-2 flex items-center justify-between gap-2">
        <span className="flex items-center gap-1.5">
          <CheckCircle2 size={12} /> Vergleichs-Ergebnis
        </span>
        {comparedAt && (
          <span className="font-mono text-[11px] font-normal normal-case tracking-normal">
            {fmtComparedAt(comparedAt)}
          </span>
        )}
      </div>
      <div className="flex items-center gap-3 flex-wrap">
        <Pill style={SEVERITY_STYLE.none} count={counts.none} label="Kein Schaden" />
        <Pill style={SEVERITY_STYLE.minor} count={counts.minor} label="Leicht" />
        <Pill style={SEVERITY_STYLE.major} count={counts.major} label="Schwer" />
      </div>
    </div>
  );
};

const Pill = ({
  style,
  count,
  label,
}: {
  style: (typeof SEVERITY_STYLE)["none"];
  count: number;
  label: string;
}) => (
  <span
    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium"
    style={{ background: style.bg, color: style.text, boxShadow: `inset 0 0 0 1px ${style.ring}` }}
  >
    <span className="w-1.5 h-1.5 rounded-full" style={{ background: style.color }} />
    {count} {label}
  </span>
);

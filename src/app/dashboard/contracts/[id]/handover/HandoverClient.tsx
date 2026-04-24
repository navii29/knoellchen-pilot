"use client";

import { useRef, useState } from "react";
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
import { THEME } from "@/lib/theme";
import { POSITIONS, SEVERITY_STYLE } from "@/lib/handover";
import type {
  DamageComparisonResult,
  HandoverPhoto,
  HandoverPhotoType,
  HandoverPosition,
} from "@/lib/types";

type PhotoWithUrl = HandoverPhoto & { url: string | null };

type CompareResultMap = Record<
  string,
  | { ok: true; data: DamageComparisonResult }
  | { ok: false; error: string }
>;

export const HandoverClient = ({
  contractId,
  contractNr,
  plate,
  renterName,
  initialPhotos,
}: {
  contractId: string;
  contractNr: string;
  plate: string;
  renterName: string;
  initialPhotos: PhotoWithUrl[];
}) => {
  const router = useRouter();
  const [tab, setTab] = useState<HandoverPhotoType>("pickup");
  const [photos, setPhotos] = useState<PhotoWithUrl[]>(initialPhotos);
  const [uploading, setUploading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [comparing, setComparing] = useState(false);
  const [results, setResults] = useState<CompareResultMap>({});
  const fileRefs = useRef<Record<string, HTMLInputElement | null>>({});

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
  };

  const completePairs = POSITIONS.filter(
    (p) => photoFor("pickup", p.key) && photoFor("return", p.key)
  ).length;

  return (
    <>
      <Link
        href={`/dashboard/contracts/${contractId}`}
        className="inline-flex items-center gap-1.5 text-sm text-stone-500 hover:text-stone-900 mb-4"
      >
        <ArrowLeft size={14} /> Zurück zum Vertrag
      </Link>

      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <div className="text-xs text-stone-500 mb-1 font-mono">
            {contractNr} · {plate}
          </div>
          <h1 className="font-display font-bold text-2xl tracking-tight">Übergabe-Fotos</h1>
          <p className="text-sm text-stone-500 mt-1">
            10 Positionen pro Übergabe und Rücknahme. Vergleich erkennt neue Schäden via Claude Vision.
          </p>
        </div>
        <div className="text-right text-xs text-stone-500">
          <div className="font-mono">{renterName}</div>
        </div>
      </div>

      <div className="mt-6 inline-flex items-center bg-stone-100 rounded-lg p-1">
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
          const sevStyle = sev ? SEVERITY_STYLE[sev] : null;

          return (
            <div
              key={p.key}
              className="rounded-xl bg-white ring-1 ring-stone-200 overflow-hidden"
            >
              <div className="aspect-[4/3] bg-stone-100 relative">
                {photo?.url ? (
                  <>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={photo.url} alt={p.label} className="w-full h-full object-cover" />
                    <button
                      onClick={() => photo && remove(photo)}
                      className="absolute top-1.5 right-1.5 w-7 h-7 rounded-full bg-white/90 backdrop-blur text-stone-700 hover:text-red-600 flex items-center justify-center shadow"
                      title="Foto löschen"
                    >
                      <Trash2 size={13} />
                    </button>
                    {sevStyle && (
                      <div
                        className="absolute bottom-1.5 left-1.5 right-1.5 px-2 py-1 rounded text-[11px] font-medium flex items-center gap-1.5"
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
                    className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-stone-400 hover:text-teal-700 hover:bg-teal-50/40 transition"
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
                  <div className="text-sm font-medium text-stone-900 truncate">{p.label}</div>
                  <div className="text-[11px] text-stone-500 truncate">{p.hint}</div>
                </div>
                {photo && tab === "pickup" && photoFor("return", p.key) && !result && (
                  <button
                    onClick={() => compareOne(p.key)}
                    disabled={comparing}
                    className="text-xs inline-flex items-center gap-1 text-teal-700 hover:bg-teal-50 px-2 py-1 rounded"
                    title="Diese Position vergleichen"
                  >
                    <ScanSearch size={12} /> Vergl.
                  </button>
                )}
                {tab === "return" && result && !result.ok && (
                  <span className="text-[10px] text-stone-400" title={result.error}>
                    nicht möglich
                  </span>
                )}
              </div>
              {showResult && result.ok && result.data.description && (
                <div
                  className="border-t px-3 py-2 text-[11px]"
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
        <div className="mt-4 text-sm text-red-700 bg-red-50 ring-1 ring-red-200 rounded-lg px-3 py-2 inline-flex items-center gap-2">
          <AlertTriangle size={14} /> {error}
          <button onClick={() => setError(null)} className="ml-2 opacity-70 hover:opacity-100">
            <X size={12} />
          </button>
        </div>
      )}

      <div className="mt-6 flex items-center justify-between flex-wrap gap-3">
        <div className="text-xs text-stone-500">
          {completePairs} {completePairs === 1 ? "Position" : "Positionen"} mit Vorher- und Nachher-Foto
        </div>
        <button
          onClick={compareAll}
          disabled={comparing || completePairs === 0}
          className="inline-flex items-center gap-1.5 text-white text-sm px-4 py-2 rounded-lg font-medium disabled:opacity-50"
          style={{ background: THEME.primary }}
        >
          {comparing ? <Loader2 size={14} className="animate-spin" /> : <ScanSearch size={14} />}
          Alle Positionen vergleichen
        </button>
      </div>

      {Object.keys(results).length > 0 && (
        <ResultSummary results={results} />
      )}
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
    className={`px-4 py-1.5 rounded-md text-sm font-medium transition ${
      active ? "bg-white text-stone-900 shadow-sm" : "text-stone-600 hover:text-stone-900"
    }`}
  >
    {label}
    <span
      className={`ml-2 text-[10px] font-mono px-1.5 py-0.5 rounded ${
        active ? "bg-stone-100 text-stone-600" : "bg-stone-200 text-stone-500"
      }`}
    >
      {count}/10
    </span>
  </button>
);

const ResultSummary = ({ results }: { results: CompareResultMap }) => {
  const counts = { none: 0, minor: 0, major: 0 };
  Object.values(results).forEach((r) => {
    if (r.ok) counts[r.data.severity] += 1;
  });
  const total = counts.none + counts.minor + counts.major;
  if (total === 0) return null;

  return (
    <div className="mt-4 rounded-xl bg-white ring-1 ring-stone-200 p-4">
      <div className="text-[11px] uppercase tracking-wider text-stone-500 font-semibold mb-2 flex items-center gap-1.5">
        <CheckCircle2 size={12} /> Vergleichs-Ergebnis
      </div>
      <div className="flex items-center gap-3 text-sm flex-wrap">
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

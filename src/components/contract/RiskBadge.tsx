"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, ShieldCheck } from "lucide-react";
import { Panel, PanelHeader } from "@/components/ui/Panel";
import { Button } from "@/components/ui/Button";
import type { RiskFactor } from "@/lib/risk";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type RiskLevel = "gruen" | "gelb" | "rot";

type Props = {
  contractId: string;
  risk_level: string | null;
  risk_score: number | null;
  risk_summary: string | null;
  risk_factors: unknown;
  risk_checked_at: string | null;
  risk_override_at: string | null;
  risk_override_reason: string | null;
};

// ---------------------------------------------------------------------------
// Ampel colour tokens
// ---------------------------------------------------------------------------

const LEVEL_META: Record<
  RiskLevel,
  { label: string; dot: string; soft: string; ink: string; ring: string }
> = {
  gruen: {
    label: "Geringes Risiko",
    dot: "#16a34a",
    soft: "#f0fdf4",
    ink: "#15803d",
    ring: "#bbf7d0",
  },
  gelb: {
    label: "Erhöhtes Risiko",
    dot: "#ca8a04",
    soft: "#fefce8",
    ink: "#a16207",
    ring: "#fde68a",
  },
  rot: {
    label: "Hohes Risiko",
    dot: "#dc2626",
    soft: "#fef2f2",
    ink: "#b91c1c",
    ring: "#fecaca",
  },
};

const SEVERITY_DOT: Record<RiskFactor["severity"], string> = {
  info:  "#6b7280",
  warn:  "#ca8a04",
  alarm: "#dc2626",
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function parseFactors(raw: unknown): RiskFactor[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter(
    (x): x is RiskFactor =>
      x !== null &&
      typeof x === "object" &&
      typeof (x as Record<string, unknown>)["label"] === "string"
  );
}

function fmtDateTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// ---------------------------------------------------------------------------
// RiskBadge
// ---------------------------------------------------------------------------

export const RiskBadge = ({
  contractId,
  risk_level,
  risk_score,
  risk_summary,
  risk_factors,
  risk_checked_at,
  risk_override_at,
  risk_override_reason,
}: Props) => {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showOverrideForm, setShowOverrideForm] = useState(false);
  const [overrideReason, setOverrideReason] = useState("");

  const factors = parseFactors(risk_factors);
  const level = (risk_level as RiskLevel | null) ?? null;
  const meta = level ? LEVEL_META[level] : null;

  const endpoint = `/api/contracts/${contractId}/risk-check`;

  const runCheck = async () => {
    setError(null);
    setBusy(true);
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ consent: true }),
    });
    setBusy(false);
    if (!res.ok) {
      const j = await res.json().catch(() => ({})) as { error?: string };
      setError(j.error ?? "Risikoprüfung fehlgeschlagen.");
      return;
    }
    router.refresh();
  };

  const submitOverride = async () => {
    if (!overrideReason.trim()) {
      setError("Bitte eine Begründung eingeben.");
      return;
    }
    setError(null);
    setBusy(true);
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "override", reason: overrideReason.trim() }),
    });
    setBusy(false);
    if (!res.ok) {
      const j = await res.json().catch(() => ({})) as { error?: string };
      setError(j.error ?? "Freigabe fehlgeschlagen.");
      return;
    }
    setShowOverrideForm(false);
    router.refresh();
  };

  return (
    <Panel flush>
      <PanelHeader Icon={ShieldCheck} title="Risikoprüfung" />
      <div className="p-5 space-y-4">

        {/* ── Not yet checked ── */}
        {!risk_checked_at ? (
          <div className="space-y-3">
            <p className="text-[13px] text-ink-muted">Noch nicht geprüft.</p>
            <div>
              <Button
                type="button"
                variant="signal"
                size="sm"
                disabled={busy}
                onClick={runCheck}
              >
                {busy && <Loader2 size={13} className="animate-spin" />}
                Risikoprüfung starten
              </Button>
              <p className="mt-1.5 text-[11.5px] text-ink-muted">
                Nur mit Einwilligung des Mieters.
              </p>
            </div>
          </div>
        ) : (
          <>
            {/* ── Ampel pill ── */}
            {meta && (
              <div
                className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-[13px] font-medium"
                style={{
                  background: meta.soft,
                  color: meta.ink,
                  boxShadow: `inset 0 0 0 1px ${meta.ring}`,
                }}
              >
                <span
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ background: meta.dot }}
                />
                {meta.label}
                {risk_score != null && (
                  <span className="font-mono text-[12px] opacity-80 ml-1">
                    Score {risk_score}/100
                  </span>
                )}
              </div>
            )}

            {/* ── Summary ── */}
            {risk_summary && (
              <p className="text-[13px] text-ink">{risk_summary}</p>
            )}

            {/* ── Factors ── */}
            {factors.length > 0 && (
              <ul className="space-y-1.5">
                {factors.map((f, i) => (
                  <li key={i} className="flex items-start gap-2 text-[12.5px] text-ink">
                    <span
                      className="mt-[3px] w-2 h-2 rounded-full shrink-0"
                      style={{ background: SEVERITY_DOT[f.severity] }}
                    />
                    <span>
                      {f.label}
                      {f.detail && (
                        <span className="text-ink-muted ml-1">— {f.detail}</span>
                      )}
                    </span>
                  </li>
                ))}
              </ul>
            )}

            {/* ── Checked-at + re-run ── */}
            <div className="flex items-center gap-3 flex-wrap pt-1">
              <span className="text-[11.5px] text-ink-muted font-mono">
                Geprüft: {fmtDateTime(risk_checked_at)}
              </span>
              <button
                type="button"
                disabled={busy}
                onClick={runCheck}
                className="text-[11.5px] text-ink-soft hover:text-ink underline-offset-2 hover:underline transition-colors disabled:opacity-50"
              >
                {busy ? (
                  <span className="inline-flex items-center gap-1">
                    <Loader2 size={11} className="animate-spin" /> Wird geprüft…
                  </span>
                ) : (
                  "Neu prüfen"
                )}
              </button>
            </div>

            {/* ── Override controls ── */}
            {risk_level === "rot" && !risk_override_at && (
              <div className="pt-3 border-t border-hairline">
                {!showOverrideForm ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={busy}
                    onClick={() => setShowOverrideForm(true)}
                    className="text-red-700 hover:bg-red-50"
                  >
                    Trotzdem freigeben
                  </Button>
                ) : (
                  <div className="space-y-2">
                    <label className="block">
                      <div className="data-label mb-1">Begründung (Pflichtfeld)</div>
                      <textarea
                        value={overrideReason}
                        onChange={(e) => setOverrideReason(e.target.value)}
                        rows={3}
                        placeholder="Warum wird der Vertrag trotz hohem Risiko freigegeben?"
                        className="field w-full resize-none text-[13px]"
                      />
                    </label>
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant="signal"
                        size="sm"
                        disabled={busy || !overrideReason.trim()}
                        onClick={submitOverride}
                      >
                        {busy && <Loader2 size={13} className="animate-spin" />}
                        Freigabe bestätigen
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        disabled={busy}
                        onClick={() => { setShowOverrideForm(false); setOverrideReason(""); setError(null); }}
                      >
                        Abbrechen
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ── Already overridden ── */}
            {risk_override_at && (
              <div className="pt-3 border-t border-hairline">
                <p className="text-[12.5px] text-ink-muted">
                  Freigegeben am {fmtDateTime(risk_override_at)}
                  {risk_override_reason && (
                    <> &mdash; <span className="text-ink">{risk_override_reason}</span></>
                  )}
                </p>
              </div>
            )}
          </>
        )}

        {/* ── Error box ── */}
        {error && (
          <div className="text-[13px] text-red-700 bg-red-50 border border-red-200 rounded-panel px-3 py-2">
            {error}
          </div>
        )}
      </div>
    </Panel>
  );
};

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Gauge, Loader2 } from "lucide-react";
import { Panel, PanelHeader } from "@/components/ui/Panel";
import { Button } from "@/components/ui/Button";

// ---------------------------------------------------------------------------
// Typen & Ampel-Tokens
// ---------------------------------------------------------------------------

type Decision = "gruen" | "gelb" | "rot";

type Props = {
  customerId: string;
  credit_score: number | null;
  credit_rating: string | null;
  credit_decision: string | null;
  credit_provider: string | null;
  credit_checked_at: string | null;
  isOwner: boolean;
  providerConfigured: boolean;
};

const DECISION_META: Record<
  Decision,
  { label: string; dot: string; soft: string; ink: string; ring: string }
> = {
  gruen: {
    label: "Gute Bonität",
    dot: "#16a34a",
    soft: "#f0fdf4",
    ink: "#15803d",
    ring: "#bbf7d0",
  },
  gelb: {
    label: "Mittlere Bonität",
    dot: "#ca8a04",
    soft: "#fefce8",
    ink: "#a16207",
    ring: "#fde68a",
  },
  rot: {
    label: "Schwache Bonität",
    dot: "#dc2626",
    soft: "#fef2f2",
    ink: "#b91c1c",
    ring: "#fecaca",
  },
};

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
// CreditCard
// ---------------------------------------------------------------------------

export const CreditCard = ({
  customerId,
  credit_score,
  credit_rating,
  credit_decision,
  credit_provider,
  credit_checked_at,
  isOwner,
  providerConfigured,
}: Props) => {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [consent, setConsent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const decision = (credit_decision as Decision | null) ?? null;
  const meta = decision ? DECISION_META[decision] : null;
  const hasResult = !!credit_checked_at;

  const runCheck = async () => {
    if (!consent) {
      setError("Bitte die Einwilligung des Kunden bestätigen.");
      return;
    }
    setError(null);
    setBusy(true);
    const res = await fetch(`/api/customers/${customerId}/credit-check`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ consent: true }),
    });
    setBusy(false);
    if (!res.ok) {
      const j = (await res.json().catch(() => ({}))) as { error?: string };
      setError(j.error ?? "Bonitätsprüfung fehlgeschlagen.");
      return;
    }
    setConsent(false);
    router.refresh();
  };

  return (
    <Panel flush>
      <PanelHeader Icon={Gauge} title="Bonität" />
      <div className="p-5 space-y-4">
        {/* ── Ergebnis ── */}
        {hasResult ? (
          <>
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
                {credit_score != null && (
                  <span className="font-mono text-[12px] opacity-80 ml-1">
                    Score {credit_score}/100
                  </span>
                )}
              </div>
            )}

            <div className="grid grid-cols-2 gap-x-6 gap-y-1.5 text-[13px] max-w-sm">
              <span className="text-ink-muted text-[12px]">Rating</span>
              <span className="text-ink font-mono">{credit_rating || "—"}</span>
              <span className="text-ink-muted text-[12px]">Anbieter</span>
              <span className="text-ink">{credit_provider || "—"}</span>
              <span className="text-ink-muted text-[12px]">Geprüft</span>
              <span className="text-ink font-mono">
                {credit_checked_at ? fmtDateTime(credit_checked_at) : "—"}
              </span>
            </div>
          </>
        ) : (
          <p className="text-[13px] text-ink-muted">Noch keine Bonitätsauskunft.</p>
        )}

        {/* ── Aktion (nur Inhaber, nur wenn Anbieter konfiguriert) ── */}
        {isOwner && providerConfigured ? (
          <div className="pt-3 border-t border-hairline space-y-3">
            <label className="flex items-start gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={consent}
                onChange={(e) => setConsent(e.target.checked)}
                className="mt-0.5 w-4 h-4 accent-signal"
              />
              <span className="text-[12.5px] text-ink">
                Der Kunde hat der Bonitätsprüfung zugestimmt.
              </span>
            </label>
            <Button
              type="button"
              variant="signal"
              size="sm"
              disabled={busy || !consent}
              onClick={runCheck}
            >
              {busy && <Loader2 size={13} className="animate-spin" />}
              {hasResult ? "Bonität neu anfragen" : "Bonität anfragen"}
            </Button>
          </div>
        ) : isOwner && !providerConfigured ? (
          <p className="pt-3 border-t border-hairline text-[12px] text-ink-muted">
            Kein Anbieter konfiguriert. In den Einstellungen unter
            &bdquo;Bonitätsauskunft&ldquo; einen Anbieter hinterlegen.
          </p>
        ) : !isOwner ? (
          <p className="pt-3 border-t border-hairline text-[12px] text-ink-muted">
            Nur der Inhaber kann eine Bonitätsauskunft anfragen.
          </p>
        ) : null}

        {error && (
          <div className="text-[13px] text-red-700 bg-red-50 border border-red-200 rounded-panel px-3 py-2">
            {error}
          </div>
        )}
      </div>
    </Panel>
  );
};

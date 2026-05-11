"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  ArrowLeft,
  CalendarRange,
  Calendar as CalendarIcon,
  Check,
  Loader2,
  Plus,
  Sparkles,
  Sun,
  Trash2,
  TrendingUp,
  X,
} from "lucide-react";
import type { PricingRule, PricingRuleType } from "@/lib/types";

const TYPE_META: Record<
  PricingRuleType,
  { label: string; short: string; icon: typeof Sun; color: string; bg: string; ring: string }
> = {
  season: {
    label: "Saison (Datumsbereich)",
    short: "Saison",
    icon: Sun,
    color: "#a16207",
    bg: "#fefce8",
    ring: "#fde68a",
  },
  weekday: {
    label: "Wochentag",
    short: "Wochentag",
    icon: CalendarIcon,
    color: "#1d4ed8",
    bg: "#eff6ff",
    ring: "#bfdbfe",
  },
  demand: {
    label: "Nachfrage / Auslastung",
    short: "Nachfrage",
    icon: TrendingUp,
    color: "#b91c1c",
    bg: "#fef2f2",
    ring: "#fecaca",
  },
  custom: {
    label: "Pauschal (immer aktiv)",
    short: "Pauschal",
    icon: Sparkles,
    color: "#86198f",
    bg: "#fdf4ff",
    ring: "#f5d0fe",
  },
};

const WEEKDAYS = [
  { iso: 1, label: "Mo" },
  { iso: 2, label: "Di" },
  { iso: 3, label: "Mi" },
  { iso: 4, label: "Do" },
  { iso: 5, label: "Fr" },
  { iso: 6, label: "Sa" },
  { iso: 7, label: "So" },
];

const fmtPct = (n: number) => `${n >= 0 ? "+" : ""}${n.toFixed(1).replace(".", ",")}%`;

const ruleSummary = (r: PricingRule): string => {
  switch (r.type) {
    case "season":
      return r.start_date && r.end_date
        ? `${r.start_date} – ${r.end_date}`
        : "Datumsbereich nicht gesetzt";
    case "weekday":
      if (!r.weekdays?.length) return "Keine Wochentage";
      return r.weekdays
        .map((iso) => WEEKDAYS.find((w) => w.iso === iso)?.label ?? "?")
        .join(", ");
    case "demand":
      return r.min_fleet_available != null
        ? `Wenn weniger als ${r.min_fleet_available} Fahrzeuge frei`
        : "Schwelle nicht gesetzt";
    case "custom":
      return "Gilt immer";
  }
};

export const PricingClient = ({ initialRules }: { initialRules: PricingRule[] }) => {
  const router = useRouter();
  const [rules, setRules] = useState<PricingRule[]>(initialRules);
  const [editing, setEditing] = useState<PricingRule | "new" | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const toggleActive = async (rule: PricingRule) => {
    setBusyId(rule.id);
    const next = !rule.active;
    setRules((rs) => rs.map((r) => (r.id === rule.id ? { ...r, active: next } : r)));
    try {
      const res = await fetch(`/api/pricing/rules/${rule.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active: next }),
      });
      if (!res.ok) {
        // rollback
        setRules((rs) =>
          rs.map((r) => (r.id === rule.id ? { ...r, active: !next } : r))
        );
      } else {
        router.refresh();
      }
    } finally {
      setBusyId(null);
    }
  };

  const remove = async (rule: PricingRule) => {
    if (!confirm(`Regel „${rule.name}" wirklich löschen?`)) return;
    setBusyId(rule.id);
    try {
      const res = await fetch(`/api/pricing/rules/${rule.id}`, { method: "DELETE" });
      if (res.ok) {
        setRules((rs) => rs.filter((r) => r.id !== rule.id));
        router.refresh();
      }
    } finally {
      setBusyId(null);
    }
  };

  return (
    <>
      <Link
        href="/dashboard/settings"
        className="inline-flex items-center gap-1.5 text-sm text-stone-500 hover:text-stone-900 mb-4"
      >
        <ArrowLeft size={14} /> Zurück zu Einstellungen
      </Link>

      <div className="flex items-end justify-between gap-4 flex-wrap mb-6">
        <div>
          <div className="font-display font-bold text-2xl tracking-tight">Preisregeln</div>
          <p className="text-sm text-stone-500 mt-1 max-w-xl">
            Revenue Management für deine Flotte. Definiere Aufschläge oder Rabatte
            nach Saison, Wochentag oder Auslastung — die App schlägt bei jedem
            neuen Vertrag den optimalen Tagespreis vor.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setEditing("new")}
          className="inline-flex items-center gap-1.5 h-10 px-4 rounded-full bg-stone-900 text-white text-[14px] font-medium hover:bg-stone-800"
        >
          <Plus size={14} /> Neue Regel
        </button>
      </div>

      {rules.length === 0 ? (
        <div className="rounded-xl bg-white ring-1 ring-stone-200 p-10 text-center">
          <CalendarRange size={28} className="mx-auto text-stone-300 mb-2" />
          <div className="text-sm text-stone-600">
            Noch keine Regeln definiert. Lege eine erste an, z.&nbsp;B. „Hochsaison
            Sommer +20%“.
          </div>
        </div>
      ) : (
        <div className="rounded-xl bg-white ring-1 ring-stone-200 divide-y divide-stone-100 overflow-hidden">
          {rules.map((r) => {
            const meta = TYPE_META[r.type];
            const Icon = meta.icon;
            return (
              <div
                key={r.id}
                className="px-5 py-4 grid grid-cols-[40px_1fr_auto] items-center gap-3 hover:bg-stone-50 transition-colors"
              >
                <div
                  className="w-9 h-9 rounded-lg flex items-center justify-center"
                  style={{ background: meta.bg, color: meta.color }}
                >
                  <Icon size={16} />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[15px] font-medium text-stone-900 truncate">
                      {r.name}
                    </span>
                    <span
                      className="inline-flex items-center px-1.5 h-5 rounded text-[11px] font-medium"
                      style={{
                        background: meta.bg,
                        color: meta.color,
                        boxShadow: `inset 0 0 0 1px ${meta.ring}`,
                      }}
                    >
                      {meta.short}
                    </span>
                    <span
                      className={`tabular-nums text-[13.5px] font-semibold ${
                        r.adjustment_percent >= 0 ? "text-rose-700" : "text-blue-700"
                      }`}
                    >
                      {fmtPct(r.adjustment_percent)}
                    </span>
                  </div>
                  <div className="text-[12.5px] text-stone-500 mt-0.5 truncate">
                    {ruleSummary(r)}
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <label className="inline-flex items-center gap-2 text-[12.5px] text-stone-500 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={r.active}
                      disabled={busyId === r.id}
                      onChange={() => toggleActive(r)}
                      className="w-4 h-4 accent-teal-600"
                    />
                    {r.active ? "Aktiv" : "Inaktiv"}
                  </label>
                  <button
                    type="button"
                    onClick={() => setEditing(r)}
                    className="text-[12.5px] text-stone-500 hover:text-stone-900 px-2 py-1"
                  >
                    Bearbeiten
                  </button>
                  <button
                    type="button"
                    onClick={() => remove(r)}
                    disabled={busyId === r.id}
                    className="p-1.5 text-stone-400 hover:text-rose-600 disabled:opacity-30"
                    title="Löschen"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {editing && (
        <RuleModal
          initial={editing === "new" ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={(saved) => {
            setRules((rs) => {
              const ix = rs.findIndex((r) => r.id === saved.id);
              if (ix >= 0) {
                const copy = [...rs];
                copy[ix] = saved;
                return copy;
              }
              return [saved, ...rs];
            });
            setEditing(null);
            router.refresh();
          }}
        />
      )}
    </>
  );
};

const inputCls =
  "w-full h-10 px-3 rounded-lg bg-white ring-1 ring-stone-200 text-sm text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-teal-500/40 focus:border-teal-500 transition-shadow";

const RuleModal = ({
  initial,
  onClose,
  onSaved,
}: {
  initial: PricingRule | null;
  onClose: () => void;
  onSaved: (rule: PricingRule) => void;
}) => {
  const [name, setName] = useState(initial?.name ?? "");
  const [type, setType] = useState<PricingRuleType>(initial?.type ?? "season");
  const [adjustment, setAdjustment] = useState(
    initial?.adjustment_percent != null ? String(initial.adjustment_percent) : "10"
  );
  const [startDate, setStartDate] = useState(initial?.start_date ?? "");
  const [endDate, setEndDate] = useState(initial?.end_date ?? "");
  const [weekdays, setWeekdays] = useState<number[]>(initial?.weekdays ?? [5, 6]);
  const [minFleet, setMinFleet] = useState(
    initial?.min_fleet_available != null ? String(initial.min_fleet_available) : "2"
  );
  const [active, setActive] = useState(initial?.active ?? true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const toggleWeekday = (iso: number) => {
    setWeekdays((wd) =>
      wd.includes(iso) ? wd.filter((x) => x !== iso) : [...wd, iso].sort((a, b) => a - b)
    );
  };

  const submit = async () => {
    if (!name.trim()) {
      setError("Name ist Pflichtfeld");
      return;
    }
    const adjustmentNum = Number(adjustment.replace(",", "."));
    if (!Number.isFinite(adjustmentNum)) {
      setError("Anpassung in % muss eine Zahl sein");
      return;
    }
    if (type === "season" && (!startDate || !endDate)) {
      setError("Start- und Enddatum erforderlich");
      return;
    }
    if (type === "weekday" && weekdays.length === 0) {
      setError("Mindestens einen Wochentag wählen");
      return;
    }
    if (type === "demand" && !minFleet) {
      setError("Minimale freie Fahrzeuge erforderlich");
      return;
    }
    setError(null);
    setSaving(true);
    try {
      const payload = {
        name: name.trim(),
        type,
        adjustment_percent: adjustmentNum,
        start_date: type === "season" ? startDate : null,
        end_date: type === "season" ? endDate : null,
        weekdays: type === "weekday" ? weekdays : null,
        min_fleet_available:
          type === "demand" ? Math.round(Number(minFleet)) : null,
        active,
      };
      const url = initial ? `/api/pricing/rules/${initial.id}` : "/api/pricing/rules";
      const method = initial ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const j = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        rule?: PricingRule;
        error?: string;
      };
      if (!res.ok || !j.ok || !j.rule) {
        setError(j.error ?? "Speichern fehlgeschlagen");
        setSaving(false);
        return;
      }
      onSaved(j.rule);
    } catch {
      setError("Netzwerkfehler");
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <button
        className="absolute inset-0 bg-stone-900/40 backdrop-blur-sm"
        onClick={onClose}
        aria-label="Schließen"
      />
      <div className="relative w-full sm:max-w-lg max-h-[90vh] flex flex-col bg-white sm:rounded-2xl rounded-t-2xl shadow-2xl ring-1 ring-stone-200 overflow-hidden">
        <div className="px-6 py-4 flex items-center justify-between border-b border-stone-100">
          <div>
            <div className="text-[11px] uppercase tracking-[0.08em] font-semibold text-teal-700">
              Preisregel
            </div>
            <h2 className="font-display text-xl tracking-tight font-medium mt-0.5">
              {initial ? "Regel bearbeiten" : "Neue Regel"}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full inline-flex items-center justify-center text-stone-500 hover:bg-stone-100"
          >
            <X size={16} />
          </button>
        </div>

        <div className="px-6 py-5 overflow-auto scroll-thin grow space-y-4">
          <Field label="Name" required>
            <input
              className={inputCls}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="z. B. Hochsaison Sommer"
              autoFocus
            />
          </Field>

          <Field label="Typ" required>
            <select
              className={inputCls}
              value={type}
              onChange={(e) => setType(e.target.value as PricingRuleType)}
            >
              {(["season", "weekday", "demand", "custom"] as PricingRuleType[]).map((t) => (
                <option key={t} value={t}>
                  {TYPE_META[t].label}
                </option>
              ))}
            </select>
          </Field>

          <Field
            label="Anpassung in %"
            hint="positiv = Aufschlag, negativ = Rabatt"
            required
          >
            <div className="relative">
              <input
                className={`${inputCls} pr-10`}
                value={adjustment}
                onChange={(e) => setAdjustment(e.target.value)}
                inputMode="decimal"
                placeholder="z. B. 20 oder -10"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[14px] text-stone-400">
                %
              </span>
            </div>
          </Field>

          {type === "season" && (
            <div className="grid grid-cols-2 gap-3">
              <Field label="Startdatum" required>
                <input
                  type="date"
                  className={inputCls}
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </Field>
              <Field label="Enddatum" required>
                <input
                  type="date"
                  className={inputCls}
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </Field>
            </div>
          )}

          {type === "weekday" && (
            <Field label="Wochentage" required>
              <div className="grid grid-cols-7 gap-1.5">
                {WEEKDAYS.map((w) => {
                  const on = weekdays.includes(w.iso);
                  return (
                    <button
                      key={w.iso}
                      type="button"
                      onClick={() => toggleWeekday(w.iso)}
                      className={`h-10 rounded-lg text-sm font-medium transition-all ${
                        on
                          ? "bg-stone-900 text-white"
                          : "bg-white text-stone-600 ring-1 ring-stone-200 hover:ring-stone-300"
                      }`}
                    >
                      {w.label}
                    </button>
                  );
                })}
              </div>
            </Field>
          )}

          {type === "demand" && (
            <Field
              label="Wenn weniger als … Fahrzeuge frei sind"
              hint="z. B. 2 → Aufschlag greift, sobald nur noch 1 oder 0 frei"
              required
            >
              <input
                className={inputCls}
                value={minFleet}
                onChange={(e) => setMinFleet(e.target.value)}
                inputMode="numeric"
                type="number"
                min="1"
              />
            </Field>
          )}

          <label className="flex items-start gap-3 p-3 rounded-lg ring-1 ring-stone-200 cursor-pointer">
            <input
              type="checkbox"
              checked={active}
              onChange={(e) => setActive(e.target.checked)}
              className="mt-0.5 w-4 h-4 accent-teal-600"
            />
            <div className="text-sm text-stone-700">
              Regel ist <strong>aktiv</strong> — wird bei der Preisberechnung berücksichtigt.
            </div>
          </label>

          {error && (
            <div className="text-sm rounded-lg px-3 py-2 bg-rose-50 ring-1 ring-rose-200 text-rose-700">
              {error}
            </div>
          )}
        </div>

        <div className="px-6 py-4 flex items-center justify-end gap-3 border-t border-stone-100">
          <button
            type="button"
            onClick={onClose}
            className="text-sm text-stone-500 hover:text-stone-800 px-3"
          >
            Abbrechen
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={saving}
            className="inline-flex items-center justify-center gap-1.5 h-10 px-5 rounded-full bg-stone-900 text-white text-sm font-medium hover:bg-stone-800 disabled:opacity-40"
          >
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
            {initial ? "Speichern" : "Regel anlegen"}
          </button>
        </div>
      </div>
    </div>
  );
};

const Field = ({
  label,
  hint,
  required,
  children,
}: {
  label: string;
  hint?: string;
  required?: boolean;
  children: React.ReactNode;
}) => (
  <label className="block">
    <div className="flex items-baseline justify-between mb-1">
      <span className="text-[12px] font-medium text-stone-700">
        {label}
        {required && <span className="text-rose-500 ml-0.5">*</span>}
      </span>
      {hint && <span className="text-[11px] text-stone-400">{hint}</span>}
    </div>
    {children}
  </label>
);

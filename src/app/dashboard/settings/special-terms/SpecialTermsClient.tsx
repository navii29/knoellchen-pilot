"use client";

import { useState } from "react";
import { Loader2, Pencil, Plus, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { PageHeader } from "@/components/ui/PageHeader";
import { Panel } from "@/components/ui/Panel";
import { EmptyState } from "@/components/ui/EmptyState";
import {
  SPECIAL_TERMS_CATEGORY_LABEL,
  type SpecialTermsCategory,
  type SpecialTermsTemplate,
} from "@/lib/types";

const CATEGORIES: SpecialTermsCategory[] = [
  "general",
  "sportscars",
  "longterm",
  "international",
  "damage",
];

type Form = {
  title: string;
  text: string;
  category: SpecialTermsCategory;
  active: boolean;
  sort_order: number;
};

const emptyForm = (): Form => ({
  title: "",
  text: "",
  category: "general",
  active: true,
  sort_order: 999,
});

export const SpecialTermsClient = ({
  initialTemplates,
}: {
  initialTemplates: SpecialTermsTemplate[];
}) => {
  const [templates, setTemplates] = useState<SpecialTermsTemplate[]>(initialTemplates);
  const [editing, setEditing] = useState<SpecialTermsTemplate | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState<Form>(emptyForm());
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const grouped = CATEGORIES.map((cat) => ({
    cat,
    items: templates
      .filter((t) => t.category === cat)
      .sort((a, b) => a.sort_order - b.sort_order),
  })).filter((g) => g.items.length > 0);

  const openCreate = () => {
    setForm(emptyForm());
    setEditing(null);
    setCreating(true);
    setErr(null);
  };

  const openEdit = (t: SpecialTermsTemplate) => {
    setForm({
      title: t.title,
      text: t.text,
      category: t.category,
      active: t.active,
      sort_order: t.sort_order,
    });
    setEditing(t);
    setCreating(false);
    setErr(null);
  };

  const close = () => {
    setEditing(null);
    setCreating(false);
    setErr(null);
  };

  const save = async () => {
    setErr(null);
    if (!form.title.trim() || !form.text.trim()) {
      setErr("Titel und Volltext sind Pflichtfelder.");
      return;
    }
    setBusy(true);
    const isUpdate = !!editing;
    const url = isUpdate ? `/api/special-terms/${editing.id}` : "/api/special-terms";
    const res = await fetch(url, {
      method: isUpdate ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const j = (await res.json().catch(() => ({}))) as {
      ok?: boolean;
      template?: SpecialTermsTemplate;
      error?: string;
    };
    setBusy(false);
    if (!res.ok || !j.ok || !j.template) {
      setErr(j.error || "Speichern fehlgeschlagen.");
      return;
    }
    if (isUpdate) {
      setTemplates((ts) => ts.map((t) => (t.id === j.template!.id ? j.template! : t)));
    } else {
      setTemplates((ts) => [...ts, j.template!]);
    }
    close();
  };

  const toggleActive = async (t: SpecialTermsTemplate) => {
    const next = !t.active;
    setTemplates((ts) => ts.map((x) => (x.id === t.id ? { ...x, active: next } : x)));
    const res = await fetch(`/api/special-terms/${t.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: next }),
    });
    if (!res.ok) {
      // Rollback bei Fehler
      setTemplates((ts) => ts.map((x) => (x.id === t.id ? { ...x, active: !next } : x)));
    }
  };

  const remove = async (t: SpecialTermsTemplate) => {
    if (!confirm(`Textbaustein "${t.title}" wirklich löschen?`)) return;
    const prev = templates;
    setTemplates((ts) => ts.filter((x) => x.id !== t.id));
    const res = await fetch(`/api/special-terms/${t.id}`, { method: "DELETE" });
    if (!res.ok) setTemplates(prev);
  };

  return (
    <>
      <PageHeader
        kicker="Einstellungen · Textbausteine"
        title="Sondervereinbarungen"
        description="Wiederverwendbare Textbausteine, die du bei jedem Vertrag per Checkbox auswählen kannst. Erscheinen auf Seite 3 des Mietvertrag-PDFs."
        actions={
          <Button variant="signal" size="sm" onClick={openCreate}>
            <Plus size={14} /> Neuer Textbaustein
          </Button>
        }
        className="mb-6"
      />

      <div className="space-y-6">
        {grouped.length === 0 && (
          <Panel>
            <EmptyState
              title="Noch keine Textbausteine"
              description="Lege den ersten an oder warte auf die Standard-Vorschläge."
              action={
                <Button variant="signal" size="sm" onClick={openCreate}>
                  <Plus size={14} /> Neuer Textbaustein
                </Button>
              }
            />
          </Panel>
        )}
        {grouped.map(({ cat, items }) => (
          <section key={cat}>
            <div className="kicker text-ink-muted mb-2">
              {SPECIAL_TERMS_CATEGORY_LABEL[cat]}
            </div>
            <Panel flush>
              {items.map((t) => (
                <div
                  key={t.id}
                  className="flex items-start gap-3 p-4 border-b border-hairline last:border-0 hover:bg-canvas/50 transition-colors"
                >
                  <button
                    type="button"
                    onClick={() => toggleActive(t)}
                    className={`mt-0.5 w-9 h-5 rounded-full relative transition-colors shrink-0 ${
                      t.active ? "bg-signal" : "bg-ink/20"
                    }`}
                    title={t.active ? "Aktiv — klicken zum Deaktivieren" : "Inaktiv"}
                  >
                    <span
                      className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all ${
                        t.active ? "left-[18px]" : "left-0.5"
                      }`}
                    />
                  </button>
                  <div className="flex-1 min-w-0">
                    <div
                      className={`font-medium text-[13.5px] ${
                        t.active ? "text-ink" : "text-ink-muted"
                      }`}
                    >
                      {t.title}
                    </div>
                    <div className="text-[12px] text-ink-muted mt-1 leading-snug">
                      {t.text}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => openEdit(t)}
                      className="w-8 h-8 rounded-btn inline-flex items-center justify-center text-ink-muted hover:bg-canvas hover:text-ink"
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={() => remove(t)}
                      className="w-8 h-8 rounded-btn inline-flex items-center justify-center text-ink-muted hover:bg-rose-50 hover:text-rose-700"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </Panel>
          </section>
        ))}
      </div>

      {(creating || editing) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <button
            type="button"
            onClick={close}
            className="absolute inset-0 bg-ink/40 backdrop-blur-sm"
            aria-label="Schließen"
          />
          <div className="relative w-full max-w-lg bg-paper rounded-card shadow-2xl border border-hairline overflow-hidden">
            <div className="px-6 py-4 flex items-start justify-between gap-3 border-b border-hairline">
              <h2 className="font-display font-bold text-[18px] tracking-tight text-ink">
                {editing ? "Textbaustein bearbeiten" : "Neuer Textbaustein"}
              </h2>
              <button
                type="button"
                onClick={close}
                className="w-8 h-8 -mr-2 inline-flex items-center justify-center text-ink-muted hover:bg-canvas rounded-btn"
              >
                <X size={15} />
              </button>
            </div>
            <div className="px-6 py-5 space-y-4">
              <label className="block">
                <div className="data-label mb-1">Titel (kurz)</div>
                <input
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="z.B. Auslandsfahrten DACH"
                  className="field"
                />
              </label>
              <label className="block">
                <div className="data-label mb-1">Volltext (erscheint im PDF)</div>
                <textarea
                  value={form.text}
                  onChange={(e) => setForm({ ...form, text: e.target.value })}
                  rows={4}
                  className="field leading-relaxed"
                />
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label className="block">
                  <div className="data-label mb-1">Kategorie</div>
                  <select
                    value={form.category}
                    onChange={(e) =>
                      setForm({ ...form, category: e.target.value as SpecialTermsCategory })
                    }
                    className="field"
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {SPECIAL_TERMS_CATEGORY_LABEL[c]}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block">
                  <div className="data-label mb-1">Sortier-Reihenfolge</div>
                  <input
                    type="number"
                    value={form.sort_order}
                    onChange={(e) =>
                      setForm({ ...form, sort_order: Number(e.target.value) || 0 })
                    }
                    className="field font-mono tnum"
                  />
                </label>
              </div>
              {err && (
                <div className="text-[12px] text-rose-700 bg-rose-50 border border-rose-200 rounded-panel px-3 py-2">
                  {err}
                </div>
              )}
            </div>
            <div className="px-6 py-4 flex items-center justify-end gap-2 border-t border-hairline">
              <button
                type="button"
                onClick={close}
                className="text-[13px] text-ink-muted hover:text-ink px-3 py-2"
              >
                Abbrechen
              </button>
              <Button
                type="button"
                variant="signal"
                size="sm"
                onClick={save}
                disabled={busy}
              >
                {busy && <Loader2 size={14} className="animate-spin" />}
                {editing ? "Speichern" : "Anlegen"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

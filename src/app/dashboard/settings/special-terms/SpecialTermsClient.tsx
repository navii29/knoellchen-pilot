"use client";

import { useState } from "react";
import { Loader2, Pencil, Plus, Trash2, X } from "lucide-react";
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
      <div className="flex items-end justify-between gap-3 mb-4">
        <div>
          <h1 className="font-display font-bold text-2xl tracking-tight">
            Sondervereinbarungen
          </h1>
          <p className="text-sm text-stone-500 mt-1 max-w-2xl">
            Wiederverwendbare Textbausteine, die du bei jedem Vertrag per Checkbox
            auswählen kannst. Erscheinen auf Seite 3 des Mietvertrag-PDFs.
          </p>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="shrink-0 inline-flex items-center gap-1.5 px-3 h-9 rounded-lg bg-stone-900 text-white text-sm font-medium hover:bg-stone-800"
        >
          <Plus size={14} /> Neuer Textbaustein
        </button>
      </div>

      <div className="space-y-6">
        {grouped.length === 0 && (
          <div className="rounded-xl bg-white ring-1 ring-stone-200 p-8 text-center">
            <div className="text-sm text-stone-500">
              Noch keine Textbausteine. Lege den ersten an oder warte auf die
              Standard-Vorschläge.
            </div>
          </div>
        )}
        {grouped.map(({ cat, items }) => (
          <section key={cat}>
            <div className="text-[11px] uppercase tracking-wider text-stone-500 font-semibold mb-2">
              {SPECIAL_TERMS_CATEGORY_LABEL[cat]}
            </div>
            <div className="rounded-xl bg-white ring-1 ring-stone-200 divide-y divide-stone-100 overflow-hidden">
              {items.map((t) => (
                <div
                  key={t.id}
                  className="flex items-start gap-3 p-4 hover:bg-stone-50/60"
                >
                  <button
                    type="button"
                    onClick={() => toggleActive(t)}
                    className={`mt-0.5 w-9 h-5 rounded-full relative transition-colors shrink-0 ${
                      t.active ? "bg-teal-600" : "bg-stone-300"
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
                      className={`font-medium text-sm ${
                        t.active ? "text-stone-900" : "text-stone-400"
                      }`}
                    >
                      {t.title}
                    </div>
                    <div className="text-xs text-stone-500 mt-1 leading-snug">
                      {t.text}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => openEdit(t)}
                      className="w-8 h-8 rounded-lg inline-flex items-center justify-center text-stone-500 hover:bg-stone-100 hover:text-stone-900"
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={() => remove(t)}
                      className="w-8 h-8 rounded-lg inline-flex items-center justify-center text-stone-500 hover:bg-rose-50 hover:text-rose-700"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>

      {(creating || editing) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <button
            type="button"
            onClick={close}
            className="absolute inset-0 bg-stone-900/40 backdrop-blur-sm"
            aria-label="Schließen"
          />
          <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl ring-1 ring-stone-200 overflow-hidden">
            <div className="px-6 py-4 flex items-start justify-between gap-3 border-b border-stone-100">
              <h2 className="font-display font-semibold text-lg">
                {editing ? "Textbaustein bearbeiten" : "Neuer Textbaustein"}
              </h2>
              <button
                type="button"
                onClick={close}
                className="w-8 h-8 -mr-2 inline-flex items-center justify-center text-stone-500 hover:bg-stone-100 rounded-full"
              >
                <X size={15} />
              </button>
            </div>
            <div className="px-6 py-5 space-y-4">
              <label className="block">
                <div className="text-[11px] uppercase tracking-wider text-stone-500 font-medium mb-1">
                  Titel (kurz)
                </div>
                <input
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="z.B. Auslandsfahrten DACH"
                  className="w-full px-3 py-2 text-sm rounded-lg ring-1 ring-stone-300 outline-none focus:ring-stone-500"
                />
              </label>
              <label className="block">
                <div className="text-[11px] uppercase tracking-wider text-stone-500 font-medium mb-1">
                  Volltext (erscheint im PDF)
                </div>
                <textarea
                  value={form.text}
                  onChange={(e) => setForm({ ...form, text: e.target.value })}
                  rows={4}
                  className="w-full px-3 py-2 text-sm rounded-lg ring-1 ring-stone-300 outline-none focus:ring-stone-500 leading-relaxed"
                />
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label className="block">
                  <div className="text-[11px] uppercase tracking-wider text-stone-500 font-medium mb-1">
                    Kategorie
                  </div>
                  <select
                    value={form.category}
                    onChange={(e) =>
                      setForm({ ...form, category: e.target.value as SpecialTermsCategory })
                    }
                    className="w-full px-3 py-2 text-sm rounded-lg ring-1 ring-stone-300 outline-none focus:ring-stone-500 bg-white"
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {SPECIAL_TERMS_CATEGORY_LABEL[c]}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block">
                  <div className="text-[11px] uppercase tracking-wider text-stone-500 font-medium mb-1">
                    Sortier-Reihenfolge
                  </div>
                  <input
                    type="number"
                    value={form.sort_order}
                    onChange={(e) =>
                      setForm({ ...form, sort_order: Number(e.target.value) || 0 })
                    }
                    className="w-full px-3 py-2 text-sm rounded-lg ring-1 ring-stone-300 outline-none focus:ring-stone-500 tabular-nums"
                  />
                </label>
              </div>
              {err && (
                <div className="text-xs text-rose-700 bg-rose-50 ring-1 ring-rose-200 rounded-lg px-3 py-2">
                  {err}
                </div>
              )}
            </div>
            <div className="px-6 py-4 flex items-center justify-end gap-2 border-t border-stone-100">
              <button
                type="button"
                onClick={close}
                className="text-sm text-stone-600 hover:text-stone-900 px-3 py-2"
              >
                Abbrechen
              </button>
              <button
                type="button"
                onClick={save}
                disabled={busy}
                className="inline-flex items-center gap-1.5 h-9 px-4 rounded-lg bg-stone-900 text-white text-sm font-medium hover:bg-stone-800 disabled:opacity-50"
              >
                {busy && <Loader2 size={14} className="animate-spin" />}
                {editing ? "Speichern" : "Anlegen"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

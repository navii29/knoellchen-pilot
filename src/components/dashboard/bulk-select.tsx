"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { X } from "lucide-react";

// Wiederverwendbare Mehrfachauswahl für Listen: Hook + Zeilen-Checkbox +
// Aktionsleiste. Auswahl ist auf die aktuell sichtbaren (z. B. gefilterten)
// Einträge beschränkt — es wird nur gelöscht, was man auch ausgewählt sieht.
export function useRowSelection<T extends { id: string }>(items: T[]) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const ids = useMemo(() => items.map((i) => i.id), [items]);

  const toggle = useCallback((id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const toggleAll = useCallback(() => {
    setSelected((prev) => {
      const allHere = ids.length > 0 && ids.every((id) => prev.has(id));
      const next = new Set(prev);
      if (allHere) ids.forEach((id) => next.delete(id));
      else ids.forEach((id) => next.add(id));
      return next;
    });
  }, [ids]);

  const clear = useCallback(() => setSelected(new Set()), []);
  const isSelected = useCallback((id: string) => selected.has(id), [selected]);

  // Nur ids, die in den aktuell sichtbaren items vorkommen.
  const selectedIds = useMemo(
    () => ids.filter((id) => selected.has(id)),
    [ids, selected]
  );
  const allSelected = ids.length > 0 && selectedIds.length === ids.length;
  const someSelected = selectedIds.length > 0 && !allSelected;

  return {
    selectedIds,
    count: selectedIds.length,
    toggle,
    toggleAll,
    clear,
    isSelected,
    allSelected,
    someSelected,
  };
}

// Checkbox mit Indeterminate-Support (für „alle auswählen"). stopPropagation,
// damit ein Klick nicht die darunterliegende Zeilen-Navigation auslöst.
export const SelectCheckbox = ({
  checked,
  indeterminate,
  onChange,
  ariaLabel,
}: {
  checked: boolean;
  indeterminate?: boolean;
  onChange: () => void;
  ariaLabel: string;
}) => {
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (ref.current) ref.current.indeterminate = !!indeterminate && !checked;
  }, [indeterminate, checked]);
  return (
    <input
      ref={ref}
      type="checkbox"
      checked={checked}
      aria-label={ariaLabel}
      onClick={(e) => e.stopPropagation()}
      onChange={onChange}
      className="w-4 h-4 accent-signal cursor-pointer shrink-0"
    />
  );
};

// Schwebende Aktionsleiste, sichtbar sobald mindestens eine Zeile gewählt ist.
export const BulkBar = ({
  count,
  onClear,
  children,
}: {
  count: number;
  onClear: () => void;
  children: React.ReactNode;
}) => {
  if (count === 0) return null;
  return (
    <div className="sticky top-2 z-20 mt-4 flex items-center gap-3 rounded-card border border-hairline bg-paper shadow-panel px-4 py-2.5">
      <span className="text-[13px] font-medium text-ink tnum">
        {count} ausgewählt
      </span>
      <div className="flex-1" />
      {children}
      <button
        type="button"
        onClick={onClear}
        className="inline-flex items-center gap-1 text-[12.5px] text-ink-muted hover:text-ink"
      >
        <X size={13} /> Auswahl aufheben
      </button>
    </div>
  );
};

"use client";

import { useCallback, useRef, useState, type ReactNode } from "react";
import { UploadCloud } from "lucide-react";

/**
 * Wiederverwendbare Drag&Drop-Upload-Fläche (plus Klick zum Auswählen).
 * Apple-Stil: hairline-gestrichelt, Signal-Blau bei Hover/Drag.
 */
export const FileDrop = ({
  onFiles,
  accept,
  multiple = false,
  disabled = false,
  label = "Datei hierher ziehen oder klicken",
  hint,
  className = "",
  children,
}: {
  onFiles: (files: File[]) => void;
  accept?: string;
  multiple?: boolean;
  disabled?: boolean;
  label?: string;
  hint?: string;
  className?: string;
  children?: ReactNode;
}) => {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [over, setOver] = useState(false);

  const handle = useCallback(
    (list: FileList | null) => {
      if (!list || disabled) return;
      const files = Array.from(list);
      if (files.length) onFiles(multiple ? files : files.slice(0, 1));
    },
    [onFiles, multiple, disabled]
  );

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={label}
      onClick={() => !disabled && inputRef.current?.click()}
      onKeyDown={(e) => {
        if ((e.key === "Enter" || e.key === " ") && !disabled) inputRef.current?.click();
      }}
      onDragOver={(e) => {
        e.preventDefault();
        if (!disabled) setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setOver(false);
        handle(e.dataTransfer.files);
      }}
      className={`cursor-pointer rounded-card border-2 border-dashed transition-colors px-4 py-6 text-center select-none ${
        over
          ? "border-signal bg-signal/5"
          : "border-hairline bg-canvas hover:border-signal/40"
      } ${disabled ? "opacity-50 pointer-events-none" : ""} ${className}`}
    >
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        className="hidden"
        onChange={(e) => {
          handle(e.target.files);
          e.target.value = "";
        }}
      />
      {children ?? (
        <div className="flex flex-col items-center gap-1.5">
          <UploadCloud size={20} className={over ? "text-signal" : "text-ink-muted"} strokeWidth={1.8} />
          <div className="text-[13.5px] font-medium text-ink">{label}</div>
          {hint && <div className="text-[12px] text-ink-muted">{hint}</div>}
        </div>
      )}
    </div>
  );
};

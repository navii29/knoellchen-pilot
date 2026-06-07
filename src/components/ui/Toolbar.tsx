"use client";

import type { ReactNode } from "react";
import { Search } from "lucide-react";

/** Pill filter tabs (e.g. ticket status). Active = ink fill. */
export function FilterTabs<T extends string>({
  options,
  value,
  onChange,
  className = "",
}: {
  options: { value: T; label: string; count?: number }[];
  value: T;
  onChange: (v: T) => void;
  className?: string;
}) {
  return (
    <div className={`flex items-center gap-1 flex-wrap ${className}`}>
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            onClick={() => onChange(o.value)}
            className={`inline-flex items-center gap-1.5 px-3 h-8 rounded-btn text-[13px] font-medium transition-colors ${
              active ? "bg-ink text-white" : "text-ink-soft hover:bg-ink/5"
            }`}
          >
            {o.label}
            {o.count != null && (
              <span
                className={`font-mono text-[11px] ${active ? "text-white/60" : "text-ink-muted"}`}
              >
                {o.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

/** Search input matched to the light workspace. */
export const SearchInput = ({
  value,
  onChange,
  placeholder = "Suchen…",
  className = "",
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  className?: string;
}) => (
  <div className={`relative ${className}`}>
    <Search
      size={15}
      className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted pointer-events-none"
    />
    <input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="h-9 w-full pl-9 pr-3 rounded-input bg-paper border border-hairline text-[13.5px] text-ink placeholder:text-ink-muted focus:outline-none focus:border-ink/30 focus:ring-2 focus:ring-signal/15 transition"
    />
  </div>
);

/** Compact square icon button (hairline, light). */
export const IconButton = ({
  children,
  className = "",
  ...rest
}: { children: ReactNode } & React.ComponentProps<"button">) => (
  <button
    className={`inline-flex items-center justify-center w-9 h-9 rounded-btn border border-hairline bg-paper text-ink-soft hover:bg-ink/5 hover:text-ink transition-colors ${className}`}
    {...rest}
  >
    {children}
  </button>
);

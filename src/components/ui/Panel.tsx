import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

/**
 * The standard workspace surface — paper card, hairline border, sharp-but-usable
 * corners, restrained shadow. Replaces the old `rounded-2xl ring-1 ring-black/5`.
 */
export const Panel = ({
  children,
  className = "",
  as: Tag = "div",
  flush = false,
}: {
  children: ReactNode;
  className?: string;
  as?: "div" | "section" | "form";
  flush?: boolean;
}) => (
  <Tag
    className={`bg-paper border border-hairline rounded-card shadow-panel ${
      flush ? "" : "p-5"
    } ${className}`}
  >
    {children}
  </Tag>
);

/** Panel header row: title (optional mono kicker) + right-side actions. */
export const PanelHeader = ({
  title,
  kicker,
  Icon,
  actions,
  className = "",
}: {
  title: ReactNode;
  kicker?: string;
  Icon?: LucideIcon;
  actions?: ReactNode;
  className?: string;
}) => (
  <div
    className={`flex items-center justify-between gap-3 flex-wrap px-5 py-4 border-b border-hairline ${className}`}
  >
    <div className="min-w-0">
      {kicker && <div className="kicker text-ink-muted mb-1">{kicker}</div>}
      <div className="flex items-center gap-2 font-display font-bold text-[15px] tracking-tight text-ink">
        {Icon && <Icon size={15} className="text-ink-muted" strokeWidth={1.9} />}
        {title}
      </div>
    </div>
    {actions && <div className="flex items-center gap-1.5">{actions}</div>}
  </div>
);

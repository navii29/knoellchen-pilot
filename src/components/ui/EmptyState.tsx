import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

/**
 * Consistent empty state for tables, lists, and panels.
 * Engineered, calm: a hairline-bordered icon tile, display title, muted body, CTA.
 */
export const EmptyState = ({
  Icon,
  title,
  description,
  action,
  className = "",
}: {
  Icon?: LucideIcon;
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
}) => (
  <div className={`flex flex-col items-center text-center px-6 py-14 ${className}`}>
    {Icon && (
      <div className="w-11 h-11 rounded-panel border border-hairline bg-canvas flex items-center justify-center mb-4">
        <Icon size={18} className="text-ink-muted" strokeWidth={1.75} />
      </div>
    )}
    <div className="font-display font-bold text-[15px] text-ink tracking-tight">{title}</div>
    {description && (
      <p className="mt-1.5 text-[13px] text-ink-muted max-w-sm">{description}</p>
    )}
    {action && <div className="mt-5">{action}</div>}
  </div>
);

import type { ReactNode } from "react";

/**
 * Standard dashboard page header: mono kicker + display title + optional
 * description, with right-aligned actions. Used at the top of every interior page.
 */
export const PageHeader = ({
  kicker,
  title,
  description,
  actions,
  className = "",
}: {
  kicker?: string;
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  className?: string;
}) => (
  <div className={`flex items-end justify-between gap-4 flex-wrap ${className}`}>
    <div className="min-w-0">
      {kicker && <div className="kicker text-ink-muted mb-2">{kicker}</div>}
      <h1 className="font-display font-extrabold text-ink text-[26px] sm:text-[30px] leading-[1.05] tracking-tightest">
        {title}
      </h1>
      {description && (
        <p className="mt-1.5 text-[14px] text-ink-muted max-w-2xl">{description}</p>
      )}
    </div>
    {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
  </div>
);

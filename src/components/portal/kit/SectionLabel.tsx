import type { ReactNode } from "react";

// Kleine Abschnittsüberschrift (Kicker mit Signal-Punkt).
export const SectionLabel = ({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) => (
  <div className={`kicker text-ink-muted px-1 mb-2 ${className}`}>{children}</div>
);

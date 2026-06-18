import type { ReactNode } from "react";

// Standard-Glasfläche des Portals (frosted card über der Aurora).
export const Surface = ({
  children,
  className = "",
  padding = "p-4",
  sheen = false,
}: {
  children: ReactNode;
  className?: string;
  padding?: string;
  sheen?: boolean;
}) => (
  <div
    className={`glass-card rounded-card ${sheen ? "glass-sheen" : ""} ${padding} ${className}`}
  >
    {children}
  </div>
);

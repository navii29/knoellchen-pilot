import type { TicketStatus } from "./types";

export const THEME = {
  primary: "#0d9488",
  primaryLight: "#5eead4",
  primaryTint: "#ccfbf1",
};

export const STATUS_META: Record<
  TicketStatus,
  { label: string; dot: string; bg: string; text: string; ring: string }
> = {
  neu: { label: "Neu", dot: "#f59e0b", bg: "bg-amber-50", text: "text-amber-700", ring: "ring-amber-200" },
  zugeordnet: { label: "Zugeordnet", dot: "#2563eb", bg: "bg-blue-50", text: "text-blue-700", ring: "ring-blue-200" },
  weiterbelastet: { label: "Weiterbelastet", dot: "#7c3aed", bg: "bg-violet-50", text: "text-violet-700", ring: "ring-violet-200" },
  bezahlt: { label: "Bezahlt", dot: "#059669", bg: "bg-emerald-50", text: "text-emerald-700", ring: "ring-emerald-200" },
};

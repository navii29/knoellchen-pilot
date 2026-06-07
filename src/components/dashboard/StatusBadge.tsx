import type { TicketStatus } from "@/lib/types";
import { StatusPill } from "@/components/ui/StatusPill";

/**
 * Back-compat wrapper — delegates to the Leitstelle StatusPill so every existing
 * usage across the dashboard picks up the new mono pipeline chip automatically.
 */
export const StatusBadge = ({ status }: { status: TicketStatus }) => (
  <StatusPill status={status} />
);

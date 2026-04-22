import {
  AlarmClock,
  Building2,
  FileSignature,
  Inbox,
  Mail,
  Send,
  UserCheck,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { relTime } from "@/lib/utils";
import type { Contract, TicketLog } from "@/lib/types";

type Item = {
  id: string;
  Icon: LucideIcon;
  color: string;
  text: React.ReactNode;
  created_at: string;
  href?: string;
};

const TICKET_ICONS: Record<string, { Icon: LucideIcon; color: string }> = {
  upload: { Icon: Mail, color: "#f59e0b" },
  inbound: { Icon: Inbox, color: "#f59e0b" },
  parsed: { Icon: Mail, color: "#f59e0b" },
  matched: { Icon: UserCheck, color: "#2563eb" },
  documents: { Icon: Send, color: "#059669" },
  sent_renter: { Icon: Mail, color: "#0d9488" },
  sent_authority: { Icon: Building2, color: "#0d9488" },
  paid: { Icon: Wallet, color: "#059669" },
  reminder: { Icon: AlarmClock, color: "#7c3aed" },
};

const TICKET_LABELS: Record<string, (l: TicketLog) => string> = {
  upload: () => "Strafzettel hochgeladen",
  inbound: (l) => `Strafzettel per E-Mail empfangen${(l.details as { subject?: string })?.subject ? ` — „${(l.details as { subject?: string }).subject}"` : ""}`,
  parsed: () => "KI-Auslesung abgeschlossen",
  matched: (l) => `Fahrer zugeordnet: ${(l.details as { renter_name?: string })?.renter_name ?? "—"}`,
  documents: () => "Dokumente generiert",
  sent_renter: (l) => `E-Mail an Mieter gesendet (${(l.details as { to?: string })?.to ?? "—"})`,
  sent_authority: (l) => `Zeugenfragebogen an Behörde gesendet (${(l.details as { to?: string })?.to ?? "—"})`,
  paid: () => "Zahlung eingegangen",
  reminder: () => "Mahnung ausgelöst",
};

export const ActivityFeed = ({
  ticketLogs,
  contracts,
}: {
  ticketLogs: TicketLog[];
  contracts: Contract[];
}) => {
  const items: Item[] = [];

  for (const l of ticketLogs) {
    const meta = TICKET_ICONS[l.action] || { Icon: Mail, color: "#78716c" };
    const text = (TICKET_LABELS[l.action] || ((x: TicketLog) => x.action))(l);
    items.push({
      id: "tl-" + l.id,
      Icon: meta.Icon,
      color: meta.color,
      text,
      created_at: l.created_at,
      href: `/dashboard/tickets/${l.ticket_id}`,
    });
  }
  for (const c of contracts) {
    if (c.status === "abgeschlossen" && c.actual_return_date) {
      items.push({
        id: "cc-" + c.id,
        Icon: FileSignature,
        color: "#0d9488",
        text: (
          <>
            Vertrag <span className="font-mono text-xs">{c.contract_nr}</span> abgeschlossen ({c.renter_name})
          </>
        ),
        created_at: c.updated_at,
        href: `/dashboard/contracts/${c.id}`,
      });
    } else {
      items.push({
        id: "cn-" + c.id,
        Icon: FileSignature,
        color: "#0d9488",
        text: (
          <>
            Neuer Vertrag <span className="font-mono text-xs">{c.contract_nr}</span> · {c.renter_name}
          </>
        ),
        created_at: c.created_at,
        href: `/dashboard/contracts/${c.id}`,
      });
    }
  }

  items.sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
  const top = items.slice(0, 8);

  return (
    <div className="rounded-xl ring-1 ring-stone-200 bg-white">
      <div className="px-5 py-3.5 border-b border-stone-100 flex items-center justify-between">
        <div className="font-display font-semibold">Aktivität</div>
        <span className="text-xs text-stone-500">Letzte Ereignisse</span>
      </div>
      <div className="p-2">
        {top.length === 0 && (
          <div className="px-3 py-8 text-center text-sm text-stone-500">Noch keine Aktivität.</div>
        )}
        {top.map((it) => (
          <Link
            key={it.id}
            href={it.href || "#"}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-stone-50"
          >
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ background: it.color + "1a", color: it.color }}
            >
              <it.Icon size={14} />
            </div>
            <div className="flex-1 text-sm">{it.text}</div>
            <div className="text-xs text-stone-400">{relTime(it.created_at)}</div>
          </Link>
        ))}
      </div>
    </div>
  );
};

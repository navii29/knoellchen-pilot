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

type ItemTone = "default" | "accent";

type Item = {
  id: string;
  Icon: LucideIcon;
  tone: ItemTone;
  text: React.ReactNode;
  created_at: string;
  href?: string;
};

const TICKET_META: Record<string, { Icon: LucideIcon; tone: ItemTone }> = {
  upload: { Icon: Mail, tone: "default" },
  inbound: { Icon: Inbox, tone: "default" },
  parsed: { Icon: Mail, tone: "default" },
  matched: { Icon: UserCheck, tone: "default" },
  documents: { Icon: Send, tone: "default" },
  sent_renter: { Icon: Mail, tone: "accent" },
  sent_authority: { Icon: Building2, tone: "accent" },
  paid: { Icon: Wallet, tone: "default" },
  reminder: { Icon: AlarmClock, tone: "default" },
};

const TICKET_LABELS: Record<string, (l: TicketLog) => string> = {
  upload: () => "Strafzettel hochgeladen",
  inbound: (l) =>
    `Strafzettel per E-Mail empfangen${
      (l.details as { subject?: string })?.subject ? ` — „${(l.details as { subject?: string }).subject}"` : ""
    }`,
  parsed: () => "KI-Auslesung abgeschlossen",
  matched: (l) => `Fahrer zugeordnet: ${(l.details as { renter_name?: string })?.renter_name ?? "—"}`,
  documents: () => "Dokumente generiert",
  sent_renter: (l) => `E-Mail an Mieter gesendet (${(l.details as { to?: string })?.to ?? "—"})`,
  sent_authority: (l) =>
    `Zeugenfragebogen an Behörde gesendet (${(l.details as { to?: string })?.to ?? "—"})`,
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
    const meta = TICKET_META[l.action] || { Icon: Mail, tone: "default" as ItemTone };
    const text = (TICKET_LABELS[l.action] || ((x: TicketLog) => x.action))(l);
    items.push({
      id: "tl-" + l.id,
      Icon: meta.Icon,
      tone: meta.tone,
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
        tone: "default",
        text: (
          <>
            Vertrag <span className="font-mono text-xs text-ink-muted">{c.contract_nr}</span> abgeschlossen ({c.renter_name})
          </>
        ),
        created_at: c.updated_at,
        href: `/dashboard/contracts/${c.id}`,
      });
    } else {
      items.push({
        id: "cn-" + c.id,
        Icon: FileSignature,
        tone: "default",
        text: (
          <>
            Neuer Vertrag <span className="font-mono text-xs text-ink-muted">{c.contract_nr}</span> · {c.renter_name}
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
    <div className="panel overflow-hidden">
      <div className="px-5 py-4 border-b border-hairline flex items-center justify-between">
        <div className="flex items-center gap-2 font-display font-bold text-[15px] tracking-tight text-ink">
          Aktivität
        </div>
        <span className="kicker text-ink-muted">Letzte Ereignisse</span>
      </div>
      <div className="divide-y divide-hairline">
        {top.length === 0 && (
          <div className="px-5 py-12 text-center text-[13.5px] text-ink-muted">
            Noch keine Aktivität.
          </div>
        )}
        {top.map((it) => (
          <Link
            key={it.id}
            href={it.href || "#"}
            className="flex items-center gap-3.5 px-5 py-3.5 hover:bg-canvas transition-colors"
          >
            <div
              className={`w-8 h-8 rounded-panel border border-hairline flex items-center justify-center shrink-0 ${
                it.tone === "accent"
                  ? "bg-canvas text-signal border-hairline"
                  : "bg-canvas text-ink-muted"
              }`}
            >
              <it.Icon size={13} strokeWidth={1.75} />
            </div>
            <div className="flex-1 text-[13.5px] text-ink truncate">{it.text}</div>
            <div className="font-mono tnum text-[11.5px] text-ink-muted shrink-0">
              {relTime(it.created_at)}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
};

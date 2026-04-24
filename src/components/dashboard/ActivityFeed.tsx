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
            Vertrag <span className="font-mono text-xs text-stone-500">{c.contract_nr}</span> abgeschlossen ({c.renter_name})
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
            Neuer Vertrag <span className="font-mono text-xs text-stone-500">{c.contract_nr}</span> · {c.renter_name}
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
    <div className="rounded-xl bg-white shadow-[0_1px_3px_rgba(0,0,0,0.04)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.06)] transition-shadow duration-200 overflow-hidden">
      <div className="px-6 py-4 border-b border-stone-100 flex items-center justify-between">
        <div className="font-display font-semibold text-stone-900">Aktivität</div>
        <span className="text-xs text-stone-400">Letzte Ereignisse</span>
      </div>
      <div className="divide-y divide-stone-100">
        {top.length === 0 && (
          <div className="px-6 py-10 text-center text-sm text-stone-400">Noch keine Aktivität.</div>
        )}
        {top.map((it) => (
          <Link
            key={it.id}
            href={it.href || "#"}
            className="flex items-center gap-3 px-6 py-3 hover:bg-stone-50 transition-colors"
          >
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                it.tone === "accent" ? "bg-teal-50 text-teal-700" : "bg-stone-100 text-stone-600"
              }`}
            >
              <it.Icon size={13} strokeWidth={1.75} />
            </div>
            <div className="flex-1 text-sm text-stone-700 truncate">{it.text}</div>
            <div className="text-xs text-stone-400 tabular-nums shrink-0">{relTime(it.created_at)}</div>
          </Link>
        ))}
      </div>
    </div>
  );
};

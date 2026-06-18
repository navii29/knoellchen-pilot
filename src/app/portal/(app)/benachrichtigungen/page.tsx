import Link from "next/link";
import { Bell } from "lucide-react";
import { requirePortal } from "@/lib/portal-auth";
import { fmtDate } from "@/lib/utils";
import { Surface } from "@/components/portal/kit/Surface";
import { EmptyState } from "@/components/portal/kit/EmptyState";
import { MarkAllRead } from "@/components/portal/MarkAllRead";

export const dynamic = "force-dynamic";

type N = {
  id: string;
  type: string;
  title: string;
  body: string | null;
  link: string | null;
  read_at: string | null;
  created_at: string;
};

export default async function NotificationsPage() {
  const ctx = await requirePortal();
  if (!ctx) return null;

  const { data } = await ctx.supa
    .from("notifications")
    .select("id, type, title, body, link, read_at, created_at")
    .eq("customer_id", ctx.session.customer_id)
    .order("created_at", { ascending: false })
    .limit(50);
  const list = (data ?? []) as N[];

  return (
    <div className="px-5 py-4 space-y-4">
      <MarkAllRead />
      <h1 className="font-display text-[22px] tracking-tightest font-bold text-ink px-1">
        Benachrichtigungen
      </h1>

      {list.length === 0 ? (
        <Surface>
          <EmptyState
            Icon={Bell}
            title="Keine Benachrichtigungen"
            text="Hier erscheinen Erinnerungen und Updates zu deinen Mieten."
          />
        </Surface>
      ) : (
        <Surface padding="p-0" className="overflow-hidden">
          <div className="divide-y divide-hairline">
            {list.map((n) => {
              const inner = (
                <div className={`px-4 py-3 ${n.read_at ? "" : "bg-signal-soft/50"}`}>
                  <div className="flex items-center gap-2">
                    {!n.read_at && <span className="w-2 h-2 rounded-full bg-signal shrink-0" />}
                    <span className="text-[14px] font-semibold text-ink flex-1">{n.title}</span>
                    <span className="text-[11px] text-ink-muted font-mono tnum shrink-0">
                      {fmtDate(n.created_at)}
                    </span>
                  </div>
                  {n.body && <div className="text-[13px] text-ink-soft mt-0.5">{n.body}</div>}
                </div>
              );
              return n.link ? (
                <Link key={n.id} href={n.link} className="block hover:bg-paper/40 transition-colors">
                  {inner}
                </Link>
              ) : (
                <div key={n.id}>{inner}</div>
              );
            })}
          </div>
        </Surface>
      )}
    </div>
  );
}

"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Bell, Check, CheckCheck } from "lucide-react";
import { fmtDateTime } from "@/lib/utils";

export type OperatorNotification = {
  id: string;
  type: string;
  title: string;
  body: string | null;
  link: string | null;
  read_at: string | null;
  created_at: string;
};

// Liste der Operator-Benachrichtigungen + Mark-Read (einzeln/alle). Schreibt
// ausschließlich read_at über die RLS-Route — KEINE Genehmigung, kein Vertrags-
// /Kosten-Touch. Eine gelesene Benachrichtigung heißt NICHT „Anfrage bearbeitet".
export const OperatorNotificationList = ({ items }: { items: OperatorNotification[] }) => {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [busy, setBusy] = useState(false);

  const hasUnread = items.some((n) => !n.read_at);

  const markRead = async (id: string | null) => {
    setBusy(true);
    await fetch("/api/operator-notifications", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(id ? { id } : {}),
    }).catch(() => {});
    setBusy(false);
    startTransition(() => router.refresh());
  };

  if (items.length === 0) {
    return (
      <div className="panel p-10 text-center">
        <Bell size={22} className="mx-auto text-ink-muted mb-2" />
        <div className="font-display font-semibold text-ink text-[15px]">
          Keine Benachrichtigungen
        </div>
        <div className="text-[13px] text-ink-muted mt-0.5">
          Hier erscheinen u.a. neue Verlängerungs-Anfragen deiner Mieter.
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {hasUnread && (
        <div className="flex justify-end">
          <button
            onClick={() => markRead(null)}
            disabled={busy || pending}
            className="inline-flex items-center gap-1.5 text-[12.5px] px-3 py-1.5 rounded-btn border border-hairline text-ink-soft hover:text-ink hover:bg-black/[0.03] transition-colors disabled:opacity-50"
          >
            <CheckCheck size={13} /> Alle als gelesen
          </button>
        </div>
      )}

      <div className="panel p-0 overflow-hidden divide-y divide-hairline">
        {items.map((n) => {
          const inner = (
            <div className={`px-4 py-3 ${n.read_at ? "" : "bg-signal-soft/40"}`}>
              <div className="flex items-center gap-2">
                {!n.read_at && <span className="w-2 h-2 rounded-full bg-signal shrink-0" />}
                <span className="text-[14px] font-semibold text-ink flex-1 min-w-0 truncate">
                  {n.title}
                </span>
                <span className="text-[11px] text-ink-muted font-mono tnum shrink-0">
                  {fmtDateTime(n.created_at)}
                </span>
              </div>
              {n.body && <div className="text-[13px] text-ink-soft mt-0.5">{n.body}</div>}
            </div>
          );
          return (
            <div key={n.id} className="flex items-stretch">
              {n.link ? (
                <Link href={n.link} className="block flex-1 min-w-0 hover:bg-paper/40 transition-colors">
                  {inner}
                </Link>
              ) : (
                <div className="flex-1 min-w-0">{inner}</div>
              )}
              {!n.read_at && (
                <button
                  onClick={() => markRead(n.id)}
                  disabled={busy || pending}
                  title="Als gelesen markieren"
                  aria-label="Als gelesen markieren"
                  className="shrink-0 px-3 flex items-center justify-center text-ink-muted hover:text-ink hover:bg-black/[0.03] transition-colors disabled:opacity-50"
                >
                  <Check size={15} />
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

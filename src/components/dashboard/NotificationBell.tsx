"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Bell } from "lucide-react";
import { formatNotificationBadge } from "@/lib/operator-notify-ui";

// Glocke in der Topbar: holt den Ungelesen-Zähler (RLS-scoped serverseitig in
// der Route) und verlinkt auf die Benachrichtigungs-Seite. Reine Anzeige.
export const NotificationBell = () => {
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    let alive = true;
    fetch("/api/operator-notifications")
      .then((r) => (r.ok ? r.json() : { unread: 0 }))
      .then((j) => {
        if (alive) setUnread(typeof j.unread === "number" ? j.unread : 0);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  const badge = formatNotificationBadge(unread);

  return (
    <Link
      href="/dashboard/benachrichtigungen"
      className="relative touch-target hidden md:flex items-center justify-center w-9 h-9 rounded-full text-ink-muted hover:text-ink hover:bg-black/[0.04] transition-colors"
      aria-label={badge ? `Benachrichtigungen (${badge} ungelesen)` : "Benachrichtigungen"}
    >
      <Bell size={16} />
      {badge && (
        <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 rounded-full bg-signal text-white text-[10px] font-semibold leading-4 text-center tnum">
          {badge}
        </span>
      )}
    </Link>
  );
};

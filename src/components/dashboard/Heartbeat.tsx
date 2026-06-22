"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

/**
 * Sendet ~alle 60 s einen Heartbeat, solange der Tab sichtbar ist, plus einmal
 * bei jedem Seitenwechsel (überträgt die aktuelle Seite). Misst die aktive Zeit
 * auf der Plattform fürs Inhaber-Überwachungs-Dashboard.
 */
export const Heartbeat = () => {
  const pathname = usePathname();

  useEffect(() => {
    const ping = () => {
      if (document.visibilityState !== "visible") return;
      fetch("/api/heartbeat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path: window.location.pathname }),
        keepalive: true,
      }).catch(() => {});
    };

    ping(); // sofort beim Laden / bei Navigation
    const id = setInterval(ping, 60_000);
    const onVis = () => {
      if (document.visibilityState === "visible") ping();
    };
    document.addEventListener("visibilitychange", onVis);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [pathname]);

  return null;
};

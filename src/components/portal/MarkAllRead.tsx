"use client";

import { useEffect } from "react";

// Markiert beim Öffnen des Centers alle Benachrichtigungen als gelesen.
export const MarkAllRead = () => {
  useEffect(() => {
    fetch("/api/portal/notifications/read", { method: "POST" }).catch(() => {});
  }, []);
  return null;
};

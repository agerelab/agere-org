"use client";

// The Desk badge count (PRD-10 §6): starts from the server render, then polls every 60 s while the
// tab is visible, on window focus, on navigation, and whenever Kotak masuk changes something.
import * as React from "react";

export const UNREAD_CHANGED = "agere:unread-changed";

/** Kotak masuk calls this after read/archive so the badge follows at once. */
export const announceUnreadChanged = () => window.dispatchEvent(new Event(UNREAD_CHANGED));

export function useUnread(base: string, initial: number, path: string) {
  const [count, setCount] = React.useState(initial);
  const refresh = React.useCallback(() => {
    if (document.visibilityState !== "visible") return;
    fetch(`${base}/api/notifications/unread-count`, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((j: { count?: number } | null) => {
        if (typeof j?.count === "number") setCount(j.count);
      })
      .catch(() => {});
  }, [base]);

  React.useEffect(() => {
    const timer = window.setInterval(refresh, 60_000);
    window.addEventListener("focus", refresh);
    window.addEventListener(UNREAD_CHANGED, refresh);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("focus", refresh);
      window.removeEventListener(UNREAD_CHANGED, refresh);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, [refresh]);

  // Navigating (e.g. opening an item) may have read something.
  React.useEffect(() => {
    const id = window.setTimeout(refresh, 300);
    return () => window.clearTimeout(id);
  }, [path, refresh]);

  return count;
}

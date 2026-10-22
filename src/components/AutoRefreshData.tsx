"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * Keeps server-rendered inventory and dashboard data fresh for every authenticated role.
 * Polling pauses while the browser is offline or the tab is hidden, and when the page
 * is in the middle of an offline-first sync-sensitive session.
 */
export default function AutoRefreshData() {
  const router = useRouter();

  useEffect(() => {
    let refreshing = false;

    const refreshIfNeeded = () => {
      if (
        refreshing ||
        document.visibilityState !== "visible" ||
        !navigator.onLine
      ) {
        return;
      }

      refreshing = true;
      router.refresh();

      // Allow the App Router refresh to finish before another poll can be started.
      window.setTimeout(() => {
        refreshing = false;
      }, 1500);
    };

    const interval = window.setInterval(refreshIfNeeded, 10000);

    const handleOnline = () => refreshIfNeeded();
    window.addEventListener("online", handleOnline);

    return () => {
      window.clearInterval(interval);
      window.removeEventListener("online", handleOnline);
    };
  }, [router]);

  return null;
}

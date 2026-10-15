"use client";

import { useCallback, useEffect, useState } from "react";
import { getPendingSales, syncPendingSales } from "@/lib/offline-sales-queue";

export default function OfflineStatus() {
  const [isOnline, setIsOnline] = useState(true);
  const [pendingCount, setPendingCount] = useState(0);
  const [syncMessage, setSyncMessage] = useState("");

  const refreshPendingCount = useCallback(async () => {
    try {
      const pending = await getPendingSales();
      setPendingCount(pending.length);
      const failed = pending.find((sale) => sale.lastError);
      setSyncMessage(failed?.lastError ? `A queued sale needs attention: ${failed.lastError}` : "");
    } catch {
      // Browsers without IndexedDB still get connection status; queueing itself reports errors.
    }
  }, []);

  const synchronize = useCallback(async () => {
    setIsOnline(navigator.onLine);
    if (!navigator.onLine) {
      await refreshPendingCount();
      return;
    }

    try {
      const result = await syncPendingSales();
      await refreshPendingCount();
      if (result.synced > 0) {
        setSyncMessage(`${result.synced} queued sale(s) synchronized.`);
        window.dispatchEvent(new Event("offline-sales-synced"));
      }
    } catch {
      setSyncMessage("Could not check queued sales. They remain stored on this device.");
    }
  }, [refreshPendingCount]);

  useEffect(() => {
    const handleConnectionChange = () => void synchronize();
    const handleQueueChange = () => void refreshPendingCount();

    void synchronize();
    window.addEventListener("online", handleConnectionChange);
    window.addEventListener("offline", handleConnectionChange);
    window.addEventListener("offline-sales-updated", handleQueueChange);

    return () => {
      window.removeEventListener("online", handleConnectionChange);
      window.removeEventListener("offline", handleConnectionChange);
      window.removeEventListener("offline-sales-updated", handleQueueChange);
    };
  }, [refreshPendingCount, synchronize]);

  if (isOnline && pendingCount === 0 && !syncMessage) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className={`sticky top-0 z-[100] border-b px-4 py-3 text-center text-sm font-medium ${
        isOnline
          ? "border-blue-200 bg-blue-50 text-blue-950"
          : "border-amber-300 bg-amber-50 text-amber-950"
      }`}
    >
      {!isOnline && (
        <p>
          You are offline. Inventory data may be out of date. A sale can be
          queued from the sales form, but it is not confirmed in central inventory until sync succeeds.
        </p>
      )}
      {pendingCount > 0 && (
        <p className="mt-1">
          {pendingCount} sale(s) waiting to sync. Keep this browser profile and
          its site data; queued sales are not yet confirmed in central inventory.
        </p>
      )}
      {isOnline && pendingCount === 0 && syncMessage && (
        <p>{syncMessage}</p>
      )}
      {syncMessage && pendingCount > 0 && (
        <p className="mt-1">{syncMessage}</p>
      )}
      {isOnline && pendingCount > 0 && (
        <button
          type="button"
          onClick={() => void synchronize()}
          className="mt-2 rounded-md border border-current px-3 py-1 text-xs font-semibold hover:bg-white/60"
        >
          Retry synchronization
        </button>
      )}
    </div>
  );
}

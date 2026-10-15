"use client";

import { useCallback, useEffect, useState } from "react";
import { getPendingSales, getPendingOperations, syncPendingSales, syncPendingOperations } from "@/lib/offline-sales-queue";

export default function OfflineStatus() {
  const [isOnline, setIsOnline] = useState(true);
  const [pendingCount, setPendingCount] = useState(0);
  const [pendingSales, setPendingSales] = useState<Awaited<ReturnType<typeof getPendingSales>>>([]);
  const [pendingOperations, setPendingOperations] = useState<Awaited<ReturnType<typeof getPendingOperations>>>([]);
  const [syncMessage, setSyncMessage] = useState("");

  const refreshPendingCount = useCallback(async () => {
    try {
      const [pending, operations] = await Promise.all([getPendingSales(), getPendingOperations()]);
      setPendingSales(pending);
      setPendingOperations(operations);
      setPendingCount(pending.length + operations.length);
      const failedSale = pending.find((sale) => sale.lastError);
      const failedOperation = operations.find((operation) => operation.lastError);
      setSyncMessage(failedSale?.lastError ? `A queued sale needs attention: ${failedSale.lastError}` : failedOperation?.lastError ? `A queued operation needs attention: ${failedOperation.lastError}` : "");
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
      const [salesResult, operationsResult] = await Promise.all([syncPendingSales(), syncPendingOperations()]);
      await refreshPendingCount();
      const syncedTotal = salesResult.synced + operationsResult.synced;
      if (syncedTotal > 0) {
        setSyncMessage(`${syncedTotal} queued operation(s) synchronized.`);
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
    window.addEventListener("offline-operations-updated", handleQueueChange);

    return () => {
      window.removeEventListener("online", handleConnectionChange);
      window.removeEventListener("offline", handleConnectionChange);
      window.removeEventListener("offline-sales-updated", handleQueueChange);
      window.removeEventListener("offline-operations-updated", handleQueueChange);
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
        <div className="mx-auto mt-2 max-w-2xl text-left">
          <p className="text-center">
            {pendingCount} queued operation(s) waiting to sync. Keep this browser profile and
            its site data; queued work is not yet confirmed in central inventory.
          </p>
          <ul className="mt-2 space-y-1 text-xs">
            {pendingSales.map((sale) => (
              <li key={sale.requestId} className="rounded border border-current/15 px-2 py-1">
                <span className="font-semibold">{sale.productLabel ?? sale.finishedItemId}</span>
                {` — ${sale.soldQuantity} ${sale.unit ?? "units"} · ${new Date(sale.createdAt).toLocaleString()}`}
                {sale.lastError && <span className="block font-medium">Needs attention: {sale.lastError}</span>}
              </li>
            ))}
          </ul>
          {pendingOperations.length > 0 && (
            <ul className="mt-2 space-y-1 text-xs">
              {pendingOperations.map((operation) => (
                <li key={operation.requestId} className="rounded border border-current/15 px-2 py-1">
                  <span className="font-semibold">{operation.label}</span>
                  { ` · ${new Date(operation.createdAt).toLocaleString()}` }
                  {operation.lastError && <span className="block font-medium">Needs attention: {operation.lastError}</span>}
                </li>
              ))}
            </ul>
          )}
        </div>
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

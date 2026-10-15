"use client";

import { useEffect, useState } from "react";

/**
 * Shows connection state only. It does not claim that offline inventory
 * changes are saved or synchronized; transaction queuing is a separate layer.
 */
export default function OfflineStatus() {
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    const updateConnection = () => setIsOnline(navigator.onLine);

    updateConnection();
    window.addEventListener("online", updateConnection);
    window.addEventListener("offline", updateConnection);

    return () => {
      window.removeEventListener("online", updateConnection);
      window.removeEventListener("offline", updateConnection);
    };
  }, []);

  if (isOnline) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="sticky top-0 z-[100] border-b border-amber-300 bg-amber-50 px-4 py-3 text-center text-sm font-medium text-amber-950"
    >
      You are offline. Inventory and transactions may be out of date. Do not
      record or change stock until the connection returns; offline transaction
      saving is not enabled yet.
    </div>
  );
}

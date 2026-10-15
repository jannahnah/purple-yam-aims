export type PendingOfflineSale = {
  requestId: string;
  branchId: string;
  finishedItemId: string;
  soldQuantity: number;
  createdAt: string;
  lastError?: string;
};

const DATABASE_NAME = "purple-yam-aims-offline";
const DATABASE_VERSION = 1;
const STORE_NAME = "pending-sales";

function openDatabase(): Promise<IDBDatabase> {
  if (typeof window === "undefined" || !("indexedDB" in window)) {
    return Promise.reject(new Error("Offline storage is not available in this browser."));
  }

  return new Promise((resolve, reject) => {
    const request = window.indexedDB.open(DATABASE_NAME, DATABASE_VERSION);

    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(STORE_NAME)) {
        database.createObjectStore(STORE_NAME, { keyPath: "requestId" });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("Could not open offline storage."));
  });
}

export async function savePendingSale(
  sale: Omit<PendingOfflineSale, "createdAt">
): Promise<void> {
  const database = await openDatabase();
  try {
    await new Promise<void>((resolve, reject) => {
      const transaction = database.transaction(STORE_NAME, "readwrite");
      transaction.objectStore(STORE_NAME).put({
        ...sale,
        createdAt: new Date().toISOString(),
      } satisfies PendingOfflineSale);
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error ?? new Error("Could not save the offline sale."));
      transaction.onabort = () => reject(transaction.error ?? new Error("Offline sale save was cancelled."));
    });
  } finally {
    database.close();
  }
}

export async function getPendingSales(): Promise<PendingOfflineSale[]> {
  const database = await openDatabase();
  try {
    return await new Promise((resolve, reject) => {
      const transaction = database.transaction(STORE_NAME, "readonly");
      const request = transaction.objectStore(STORE_NAME).getAll();
      request.onsuccess = () =>
        resolve((request.result as PendingOfflineSale[]).sort((a, b) => a.createdAt.localeCompare(b.createdAt)));
      request.onerror = () => reject(request.error ?? new Error("Could not read queued sales."));
    });
  } finally {
    database.close();
  }
}

export async function removePendingSale(requestId: string): Promise<void> {
  const database = await openDatabase();
  try {
    await new Promise<void>((resolve, reject) => {
      const transaction = database.transaction(STORE_NAME, "readwrite");
      transaction.objectStore(STORE_NAME).delete(requestId);
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error ?? new Error("Could not remove synchronized sale."));
    });
  } finally {
    database.close();
  }
}

export async function setPendingSaleError(requestId: string, lastError: string): Promise<void> {
  const database = await openDatabase();
  try {
    await new Promise<void>((resolve, reject) => {
      const transaction = database.transaction(STORE_NAME, "readwrite");
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get(requestId);
      request.onsuccess = () => {
        if (request.result) store.put({ ...request.result, lastError });
      };
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error ?? new Error("Could not update queued sale status."));
    });
  } finally {
    database.close();
  }
}

/** Serial sync plus server-side idempotency prevents replaying a sale twice. */
export async function syncPendingSales(): Promise<{ synced: number; pending: number }> {
  if (typeof navigator === "undefined" || !navigator.onLine) {
    return { synced: 0, pending: (await getPendingSales()).length };
  }

  const pending = await getPendingSales();
  let synced = 0;

  for (const sale of pending) {
    try {
      const response = await fetch("/api/offline/sales", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({
          requestId: sale.requestId,
          branchId: sale.branchId,
          finishedItemId: sale.finishedItemId,
          soldQuantity: sale.soldQuantity,
        }),
      });
      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        const reason = typeof result.error === "string" ? result.error : "Sale could not be synchronized.";
        await setPendingSaleError(sale.requestId, reason);
        // Keep order intact: don't submit later sales ahead of a rejected one.
        break;
      }

      await removePendingSale(sale.requestId);
      synced += 1;
    } catch {
      // Keep the sale for the next connection attempt.
      break;
    }
  }

  return { synced, pending: (await getPendingSales()).length };
}

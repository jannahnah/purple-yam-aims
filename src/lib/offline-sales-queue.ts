export type PendingOfflineSale = {
  requestId: string;
  userId: string;
  branchId: string;
  finishedItemId: string;
  soldQuantity: number;
  productLabel?: string;
  unit?: string;
  createdAt: string;
  lastError?: string;
};

const DATABASE_NAME = "purple-yam-aims-offline";
const DATABASE_VERSION = 2;
const STORE_NAME = "pending-sales";
const OPERATIONS_STORE_NAME = "pending-operations";

function notifyQueueChanged() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("offline-sales-updated"));
    window.dispatchEvent(new Event("offline-operations-updated"));
  }
}

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
      if (!database.objectStoreNames.contains(OPERATIONS_STORE_NAME)) {
        database.createObjectStore(OPERATIONS_STORE_NAME, { keyPath: "requestId" });
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
    notifyQueueChanged();
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
    notifyQueueChanged();
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
    notifyQueueChanged();
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
          userId: sale.userId,
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


export type OfflineOperationType = "ADJUSTMENT" | "STOCK_RECEIPT" | "TRANSFER" | "PRODUCTION";

export type PendingOfflineOperation = {
  requestId: string;
  userId: string;
  type: OfflineOperationType;
  payload: Record<string, string | number>;
  label: string;
  createdAt: string;
  lastError?: string;
};

export async function savePendingOperation(
  operation: Omit<PendingOfflineOperation, "createdAt">
): Promise<void> {
  const database = await openDatabase();
  try {
    await new Promise<void>((resolve, reject) => {
      const transaction = database.transaction(OPERATIONS_STORE_NAME, "readwrite");
      transaction.objectStore(OPERATIONS_STORE_NAME).put({
        ...operation,
        createdAt: new Date().toISOString(),
      } satisfies PendingOfflineOperation);
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error ?? new Error("Could not save the offline operation."));
      transaction.onabort = () => reject(transaction.error ?? new Error("Offline operation save was cancelled."));
    });
  } finally {
    database.close();
    notifyQueueChanged();
  }
}

export async function getPendingOperations(): Promise<PendingOfflineOperation[]> {
  const database = await openDatabase();
  try {
    return await new Promise((resolve, reject) => {
      const transaction = database.transaction(OPERATIONS_STORE_NAME, "readonly");
      const request = transaction.objectStore(OPERATIONS_STORE_NAME).getAll();
      request.onsuccess = () => resolve((request.result as PendingOfflineOperation[]).sort((a, b) => a.createdAt.localeCompare(b.createdAt)));
      request.onerror = () => reject(request.error ?? new Error("Could not read queued operations."));
    });
  } finally {
    database.close();
  }
}

async function updatePendingOperationError(requestId: string, lastError: string): Promise<void> {
  const database = await openDatabase();
  try {
    await new Promise<void>((resolve, reject) => {
      const transaction = database.transaction(OPERATIONS_STORE_NAME, "readwrite");
      const store = transaction.objectStore(OPERATIONS_STORE_NAME);
      const request = store.get(requestId);
      request.onsuccess = () => {
        if (request.result) store.put({ ...request.result, lastError });
      };
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error ?? new Error("Could not update queued operation status."));
    });
  } finally {
    database.close();
    notifyQueueChanged();
  }
}

async function removePendingOperation(requestId: string): Promise<void> {
  const database = await openDatabase();
  try {
    await new Promise<void>((resolve, reject) => {
      const transaction = database.transaction(OPERATIONS_STORE_NAME, "readwrite");
      transaction.objectStore(OPERATIONS_STORE_NAME).delete(requestId);
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error ?? new Error("Could not remove synchronized operation."));
    });
  } finally {
    database.close();
    notifyQueueChanged();
  }
}

/** Sync inventory operations in order; the server validates permissions and deduplicates every request. */
export async function syncPendingOperations(): Promise<{ synced: number; pending: number }> {
  if (typeof navigator === "undefined" || !navigator.onLine) {
    return { synced: 0, pending: (await getPendingOperations()).length };
  }

  const pending = await getPendingOperations();
  let synced = 0;
  for (const operation of pending) {
    try {
      const response = await fetch("/api/offline/operations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({
          requestId: operation.requestId,
          userId: operation.userId,
          type: operation.type,
          payload: operation.payload,
        }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        const reason = typeof result.error === "string" ? result.error : "Operation could not be synchronized.";
        await updatePendingOperationError(operation.requestId, reason);
        break;
      }
      await removePendingOperation(operation.requestId);
      synced += 1;
    } catch {
      break;
    }
  }
  return { synced, pending: (await getPendingOperations()).length };
}


/**
 * One serial outbox across sales and inventory operations. Keeping a single
 * chronological order avoids replaying later inventory work ahead of earlier work.
 */
export async function syncAllPendingWork(): Promise<{ synced: number; pending: number }> {
  if (typeof navigator === "undefined" || !navigator.onLine) {
    const [sales, operations] = await Promise.all([getPendingSales(), getPendingOperations()]);
    return { synced: 0, pending: sales.length + operations.length };
  }

  const [sales, operations] = await Promise.all([getPendingSales(), getPendingOperations()]);
  const queue = [
    ...sales.map((record) => ({ kind: "SALE" as const, createdAt: record.createdAt, record })),
    ...operations.map((record) => ({ kind: "OPERATION" as const, createdAt: record.createdAt, record })),
  ].sort((a, b) => a.createdAt.localeCompare(b.createdAt));

  let synced = 0;
  for (const entry of queue) {
    try {
      let endpoint: string;
      let body: Record<string, unknown>;
      if (entry.kind === "SALE") {
        const sale = entry.record;
        endpoint = "/api/offline/sales";
        body = {
          requestId: sale.requestId,
          userId: sale.userId,
          branchId: sale.branchId,
          finishedItemId: sale.finishedItemId,
          soldQuantity: sale.soldQuantity,
        };
      } else {
        const operation = entry.record;
        endpoint = "/api/offline/operations";
        body = {
          requestId: operation.requestId,
          userId: operation.userId,
          type: operation.type,
          payload: operation.payload,
        };
      }

      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify(body),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        const reason = typeof result.error === "string" ? result.error : "Operation could not be synchronized.";
        if (entry.kind === "SALE") await setPendingSaleError(entry.record.requestId, reason);
        else await updatePendingOperationError(entry.record.requestId, reason);
        break;
      }
      if (entry.kind === "SALE") await removePendingSale(entry.record.requestId);
      else await removePendingOperation(entry.record.requestId);
      synced += 1;
    } catch {
      // Leave the current and later entries in the outbox for a safe retry.
      break;
    }
  }

  const [remainingSales, remainingOperations] = await Promise.all([getPendingSales(), getPendingOperations()]);
  return { synced, pending: remainingSales.length + remainingOperations.length };
}

# Offline-first implementation notes

## Current scope

This branch adds an offline outbox for **sales, stock adjustments, stock receipts, transfers, and production runs**:

- The service worker serves an offline fallback page when a navigation cannot reach the server; the fallback can show a count of saved pending work without caching authenticated pages.
- The app shows a connection-status banner.
- If the Sales form is already open when connectivity is lost, a cashier can save a sale draft in IndexedDB.
- Queued sales are displayed with product, quantity, timestamp, and any synchronization error.
- When connectivity returns, the app submits queued sales in order.
- Every queued action has a unique request ID. Sales use the stock transaction request ID; adjustments, receipts, transfers, and production use an idempotency record written atomically with the inventory changes.
- The server re-checks the current session, original user, role/branch access, item status, and current stock before committing.
- All queued work is synchronized in chronological order through one guarded outbox runner. A rejected operation blocks later work until the queue is retried or reconciled.
- Physical-count adjustments are queued as an absolute count and converted to a delta against server-side stock at synchronization time, avoiding reliance on stale offline quantities.
- The inventory action forms can queue work if the form is already loaded when the connection is lost. Production still requires its recipe to have been loaded before going offline.

## Important boundaries

- A queued sale is **not confirmed** until the server accepts it.
- A cashier should keep the same browser profile and site data until queued sales are synchronized.
- The Sales page must already be loaded before connectivity is lost. Reloading or opening a new route offline may show the fallback page; authenticated pages are not cached as HTML to avoid exposing one user's data to another user on a shared device.
- Inventory item creation/editing, user management, settings, and other non-transactional writes are not queued offline.
- The queue is stored per browser profile/device; it is not a cross-device or server-side draft queue.
- A physical-count adjustment that has become a no-op by sync time is rejected for reconciliation instead of creating a zero-delta transaction.
- If stock has changed elsewhere, or the original account cannot be authenticated, the queued sale remains pending and displays the error. It must be reconciled rather than blindly discarded.
- Do not merge or deploy this branch until the database migration and build have been verified.

## Sale occurrence and synchronization timestamps

- New sales capture `occurredAt` from the cashier's device when the cashier confirms the sale. Offline sales carry that same ISO timestamp in the IndexedDB outbox and submit it unchanged during synchronization.
- `StockTransaction.createdAt` remains the server-side record creation time. Sales History labels these separately as **Sale time** and **Synced to system**.
- Older transactions may have no `occurredAt`; the UI falls back to `createdAt` for their displayed sale time. Older queued sales without an explicit occurrence timestamp fall back to their queue timestamp.
- The occurrence time relies on the device clock and is not independent proof of when the sale happened. Retaining both timestamps makes delays and clock-related limitations more transparent.

## Database change

The migrations add a nullable unique requestId to StockTransaction and create the OfflineOperation idempotency table. Apply migrations through the normal Prisma deployment workflow before enabling the new sync endpoints in a deployed environment.

## Test checklist for the later test phase

1. Run Prisma validation and generate the Prisma Client from the updated schema.
2. Run lint and a production build.
3. Verify online and offline sales, stock adjustments, stock receipts, transfers, and production runs.
4. Verify each offline form saves a pending item and clearly indicates it is not yet confirmed centrally.
5. Restore connectivity and verify the queue drains in chronological order and each inventory change is applied exactly once.
6. Simulate a lost response / retry for every operation type and verify idempotency prevents duplicate stock changes.
7. Verify stale stock, insufficient stock, inactive items, invalid recipe/production stock, wrong branch, and a different signed-in user are rejected and remain visible as pending errors.
8. Verify a queued physical count is applied against the latest server stock and that a no-op or invalid adjustment is not silently discarded.
9. Confirm the live main branch and production database remain untouched until review and approval.

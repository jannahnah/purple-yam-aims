# Offline-first implementation notes

## Current scope

This branch adds a first offline transaction slice for **sales only**:

- The service worker serves an offline fallback page when a navigation cannot reach the server.
- The app shows a connection-status banner.
- If the Sales form is already open when connectivity is lost, a cashier can save a sale draft in IndexedDB.
- Queued sales are displayed with product, quantity, timestamp, and any synchronization error.
- When connectivity returns, the app submits queued sales in order.
- Each queued sale has a unique request ID stored on the stock transaction, so retrying a committed request does not deduct stock a second time.
- The server re-checks the current session, original user, role/branch access, active finished product, and current stock before committing.

## Important boundaries

- A queued sale is **not confirmed** until the server accepts it.
- A cashier should keep the same browser profile and site data until queued sales are synchronized.
- The Sales page must already be loaded before connectivity is lost. Reloading or opening a new route offline may show the fallback page; authenticated pages are not cached as HTML to avoid exposing one user's data to another user on a shared device.
- Stock adjustments, transfers, production, and other writes are not queued offline in this phase.
- If stock has changed elsewhere, or the original account cannot be authenticated, the queued sale remains pending and displays the error. It must be reconciled rather than blindly discarded.
- Do not merge or deploy this branch until the database migration and build have been verified.

## Database change

The migration 20261015090000_add_stock_transaction_request_id adds a nullable unique requestId to StockTransaction. Apply migrations through the normal Prisma deployment workflow before enabling the new sync endpoint in a deployed environment.

## Test checklist for the later test phase

1. Run Prisma validation and generate the Prisma Client from the updated schema.
2. Run lint and a production build.
3. Verify a normal online sale still works and writes one SALE transaction with before/change/after quantities.
4. Verify offline sale saving and the pending banner.
5. Restore connectivity and verify the queue drains and stock decreases exactly once.
6. Simulate a lost response / retry and verify the same request ID never creates a second deduction.
7. Verify insufficient stock, inactive products, wrong branch, and a different signed-in user are rejected and remain visible as pending errors.
8. Confirm the live main branch and production database remain untouched until review and approval.

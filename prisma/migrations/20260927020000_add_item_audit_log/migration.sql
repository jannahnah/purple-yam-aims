CREATE TABLE "ItemAuditLog" (
    "id" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "performedById" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "field" TEXT,
    "previousValue" TEXT,
    "currentValue" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ItemAuditLog_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ItemAuditLog_itemId_idx" ON "ItemAuditLog"("itemId");
CREATE INDEX "ItemAuditLog_performedById_idx" ON "ItemAuditLog"("performedById");
CREATE INDEX "ItemAuditLog_createdAt_idx" ON "ItemAuditLog"("createdAt");

ALTER TABLE "ItemAuditLog"
ADD CONSTRAINT "ItemAuditLog_itemId_fkey"
FOREIGN KEY ("itemId") REFERENCES "Item"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "ItemAuditLog"
ADD CONSTRAINT "ItemAuditLog_performedById_fkey"
FOREIGN KEY ("performedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

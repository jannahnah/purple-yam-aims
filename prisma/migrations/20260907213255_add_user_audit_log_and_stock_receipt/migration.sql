-- CreateTable
CREATE TABLE "UserAuditLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "performedById" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "field" TEXT,
    "previousValue" TEXT,
    "currentValue" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserAuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "UserAuditLog_userId_idx" ON "UserAuditLog"("userId");

-- CreateIndex
CREATE INDEX "UserAuditLog_performedById_idx" ON "UserAuditLog"("performedById");

-- CreateIndex
CREATE INDEX "UserAuditLog_createdAt_idx" ON "UserAuditLog"("createdAt");

-- AddForeignKey
ALTER TABLE "UserAuditLog" ADD CONSTRAINT "UserAuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserAuditLog" ADD CONSTRAINT "UserAuditLog_performedById_fkey" FOREIGN KEY ("performedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

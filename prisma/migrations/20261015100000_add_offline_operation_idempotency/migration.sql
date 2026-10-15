CREATE TABLE "OfflineOperation" (
    "id" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "operationType" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OfflineOperation_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "OfflineOperation_requestId_key"
ON "OfflineOperation"("requestId");

CREATE INDEX "OfflineOperation_userId_idx"
ON "OfflineOperation"("userId");

CREATE INDEX "OfflineOperation_createdAt_idx"
ON "OfflineOperation"("createdAt");

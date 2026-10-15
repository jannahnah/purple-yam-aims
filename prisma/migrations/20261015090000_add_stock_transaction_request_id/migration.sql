ALTER TABLE "StockTransaction"
ADD COLUMN "requestId" TEXT;

CREATE UNIQUE INDEX "StockTransaction_requestId_key"
ON "StockTransaction"("requestId");

ALTER TYPE "TransactionType" ADD VALUE 'SPOILAGE';
ALTER TABLE "StockTransaction" ADD COLUMN "reason" TEXT;

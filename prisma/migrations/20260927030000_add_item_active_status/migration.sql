ALTER TABLE "Item"
ADD COLUMN "isActive" BOOLEAN NOT NULL DEFAULT true;

CREATE INDEX "Item_isActive_idx" ON "Item"("isActive");

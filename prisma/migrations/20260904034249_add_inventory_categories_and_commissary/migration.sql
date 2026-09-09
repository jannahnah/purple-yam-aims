-- CreateEnum
CREATE TYPE "ItemCategory" AS ENUM ('RAW_MATERIAL', 'PACKAGING');

-- AlterTable
ALTER TABLE "Branch" ADD COLUMN     "isCommissary" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Item" ADD COLUMN     "category" "ItemCategory" NOT NULL DEFAULT 'RAW_MATERIAL';

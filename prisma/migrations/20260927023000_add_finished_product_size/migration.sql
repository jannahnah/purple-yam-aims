CREATE TYPE "FinishedProductSize" AS ENUM ('SMALL', 'ROUND', 'MEDIUM', 'LARGE');

ALTER TABLE "Item"
ADD COLUMN "size" "FinishedProductSize";

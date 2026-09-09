/*
  Warnings:

  - A unique constraint covering the columns `[email]` on the table `User` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "email" TEXT,
ADD COLUMN     "lastLoginAt" TIMESTAMP(3),
ADD COLUMN     "name" TEXT,
ADD COLUMN     "status" "UserStatus" NOT NULL DEFAULT 'ACTIVE';

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

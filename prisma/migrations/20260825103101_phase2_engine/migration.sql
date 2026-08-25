/*
  Warnings:

  - Added the required column `coveredDate` to the `StreakFreeze` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "SessionKind" AS ENUM ('DAILY', 'REPLAY');

-- DropIndex
DROP INDEX "Session_userId_date_key";

-- AlterTable
ALTER TABLE "Attempt" ADD COLUMN     "xpAwarded" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "Session" ADD COLUMN     "kind" "SessionKind" NOT NULL DEFAULT 'DAILY',
ADD COLUMN     "xpAwarded" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "StreakFreeze" ADD COLUMN     "coveredDate" DATE NOT NULL;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "onboardedAt" TIMESTAMP(3),
ADD COLUMN     "soundOn" BOOLEAN NOT NULL DEFAULT true;

-- CreateIndex
CREATE INDEX "Session_userId_date_idx" ON "Session"("userId", "date");

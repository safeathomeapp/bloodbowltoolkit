-- AlterTable
ALTER TABLE "MatchSession"
ADD COLUMN "homeFinalSignoffAt" TIMESTAMP(3),
ADD COLUMN "awayFinalSignoffAt" TIMESTAMP(3),
ADD COLUMN "closedAt" TIMESTAMP(3);

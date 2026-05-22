-- CreateEnum
CREATE TYPE "MatchSessionCasualtyResolutionType" AS ENUM ('NONE', 'MISS_NEXT_GAME', 'NIGGLING_INJURY');

-- AlterTable
ALTER TABLE "TeamPlayer"
ADD COLUMN "missNextGame" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "MatchSessionCasualtyResolution" (
    "id" TEXT NOT NULL,
    "matchSessionId" TEXT NOT NULL,
    "matchSessionEventId" TEXT NOT NULL,
    "resolutionType" "MatchSessionCasualtyResolutionType" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MatchSessionCasualtyResolution_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MatchSessionCasualtyResolution_matchSessionEventId_key" ON "MatchSessionCasualtyResolution"("matchSessionEventId");

-- CreateIndex
CREATE INDEX "MatchSessionCasualtyResolution_matchSessionId_idx" ON "MatchSessionCasualtyResolution"("matchSessionId");

-- AddForeignKey
ALTER TABLE "MatchSessionCasualtyResolution" ADD CONSTRAINT "MatchSessionCasualtyResolution_matchSessionId_fkey" FOREIGN KEY ("matchSessionId") REFERENCES "MatchSession"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MatchSessionCasualtyResolution" ADD CONSTRAINT "MatchSessionCasualtyResolution_matchSessionEventId_fkey" FOREIGN KEY ("matchSessionEventId") REFERENCES "MatchSessionEvent"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

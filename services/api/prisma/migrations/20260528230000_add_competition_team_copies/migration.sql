-- AlterTable
ALTER TABLE "Team"
ADD COLUMN "baseTeamId" TEXT,
ADD COLUMN "competitionEntryId" TEXT,
ADD COLUMN "isCompetitionCopy" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "competitionLocked" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "competitionLockedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "CompetitionTeamSubmission"
ADD COLUMN "competitionTeamId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Team_competitionEntryId_key" ON "Team"("competitionEntryId");

-- CreateIndex
CREATE UNIQUE INDEX "CompetitionTeamSubmission_competitionTeamId_key" ON "CompetitionTeamSubmission"("competitionTeamId");

-- AddForeignKey
ALTER TABLE "Team" ADD CONSTRAINT "Team_baseTeamId_fkey" FOREIGN KEY ("baseTeamId") REFERENCES "Team"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Team" ADD CONSTRAINT "Team_competitionEntryId_fkey" FOREIGN KEY ("competitionEntryId") REFERENCES "CompetitionEntry"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompetitionTeamSubmission" ADD CONSTRAINT "CompetitionTeamSubmission_competitionTeamId_fkey" FOREIGN KEY ("competitionTeamId") REFERENCES "Team"("id") ON DELETE SET NULL ON UPDATE CASCADE;

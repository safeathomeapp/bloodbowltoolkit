-- CreateEnum
CREATE TYPE "TournamentTeamSourceType" AS ENUM ('COPIED_FROM_TEAM', 'DIRECT_EVENT_BUILD');

-- CreateTable
CREATE TABLE "CompetitionTeamSubmission" (
    "id" TEXT NOT NULL,
    "competitionEntryId" TEXT NOT NULL,
    "sourceType" "TournamentTeamSourceType" NOT NULL,
    "sourceTeamId" TEXT,
    "rosterTemplateId" TEXT NOT NULL,
    "teamName" TEXT NOT NULL,
    "tierId" TEXT,
    "teamValue" INTEGER NOT NULL,
    "draftBudget" INTEGER NOT NULL,
    "rerollCount" INTEGER NOT NULL,
    "assistantCoachCount" INTEGER NOT NULL,
    "cheerleaderCount" INTEGER NOT NULL,
    "dedicatedFans" INTEGER NOT NULL,
    "apothecaryPurchased" BOOLEAN NOT NULL,
    "extraSkillsPackageJson" JSONB NOT NULL,
    "submittedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CompetitionTeamSubmission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CompetitionTeamSubmissionPlayer" (
    "id" TEXT NOT NULL,
    "competitionTeamSubmissionId" TEXT NOT NULL,
    "sourcePlayerId" TEXT,
    "positionTemplateId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "shirtNumber" INTEGER,
    "currentValue" INTEGER NOT NULL,
    "displayOrder" INTEGER NOT NULL,
    "extraSkills" TEXT[],
    "statAdjustments" JSONB NOT NULL,

    CONSTRAINT "CompetitionTeamSubmissionPlayer_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CompetitionTeamSubmission_competitionEntryId_key" ON "CompetitionTeamSubmission"("competitionEntryId");

-- CreateIndex
CREATE INDEX "CompetitionTeamSubmissionPlayer_competitionTeamSubmissionId_idx" ON "CompetitionTeamSubmissionPlayer"("competitionTeamSubmissionId", "displayOrder");

-- AddForeignKey
ALTER TABLE "CompetitionTeamSubmission" ADD CONSTRAINT "CompetitionTeamSubmission_competitionEntryId_fkey" FOREIGN KEY ("competitionEntryId") REFERENCES "CompetitionEntry"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompetitionTeamSubmission" ADD CONSTRAINT "CompetitionTeamSubmission_sourceTeamId_fkey" FOREIGN KEY ("sourceTeamId") REFERENCES "Team"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompetitionTeamSubmissionPlayer" ADD CONSTRAINT "CompetitionTeamSubmissionPlayer_competitionTeamSubmissionI_fkey" FOREIGN KEY ("competitionTeamSubmissionId") REFERENCES "CompetitionTeamSubmission"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

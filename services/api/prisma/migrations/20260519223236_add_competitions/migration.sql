-- CreateEnum
CREATE TYPE "CompetitionType" AS ENUM ('LEAGUE', 'TOURNAMENT');

-- CreateEnum
CREATE TYPE "CompetitionFormat" AS ENUM ('KNOCKOUT', 'SWISS', 'ROUND_ROBIN');

-- CreateEnum
CREATE TYPE "CompetitionVisibility" AS ENUM ('PRIVATE', 'INVITE_ONLY', 'OPEN');

-- CreateEnum
CREATE TYPE "CompetitionStatus" AS ENUM ('DRAFT', 'OPEN_FOR_JOIN', 'TEAM_SUBMISSION_OPEN', 'IN_PROGRESS', 'COMPLETED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "CompetitionEntryStatus" AS ENUM ('JOINED', 'TEAM_PENDING', 'TEAM_SUBMITTED', 'TEAM_APPROVED', 'ELIMINATED', 'COMPLETED', 'WITHDRAWN');

-- CreateTable
CREATE TABLE "Competition" (
    "id" TEXT NOT NULL,
    "createdByUserId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "type" "CompetitionType" NOT NULL,
    "format" "CompetitionFormat" NOT NULL,
    "status" "CompetitionStatus" NOT NULL,
    "visibility" "CompetitionVisibility" NOT NULL,
    "maxEntrants" INTEGER NOT NULL,
    "submissionDeadline" TIMESTAMP(3),
    "allowUnofficialRosters" BOOLEAN NOT NULL DEFAULT false,
    "configJson" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Competition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CompetitionEntry" (
    "id" TEXT NOT NULL,
    "competitionId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" "CompetitionEntryStatus" NOT NULL,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "submittedAt" TIMESTAMP(3),
    "approvedAt" TIMESTAMP(3),
    "seed" INTEGER,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CompetitionEntry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CompetitionEntry_competitionId_status_idx" ON "CompetitionEntry"("competitionId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "CompetitionEntry_competitionId_userId_key" ON "CompetitionEntry"("competitionId", "userId");

-- AddForeignKey
ALTER TABLE "Competition" ADD CONSTRAINT "Competition_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompetitionEntry" ADD CONSTRAINT "CompetitionEntry_competitionId_fkey" FOREIGN KEY ("competitionId") REFERENCES "Competition"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompetitionEntry" ADD CONSTRAINT "CompetitionEntry_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

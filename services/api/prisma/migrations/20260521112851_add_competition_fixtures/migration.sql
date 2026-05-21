-- CreateEnum
CREATE TYPE "FixtureStatus" AS ENUM ('PENDING', 'READY', 'IN_PROGRESS', 'COMPLETED', 'VOID');

-- CreateEnum
CREATE TYPE "FixtureSourceType" AS ENUM ('GENERATED', 'COMMISSIONER_OVERRIDE');

-- CreateTable
CREATE TABLE "Fixture" (
    "id" TEXT NOT NULL,
    "competitionId" TEXT NOT NULL,
    "roundNumber" INTEGER NOT NULL,
    "bracketPosition" INTEGER,
    "homeEntryId" TEXT,
    "awayEntryId" TEXT,
    "status" "FixtureStatus" NOT NULL,
    "sourceType" "FixtureSourceType" NOT NULL,
    "scheduledAt" TIMESTAMP(3),
    "nextFixtureId" TEXT,
    "winnerEntryId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Fixture_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Fixture_competitionId_roundNumber_bracketPosition_idx" ON "Fixture"("competitionId", "roundNumber", "bracketPosition");

-- AddForeignKey
ALTER TABLE "Fixture" ADD CONSTRAINT "Fixture_competitionId_fkey" FOREIGN KEY ("competitionId") REFERENCES "Competition"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Fixture" ADD CONSTRAINT "Fixture_homeEntryId_fkey" FOREIGN KEY ("homeEntryId") REFERENCES "CompetitionEntry"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Fixture" ADD CONSTRAINT "Fixture_awayEntryId_fkey" FOREIGN KEY ("awayEntryId") REFERENCES "CompetitionEntry"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Fixture" ADD CONSTRAINT "Fixture_nextFixtureId_fkey" FOREIGN KEY ("nextFixtureId") REFERENCES "Fixture"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Fixture" ADD CONSTRAINT "Fixture_winnerEntryId_fkey" FOREIGN KEY ("winnerEntryId") REFERENCES "CompetitionEntry"("id") ON DELETE SET NULL ON UPDATE CASCADE;

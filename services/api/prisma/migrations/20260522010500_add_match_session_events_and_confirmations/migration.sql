CREATE TYPE "MatchSessionEventType" AS ENUM ('TOUCHDOWN', 'CASUALTY', 'COMPLETION', 'INTERCEPTION', 'MVP_ASSIGNMENT');

CREATE TABLE "MatchSessionEvent" (
  "id" TEXT NOT NULL,
  "matchSessionId" TEXT NOT NULL,
  "half" INTEGER NOT NULL,
  "turnNumber" INTEGER NOT NULL,
  "actingSide" "MatchSessionSide" NOT NULL,
  "teamSide" "MatchSessionSide" NOT NULL,
  "eventType" "MatchSessionEventType" NOT NULL,
  "playerNumber" INTEGER,
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "MatchSessionEvent_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "MatchSessionTurnConfirmation" (
  "id" TEXT NOT NULL,
  "matchSessionId" TEXT NOT NULL,
  "half" INTEGER NOT NULL,
  "turnNumber" INTEGER NOT NULL,
  "side" "MatchSessionSide" NOT NULL,
  "homeConfirmedAt" TIMESTAMP(3),
  "awayConfirmedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "MatchSessionTurnConfirmation_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "MatchSessionEvent_matchSessionId_half_turnNumber_actingSide_cre_idx"
ON "MatchSessionEvent"("matchSessionId", "half", "turnNumber", "actingSide", "createdAt");

CREATE UNIQUE INDEX "MatchSessionTurnConfirmation_matchSessionId_half_turnNumber__key"
ON "MatchSessionTurnConfirmation"("matchSessionId", "half", "turnNumber", "side");

ALTER TABLE "MatchSessionEvent"
ADD CONSTRAINT "MatchSessionEvent_matchSessionId_fkey"
FOREIGN KEY ("matchSessionId") REFERENCES "MatchSession"("id")
ON DELETE RESTRICT
ON UPDATE CASCADE;

ALTER TABLE "MatchSessionTurnConfirmation"
ADD CONSTRAINT "MatchSessionTurnConfirmation_matchSessionId_fkey"
FOREIGN KEY ("matchSessionId") REFERENCES "MatchSession"("id")
ON DELETE RESTRICT
ON UPDATE CASCADE;

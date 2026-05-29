CREATE TYPE "MatchSessionTurnPhase" AS ENUM ('READY', 'RUNNING', 'PAUSE_REQUESTED', 'PAUSED', 'REVIEW');

ALTER TABLE "MatchSession"
ADD COLUMN "timerTurnPhase" "MatchSessionTurnPhase" NOT NULL DEFAULT 'READY',
ADD COLUMN "timerTurnRemainingSeconds" INTEGER;

ALTER TABLE "MatchSessionEvent"
ADD COLUMN "homeConfirmedAt" TIMESTAMP(3),
ADD COLUMN "awayConfirmedAt" TIMESTAMP(3);

UPDATE "MatchSession"
SET "timerTurnPhase" = CASE
  WHEN "timerTurnStartedAt" IS NOT NULL THEN 'RUNNING'::"MatchSessionTurnPhase"
  ELSE 'READY'::"MatchSessionTurnPhase"
END,
"timerTurnRemainingSeconds" = COALESCE("timerTurnSeconds", 180);

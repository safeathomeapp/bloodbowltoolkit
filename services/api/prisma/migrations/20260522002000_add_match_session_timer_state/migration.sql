ALTER TABLE "MatchSession"
ADD COLUMN "timerEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "timerTurnSeconds" INTEGER,
ADD COLUMN "timerBankSeconds" INTEGER,
ADD COLUMN "timerBankResetsAtHalf" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "timerCurrentHalf" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN "timerCurrentTurnNumber" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN "timerActiveSide" "MatchSessionSide" NOT NULL DEFAULT 'HOME',
ADD COLUMN "timerTurnStartedAt" TIMESTAMP(3),
ADD COLUMN "timerHomeBankRemainingSeconds" INTEGER,
ADD COLUMN "timerAwayBankRemainingSeconds" INTEGER;

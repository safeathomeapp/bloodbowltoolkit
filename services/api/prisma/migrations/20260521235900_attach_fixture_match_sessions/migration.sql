ALTER TABLE "MatchSession"
ADD COLUMN "fixtureId" TEXT;

CREATE UNIQUE INDEX "MatchSession_fixtureId_key" ON "MatchSession"("fixtureId");

ALTER TABLE "MatchSession"
ADD CONSTRAINT "MatchSession_fixtureId_fkey"
FOREIGN KEY ("fixtureId") REFERENCES "Fixture"("id")
ON DELETE SET NULL
ON UPDATE CASCADE;

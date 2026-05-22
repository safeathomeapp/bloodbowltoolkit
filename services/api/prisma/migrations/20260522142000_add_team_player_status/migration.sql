DO $$
BEGIN
  CREATE TYPE "TeamPlayerStatus" AS ENUM ('ACTIVE', 'SOLD', 'DEAD', 'RETIRED');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END
$$;

ALTER TABLE "TeamPlayer"
ADD COLUMN IF NOT EXISTS "playerStatus" "TeamPlayerStatus" NOT NULL DEFAULT 'ACTIVE';

UPDATE "TeamPlayer"
SET "playerStatus" = 'DEAD'
WHERE "isDead" = true;

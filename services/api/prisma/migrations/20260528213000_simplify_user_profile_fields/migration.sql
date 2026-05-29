-- DropIndex
DROP INDEX IF EXISTS "User_username_key";

-- DropIndex
DROP INDEX IF EXISTS "User_normalizedUsername_key";

-- AlterTable
ALTER TABLE "User"
DROP COLUMN IF EXISTS "username",
DROP COLUMN IF EXISTS "normalizedUsername",
DROP COLUMN IF EXISTS "locationArea",
DROP COLUMN IF EXISTS "whatsappHandle",
DROP COLUMN IF EXISTS "steamHandle",
ADD COLUMN "townOrCity" TEXT,
ADD COLUMN "country" TEXT;

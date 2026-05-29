-- AlterEnum
ALTER TYPE "UserAuthTokenPurpose" ADD VALUE IF NOT EXISTS 'EMAIL_CHANGE_VERIFICATION';

-- AlterTable
ALTER TABLE "User"
ADD COLUMN "pendingEmail" TEXT,
ADD COLUMN "pendingNormalizedEmail" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "User_pendingEmail_key" ON "User"("pendingEmail");

-- CreateIndex
CREATE UNIQUE INDEX "User_pendingNormalizedEmail_key" ON "User"("pendingNormalizedEmail");

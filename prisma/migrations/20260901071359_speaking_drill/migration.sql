-- AlterEnum
ALTER TYPE "ItemType" ADD VALUE 'UCAPAN';

-- AlterEnum
ALTER TYPE "SkillTag" ADD VALUE 'SPEAKING';

-- AlterTable
ALTER TABLE "Attempt" ADD COLUMN     "audioFile" TEXT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "voiceConsentAt" TIMESTAMP(3);

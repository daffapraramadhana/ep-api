-- AlterTable
ALTER TABLE "Item" ADD COLUMN     "ttsText" TEXT;

-- CreateTable
CREATE TABLE "TtsClip" (
    "id" TEXT NOT NULL,
    "segments" JSONB NOT NULL,
    "fileName" TEXT,
    "durationMs" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "generatedAt" TIMESTAMP(3),

    CONSTRAINT "TtsClip_pkey" PRIMARY KEY ("id")
);

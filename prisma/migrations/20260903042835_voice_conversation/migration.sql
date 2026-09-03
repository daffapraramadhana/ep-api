-- CreateEnum
CREATE TYPE "VoiceConversationStatus" AS ENUM ('PENDING', 'GRADED');

-- CreateTable
CREATE TABLE "VoiceConversation" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "elevenlabsConversationId" TEXT,
    "status" "VoiceConversationStatus" NOT NULL DEFAULT 'PENDING',
    "durationSecs" INTEGER,
    "userTurnCount" INTEGER,
    "costCredits" INTEGER,
    "transcript" JSONB,
    "passed" BOOLEAN,
    "xpAwarded" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "gradedAt" TIMESTAMP(3),

    CONSTRAINT "VoiceConversation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "VoiceConversation_elevenlabsConversationId_key" ON "VoiceConversation"("elevenlabsConversationId");

-- CreateIndex
CREATE INDEX "VoiceConversation_userId_createdAt_idx" ON "VoiceConversation"("userId", "createdAt");

-- AddForeignKey
ALTER TABLE "VoiceConversation" ADD CONSTRAINT "VoiceConversation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

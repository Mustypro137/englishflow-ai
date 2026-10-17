-- CreateEnum
CREATE TYPE "TutorMode" AS ENUM ('explain', 'understand_sentence', 'conversation', 'correct_writing', 'vocabulary', 'quiz', 'remember', 'listening', 'build_sentences', 'challenge', 'explain_mistakes', 'review_history');

-- CreateEnum
CREATE TYPE "TutorRole" AS ENUM ('user', 'assistant');

-- CreateEnum
CREATE TYPE "MemoryKind" AS ENUM ('preference', 'recurring_error', 'goal');

-- CreateEnum
CREATE TYPE "MemorySource" AS ENUM ('learner', 'ai', 'system');

-- AlterEnum
ALTER TYPE "AttemptContext" ADD VALUE 'generated';

-- AlterTable
ALTER TABLE "exercise" ADD COLUMN     "contentHash" TEXT;

-- CreateTable
CREATE TABLE "tutor_conversation" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "mode" "TutorMode" NOT NULL,
    "title" TEXT NOT NULL,
    "lessonSlug" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tutor_conversation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tutor_message" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "role" "TutorRole" NOT NULL,
    "content" TEXT NOT NULL,
    "style" "ExplanationStyle",
    "inputTokens" INTEGER,
    "outputTokens" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tutor_message_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "learner_memory" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "kind" "MemoryKind" NOT NULL,
    "content" TEXT NOT NULL,
    "source" "MemorySource" NOT NULL,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "learner_memory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_usage" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "day" TEXT NOT NULL,
    "requests" INTEGER NOT NULL DEFAULT 0,
    "inputTokens" INTEGER NOT NULL DEFAULT 0,
    "outputTokens" INTEGER NOT NULL DEFAULT 0,
    "windowStart" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "windowCount" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ai_usage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "tutor_conversation_userId_updatedAt_idx" ON "tutor_conversation"("userId", "updatedAt");

-- CreateIndex
CREATE INDEX "tutor_message_conversationId_createdAt_idx" ON "tutor_message"("conversationId", "createdAt");

-- CreateIndex
CREATE INDEX "learner_memory_userId_createdAt_idx" ON "learner_memory"("userId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "ai_usage_userId_day_key" ON "ai_usage"("userId", "day");

-- CreateIndex
CREATE UNIQUE INDEX "exercise_contentHash_key" ON "exercise"("contentHash");

-- AddForeignKey
ALTER TABLE "tutor_conversation" ADD CONSTRAINT "tutor_conversation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tutor_message" ADD CONSTRAINT "tutor_message_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "tutor_conversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "learner_memory" ADD CONSTRAINT "learner_memory_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_usage" ADD CONSTRAINT "ai_usage_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

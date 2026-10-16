-- AlterTable
ALTER TABLE "concept_progress" ADD COLUMN     "masteredAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "study_session" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "plannedMinutes" INTEGER NOT NULL,
    "plan" JSONB NOT NULL,
    "completedBlocks" TEXT[],
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "study_session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "challenge_submission" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "challengeSlug" TEXT NOT NULL,
    "periodKey" TEXT NOT NULL,
    "text" TEXT,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "challenge_submission_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "study_session_userId_startedAt_idx" ON "study_session"("userId", "startedAt");

-- CreateIndex
CREATE INDEX "challenge_submission_userId_completedAt_idx" ON "challenge_submission"("userId", "completedAt");

-- CreateIndex
CREATE UNIQUE INDEX "challenge_submission_userId_challengeSlug_periodKey_key" ON "challenge_submission"("userId", "challengeSlug", "periodKey");

-- AddForeignKey
ALTER TABLE "study_session" ADD CONSTRAINT "study_session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "challenge_submission" ADD CONSTRAINT "challenge_submission_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

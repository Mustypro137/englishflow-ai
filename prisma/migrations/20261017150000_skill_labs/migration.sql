-- CreateEnum
CREATE TYPE "WritingKind" AS ENUM ('task', 'journal', 'sentence');

-- AlterEnum
ALTER TYPE "ExercisePhase" ADD VALUE 'skill_lab';

-- AlterEnum
ALTER TYPE "AttemptContext" ADD VALUE 'skill_lab';

-- AlterTable
ALTER TABLE "placement_result" ADD COLUMN     "listeningLevel" "CefrLevel";

-- AlterTable
ALTER TABLE "saved_word" ADD COLUMN     "sourceSentence" TEXT,
ADD COLUMN     "sourceTitle" TEXT;

-- AlterTable
ALTER TABLE "tutor_conversation" ADD COLUMN     "scenarioSlug" TEXT;

-- CreateTable
CREATE TABLE "skill_activity" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "skill" "Skill" NOT NULL,
    "itemSlug" TEXT NOT NULL,
    "mode" TEXT NOT NULL,
    "correct" INTEGER NOT NULL,
    "total" INTEGER NOT NULL,
    "details" JSONB,
    "completedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "skill_activity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "writing_draft" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "kind" "WritingKind" NOT NULL,
    "taskSlug" TEXT,
    "title" TEXT,
    "text" TEXT NOT NULL,
    "wordCount" INTEGER NOT NULL,
    "parentId" TEXT,
    "feedback" JSONB,
    "feedbackAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "writing_draft_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "skill_activity_userId_completedAt_idx" ON "skill_activity"("userId", "completedAt");

-- CreateIndex
CREATE INDEX "skill_activity_userId_skill_itemSlug_idx" ON "skill_activity"("userId", "skill", "itemSlug");

-- CreateIndex
CREATE INDEX "writing_draft_userId_createdAt_idx" ON "writing_draft"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "writing_draft_userId_taskSlug_idx" ON "writing_draft"("userId", "taskSlug");

-- AddForeignKey
ALTER TABLE "skill_activity" ADD CONSTRAINT "skill_activity_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "writing_draft" ADD CONSTRAINT "writing_draft_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "writing_draft" ADD CONSTRAINT "writing_draft_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "writing_draft"("id") ON DELETE SET NULL ON UPDATE CASCADE;

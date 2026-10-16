-- CreateEnum
CREATE TYPE "Skill" AS ENUM ('grammar', 'vocabulary', 'listening', 'reading', 'writing', 'pronunciation', 'sentence_construction', 'functional_communication');

-- CreateEnum
CREATE TYPE "LessonStatus" AS ENUM ('planned', 'published');

-- CreateEnum
CREATE TYPE "ExerciseType" AS ENUM ('multiple_choice', 'gap_fill', 'sentence_completion', 'matching', 'word_order', 'error_correction', 'transformation', 'short_answer');

-- CreateEnum
CREATE TYPE "ExercisePhase" AS ENUM ('guided', 'independent', 'recall', 'placement');

-- CreateEnum
CREATE TYPE "AttemptContext" AS ENUM ('lesson', 'placement');

-- CreateEnum
CREATE TYPE "MasteryState" AS ENUM ('new', 'learning', 'practicing', 'mastered');

-- CreateTable
CREATE TABLE "level" (
    "code" "CefrLevel" NOT NULL,
    "order" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,

    CONSTRAINT "level_pkey" PRIMARY KEY ("code")
);

-- CreateTable
CREATE TABLE "course_module" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "levelCode" "CefrLevel" NOT NULL,
    "order" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "archivedAt" TIMESTAMP(3),

    CONSTRAINT "course_module_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "unit" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "moduleId" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "archivedAt" TIMESTAMP(3),

    CONSTRAINT "unit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lesson" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "unitId" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "objective" TEXT NOT NULL,
    "status" "LessonStatus" NOT NULL,
    "body" JSONB,
    "application" JSONB,
    "masteryCriteria" TEXT[],
    "estimatedMinutes" INTEGER,
    "reviewStatus" TEXT NOT NULL DEFAULT 'pending_human_review',
    "archivedAt" TIMESTAMP(3),

    CONSTRAINT "lesson_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "concept" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "skill" "Skill" NOT NULL,
    "levelCode" "CefrLevel" NOT NULL,

    CONSTRAINT "concept_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "concept_prerequisite" (
    "conceptId" TEXT NOT NULL,
    "prerequisiteId" TEXT NOT NULL,

    CONSTRAINT "concept_prerequisite_pkey" PRIMARY KEY ("conceptId","prerequisiteId")
);

-- CreateTable
CREATE TABLE "lesson_concept" (
    "lessonId" TEXT NOT NULL,
    "conceptId" TEXT NOT NULL,

    CONSTRAINT "lesson_concept_pkey" PRIMARY KEY ("lessonId","conceptId")
);

-- CreateTable
CREATE TABLE "exercise" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "lessonId" TEXT,
    "type" "ExerciseType" NOT NULL,
    "phase" "ExercisePhase" NOT NULL,
    "order" INTEGER NOT NULL,
    "objective" TEXT NOT NULL,
    "instructions" TEXT NOT NULL,
    "explanation" TEXT NOT NULL,
    "hint" TEXT,
    "payload" JSONB NOT NULL,
    "difficulty" INTEGER NOT NULL,
    "skill" "Skill" NOT NULL,
    "placementSection" "Skill",
    "placementLevel" "CefrLevel",
    "source" TEXT NOT NULL DEFAULT 'seed',
    "reviewStatus" TEXT NOT NULL DEFAULT 'pending_human_review',
    "archivedAt" TIMESTAMP(3),

    CONSTRAINT "exercise_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "exercise_concept" (
    "exerciseId" TEXT NOT NULL,
    "conceptId" TEXT NOT NULL,

    CONSTRAINT "exercise_concept_pkey" PRIMARY KEY ("exerciseId","conceptId")
);

-- CreateTable
CREATE TABLE "exercise_attempt" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "exerciseId" TEXT NOT NULL,
    "context" "AttemptContext" NOT NULL,
    "response" JSONB NOT NULL,
    "isCorrect" BOOLEAN NOT NULL,
    "score" DOUBLE PRECISION NOT NULL,
    "hintsUsed" INTEGER NOT NULL DEFAULT 0,
    "revealedAnswer" BOOLEAN NOT NULL DEFAULT false,
    "independent" BOOLEAN NOT NULL,
    "placementResultId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "exercise_attempt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "concept_progress" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "conceptId" TEXT NOT NULL,
    "exposures" INTEGER NOT NULL DEFAULT 0,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "correct" INTEGER NOT NULL DEFAULT 0,
    "independentCorrect" INTEGER NOT NULL DEFAULT 0,
    "recentOutcomes" BOOLEAN[],
    "lastExposedAt" TIMESTAMP(3),
    "lastPracticedAt" TIMESTAMP(3),
    "masteryState" "MasteryState" NOT NULL DEFAULT 'new',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "concept_progress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lesson_progress" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "lessonId" TEXT NOT NULL,
    "firstViewedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastViewedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "viewCount" INTEGER NOT NULL DEFAULT 1,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "lesson_progress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "placement_result" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "grammarLevel" "CefrLevel",
    "vocabularyLevel" "CefrLevel",
    "readingLevel" "CefrLevel",
    "overallLevel" "CefrLevel",
    "scores" JSONB NOT NULL,
    "chosenLevel" "CefrLevel",
    "completedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "placement_result_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "level_order_key" ON "level"("order");

-- CreateIndex
CREATE UNIQUE INDEX "course_module_slug_key" ON "course_module"("slug");

-- CreateIndex
CREATE INDEX "course_module_levelCode_order_idx" ON "course_module"("levelCode", "order");

-- CreateIndex
CREATE UNIQUE INDEX "unit_slug_key" ON "unit"("slug");

-- CreateIndex
CREATE INDEX "unit_moduleId_order_idx" ON "unit"("moduleId", "order");

-- CreateIndex
CREATE UNIQUE INDEX "lesson_slug_key" ON "lesson"("slug");

-- CreateIndex
CREATE INDEX "lesson_unitId_order_idx" ON "lesson"("unitId", "order");

-- CreateIndex
CREATE UNIQUE INDEX "concept_slug_key" ON "concept"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "exercise_slug_key" ON "exercise"("slug");

-- CreateIndex
CREATE INDEX "exercise_lessonId_order_idx" ON "exercise"("lessonId", "order");

-- CreateIndex
CREATE INDEX "exercise_phase_placementSection_idx" ON "exercise"("phase", "placementSection");

-- CreateIndex
CREATE INDEX "exercise_attempt_userId_createdAt_idx" ON "exercise_attempt"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "exercise_attempt_userId_exerciseId_idx" ON "exercise_attempt"("userId", "exerciseId");

-- CreateIndex
CREATE UNIQUE INDEX "concept_progress_userId_conceptId_key" ON "concept_progress"("userId", "conceptId");

-- CreateIndex
CREATE UNIQUE INDEX "lesson_progress_userId_lessonId_key" ON "lesson_progress"("userId", "lessonId");

-- CreateIndex
CREATE INDEX "placement_result_userId_completedAt_idx" ON "placement_result"("userId", "completedAt");

-- AddForeignKey
ALTER TABLE "course_module" ADD CONSTRAINT "course_module_levelCode_fkey" FOREIGN KEY ("levelCode") REFERENCES "level"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "unit" ADD CONSTRAINT "unit_moduleId_fkey" FOREIGN KEY ("moduleId") REFERENCES "course_module"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lesson" ADD CONSTRAINT "lesson_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "unit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "concept" ADD CONSTRAINT "concept_levelCode_fkey" FOREIGN KEY ("levelCode") REFERENCES "level"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "concept_prerequisite" ADD CONSTRAINT "concept_prerequisite_conceptId_fkey" FOREIGN KEY ("conceptId") REFERENCES "concept"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "concept_prerequisite" ADD CONSTRAINT "concept_prerequisite_prerequisiteId_fkey" FOREIGN KEY ("prerequisiteId") REFERENCES "concept"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lesson_concept" ADD CONSTRAINT "lesson_concept_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "lesson"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lesson_concept" ADD CONSTRAINT "lesson_concept_conceptId_fkey" FOREIGN KEY ("conceptId") REFERENCES "concept"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exercise" ADD CONSTRAINT "exercise_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "lesson"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exercise_concept" ADD CONSTRAINT "exercise_concept_exerciseId_fkey" FOREIGN KEY ("exerciseId") REFERENCES "exercise"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exercise_concept" ADD CONSTRAINT "exercise_concept_conceptId_fkey" FOREIGN KEY ("conceptId") REFERENCES "concept"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exercise_attempt" ADD CONSTRAINT "exercise_attempt_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exercise_attempt" ADD CONSTRAINT "exercise_attempt_exerciseId_fkey" FOREIGN KEY ("exerciseId") REFERENCES "exercise"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exercise_attempt" ADD CONSTRAINT "exercise_attempt_placementResultId_fkey" FOREIGN KEY ("placementResultId") REFERENCES "placement_result"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "concept_progress" ADD CONSTRAINT "concept_progress_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "concept_progress" ADD CONSTRAINT "concept_progress_conceptId_fkey" FOREIGN KEY ("conceptId") REFERENCES "concept"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lesson_progress" ADD CONSTRAINT "lesson_progress_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lesson_progress" ADD CONSTRAINT "lesson_progress_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "lesson"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "placement_result" ADD CONSTRAINT "placement_result_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

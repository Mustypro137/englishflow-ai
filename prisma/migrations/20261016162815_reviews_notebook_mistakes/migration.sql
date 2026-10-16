-- CreateEnum
CREATE TYPE "ReviewItemType" AS ENUM ('exercise', 'vocabulary', 'flashcard');

-- CreateEnum
CREATE TYPE "SrsState" AS ENUM ('new', 'learning', 'review', 'relearning');

-- CreateEnum
CREATE TYPE "ReviewRating" AS ENUM ('again', 'hard', 'good', 'easy');

-- CreateEnum
CREATE TYPE "NoteKind" AS ENUM ('grammar_note', 'saved_sentence');

-- AlterEnum
ALTER TYPE "AttemptContext" ADD VALUE 'review';

-- AlterTable
ALTER TABLE "concept_progress" ADD COLUMN     "lastReviewCorrectDay" TEXT,
ADD COLUMN     "reviewCorrectDays" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "vocabulary_entry" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "headword" TEXT NOT NULL,
    "partOfSpeech" TEXT NOT NULL,
    "levelCode" "CefrLevel" NOT NULL,
    "topic" TEXT NOT NULL,
    "definition" TEXT NOT NULL,
    "examples" TEXT[],
    "collocations" TEXT[],
    "ipa" TEXT,
    "usageNote" TEXT,
    "commonErrors" JSONB,
    "reviewStatus" TEXT NOT NULL DEFAULT 'pending_human_review',
    "archivedAt" TIMESTAMP(3),

    CONSTRAINT "vocabulary_entry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "saved_word" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "vocabularyEntryId" TEXT NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "saved_word_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "flashcard" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "front" TEXT NOT NULL,
    "back" TEXT NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "flashcard_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "review_item" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "itemType" "ReviewItemType" NOT NULL,
    "exerciseId" TEXT,
    "savedWordId" TEXT,
    "flashcardId" TEXT,
    "state" "SrsState" NOT NULL DEFAULT 'new',
    "step" INTEGER NOT NULL DEFAULT 0,
    "ease" DOUBLE PRECISION NOT NULL DEFAULT 2.5,
    "intervalDays" INTEGER NOT NULL DEFAULT 0,
    "reps" INTEGER NOT NULL DEFAULT 0,
    "lapses" INTEGER NOT NULL DEFAULT 0,
    "dueAt" TIMESTAMP(3) NOT NULL,
    "lastReviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "review_item_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "review_log" (
    "id" TEXT NOT NULL,
    "reviewItemId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "rating" "ReviewRating" NOT NULL,
    "correct" BOOLEAN,
    "previousState" "SrsState" NOT NULL,
    "nextState" "SrsState" NOT NULL,
    "previousIntervalDays" INTEGER NOT NULL,
    "nextIntervalDays" INTEGER NOT NULL,
    "reviewedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "review_log_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mistake_record" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "exerciseId" TEXT NOT NULL,
    "conceptId" TEXT,
    "context" "AttemptContext" NOT NULL,
    "originalAnswer" TEXT NOT NULL,
    "correctAnswer" TEXT NOT NULL,
    "explanation" TEXT NOT NULL,
    "feedback" TEXT,
    "laterAttempts" INTEGER NOT NULL DEFAULT 0,
    "laterCorrect" INTEGER NOT NULL DEFAULT 0,
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "mistake_record_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "note" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "kind" "NoteKind" NOT NULL,
    "body" TEXT NOT NULL,
    "lessonId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "note_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bookmark" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "lessonId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "bookmark_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "vocabulary_entry_slug_key" ON "vocabulary_entry"("slug");

-- CreateIndex
CREATE INDEX "vocabulary_entry_levelCode_topic_idx" ON "vocabulary_entry"("levelCode", "topic");

-- CreateIndex
CREATE UNIQUE INDEX "saved_word_userId_vocabularyEntryId_key" ON "saved_word"("userId", "vocabularyEntryId");

-- CreateIndex
CREATE INDEX "flashcard_userId_createdAt_idx" ON "flashcard"("userId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "review_item_savedWordId_key" ON "review_item"("savedWordId");

-- CreateIndex
CREATE UNIQUE INDEX "review_item_flashcardId_key" ON "review_item"("flashcardId");

-- CreateIndex
CREATE INDEX "review_item_userId_dueAt_idx" ON "review_item"("userId", "dueAt");

-- CreateIndex
CREATE UNIQUE INDEX "review_item_userId_exerciseId_key" ON "review_item"("userId", "exerciseId");

-- CreateIndex
CREATE INDEX "review_log_userId_reviewedAt_idx" ON "review_log"("userId", "reviewedAt");

-- CreateIndex
CREATE INDEX "mistake_record_userId_createdAt_idx" ON "mistake_record"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "mistake_record_userId_exerciseId_idx" ON "mistake_record"("userId", "exerciseId");

-- CreateIndex
CREATE INDEX "note_userId_createdAt_idx" ON "note"("userId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "bookmark_userId_lessonId_key" ON "bookmark"("userId", "lessonId");

-- AddForeignKey
ALTER TABLE "saved_word" ADD CONSTRAINT "saved_word_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "saved_word" ADD CONSTRAINT "saved_word_vocabularyEntryId_fkey" FOREIGN KEY ("vocabularyEntryId") REFERENCES "vocabulary_entry"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "flashcard" ADD CONSTRAINT "flashcard_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "review_item" ADD CONSTRAINT "review_item_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "review_item" ADD CONSTRAINT "review_item_exerciseId_fkey" FOREIGN KEY ("exerciseId") REFERENCES "exercise"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "review_item" ADD CONSTRAINT "review_item_savedWordId_fkey" FOREIGN KEY ("savedWordId") REFERENCES "saved_word"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "review_item" ADD CONSTRAINT "review_item_flashcardId_fkey" FOREIGN KEY ("flashcardId") REFERENCES "flashcard"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "review_log" ADD CONSTRAINT "review_log_reviewItemId_fkey" FOREIGN KEY ("reviewItemId") REFERENCES "review_item"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "review_log" ADD CONSTRAINT "review_log_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mistake_record" ADD CONSTRAINT "mistake_record_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mistake_record" ADD CONSTRAINT "mistake_record_exerciseId_fkey" FOREIGN KEY ("exerciseId") REFERENCES "exercise"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mistake_record" ADD CONSTRAINT "mistake_record_conceptId_fkey" FOREIGN KEY ("conceptId") REFERENCES "concept"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "note" ADD CONSTRAINT "note_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "note" ADD CONSTRAINT "note_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "lesson"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookmark" ADD CONSTRAINT "bookmark_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookmark" ADD CONSTRAINT "bookmark_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "lesson"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

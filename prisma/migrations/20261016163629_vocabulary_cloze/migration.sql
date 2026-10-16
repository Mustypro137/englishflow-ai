/*
  Warnings:

  - Added the required column `cloze` to the `vocabulary_entry` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "vocabulary_entry" ADD COLUMN     "cloze" JSONB NOT NULL;

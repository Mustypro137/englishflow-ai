-- CreateEnum
CREATE TYPE "ColorTheme" AS ENUM ('system', 'light', 'dark');

-- AlterTable
ALTER TABLE "learning_preferences" ADD COLUMN     "colorTheme" "ColorTheme" NOT NULL DEFAULT 'system';

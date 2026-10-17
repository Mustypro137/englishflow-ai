import "server-only";
import { prisma } from "./client";

/*
 * Everything stored about one learner, as plain JSON they can download (Settings → Your data).
 * Curriculum content is shared, so records point to it by slug rather than internal id.
 * Sign-in secrets are left out: password hashes, session tokens and verification codes.
 */

/** Bump when the shape changes, so an export can be read back correctly later. */
export const EXPORT_FORMAT_VERSION = 1;

const slug = { select: { slug: true } } as const;
const own = { userId: true } as const;

export async function exportLearnerData(userId: string, now = new Date()) {
  const where = { userId };
  const [
    user,
    profile,
    preferences,
    placementResults,
    attempts,
    conceptProgress,
    lessonProgress,
    savedWords,
    flashcards,
    notes,
    bookmarks,
    reviewItems,
    reviewLogs,
    mistakes,
    studySessions,
    challengeSubmissions,
    skillActivities,
    writingDrafts,
    tutorConversations,
    memories,
    aiUsage,
  ] = await Promise.all([
    prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: {
        name: true,
        email: true,
        emailVerified: true,
        createdAt: true,
        accounts: { select: { providerId: true, createdAt: true } },
      },
    }),
    prisma.profile.findUnique({ where, omit: { id: true, ...own } }),
    prisma.learningPreferences.findUnique({ where, omit: { id: true, ...own } }),
    prisma.placementResult.findMany({ where, omit: own, orderBy: { completedAt: "asc" } }),
    prisma.exerciseAttempt.findMany({
      where,
      omit: { ...own, exerciseId: true },
      include: { exercise: slug },
      orderBy: { createdAt: "asc" },
    }),
    prisma.conceptProgress.findMany({ where, omit: { ...own, conceptId: true }, include: { concept: slug } }),
    prisma.lessonProgress.findMany({ where, omit: { ...own, lessonId: true }, include: { lesson: slug } }),
    prisma.savedWord.findMany({
      where,
      omit: { ...own, vocabularyEntryId: true },
      include: { entry: { select: { slug: true, headword: true } } },
      orderBy: { createdAt: "asc" },
    }),
    prisma.flashcard.findMany({ where, omit: own, orderBy: { createdAt: "asc" } }),
    prisma.note.findMany({
      where,
      omit: { ...own, lessonId: true },
      include: { lesson: slug },
      orderBy: { createdAt: "asc" },
    }),
    prisma.bookmark.findMany({ where, omit: { ...own, lessonId: true }, include: { lesson: slug } }),
    prisma.reviewItem.findMany({
      where,
      omit: { ...own, exerciseId: true },
      include: { exercise: slug },
      orderBy: { createdAt: "asc" },
    }),
    prisma.reviewLog.findMany({ where, omit: own, orderBy: { reviewedAt: "asc" } }),
    prisma.mistakeRecord.findMany({
      where,
      omit: { ...own, exerciseId: true, conceptId: true },
      include: { exercise: slug, concept: slug },
      orderBy: { createdAt: "asc" },
    }),
    prisma.studySession.findMany({ where, omit: own, orderBy: { startedAt: "asc" } }),
    prisma.challengeSubmission.findMany({ where, omit: own, orderBy: { createdAt: "asc" } }),
    prisma.skillActivity.findMany({ where, omit: own, orderBy: { completedAt: "asc" } }),
    prisma.writingDraft.findMany({ where, omit: own, orderBy: { createdAt: "asc" } }),
    prisma.tutorConversation.findMany({
      where,
      omit: own,
      include: {
        messages: { omit: { conversationId: true }, orderBy: { createdAt: "asc" } },
      },
      orderBy: { createdAt: "asc" },
    }),
    prisma.learnerMemory.findMany({ where, omit: own, orderBy: { createdAt: "asc" } }),
    prisma.aiUsage.findMany({
      where,
      select: { day: true, requests: true, inputTokens: true, outputTokens: true },
      orderBy: { day: "asc" },
    }),
  ]);

  const { accounts, ...account } = user;
  return {
    format: "englishflow-learner-export",
    version: EXPORT_FORMAT_VERSION,
    exportedAt: now.toISOString(),
    account: { ...account, signInMethods: accounts.map((a) => a.providerId) },
    profile,
    preferences,
    placementResults,
    attempts,
    conceptProgress,
    lessonProgress,
    savedWords,
    flashcards,
    notes,
    bookmarks,
    reviewItems,
    reviewLogs,
    mistakes,
    studySessions,
    challengeSubmissions,
    skillActivities,
    writingDrafts,
    tutorConversations,
    memories,
    aiUsage,
  };
}

export type LearnerExport = Awaited<ReturnType<typeof exportLearnerData>>;

import "server-only";
import type { ContextRecords } from "@/server/ai/context";
import { describeResponse } from "@/lib/learning/grading/describe-response";
import type { TutorModeName } from "@/lib/ai/modes";
import { prisma } from "./client";
import { getExercisesForGrading } from "./curriculum";

/*
 * Tutor conversations and the learning context sent to the model.
 * Every function is scoped to the signed-in learner's userId.
 */

export interface ConversationSummary {
  id: string;
  mode: TutorModeName;
  title: string;
  updatedAt: Date;
}

export interface ConversationView extends ConversationSummary {
  lessonSlug: string | null;
  scenarioSlug: string | null;
  messages: { id: string; role: "user" | "assistant"; content: string; createdAt: Date }[];
}

export async function listConversations(userId: string, limit = 30): Promise<ConversationSummary[]> {
  return prisma.tutorConversation.findMany({
    where: { userId },
    orderBy: { updatedAt: "desc" },
    take: limit,
    select: { id: true, mode: true, title: true, updatedAt: true },
  });
}

export async function getConversation(userId: string, id: string): Promise<ConversationView | null> {
  const c = await prisma.tutorConversation.findFirst({
    where: { id, userId },
    include: {
      messages: { orderBy: { createdAt: "asc" }, select: { id: true, role: true, content: true, createdAt: true } },
    },
  });
  if (!c) return null;
  return {
    id: c.id,
    mode: c.mode,
    title: c.title,
    updatedAt: c.updatedAt,
    lessonSlug: c.lessonSlug,
    scenarioSlug: c.scenarioSlug,
    messages: c.messages,
  };
}

export function conversationTitle(firstMessage: string): string {
  const oneLine = firstMessage.replace(/\s+/g, " ").trim();
  return oneLine.length > 60 ? `${oneLine.slice(0, 59)}…` : oneLine || "New conversation";
}

export async function createConversation(
  userId: string,
  data: {
    mode: TutorModeName;
    firstMessage: string;
    lessonSlug: string | null;
    scenario?: { slug: string; title: string } | null;
  },
) {
  return prisma.tutorConversation.create({
    data: {
      userId,
      mode: data.mode,
      title: data.scenario ? `Role-play: ${data.scenario.title}` : conversationTitle(data.firstMessage),
      lessonSlug: data.lessonSlug,
      scenarioSlug: data.scenario?.slug ?? null,
    },
    select: { id: true, mode: true, title: true, lessonSlug: true, scenarioSlug: true },
  });
}

export async function deleteConversation(userId: string, id: string): Promise<boolean> {
  const { count } = await prisma.tutorConversation.deleteMany({ where: { id, userId } });
  return count === 1;
}

/** Load the raw records for the tutor's context. Only what selectContext() may use is queried. */
export async function loadContextRecords(userId: string, lessonSlug: string | null): Promise<ContextRecords> {
  const [profile, prefs, lesson] = await Promise.all([
    prisma.profile.findUnique({
      where: { userId },
      select: { estimatedLevel: true, selfReportedLevel: true, levelSource: true },
    }),
    prisma.learningPreferences.findUnique({ where: { userId }, select: { aiContextSharing: true } }),
    lessonSlug
      ? prisma.lesson.findFirst({
          where: { slug: lessonSlug, status: "published", archivedAt: null },
          select: { id: true, title: true, objective: true, concepts: { select: { conceptId: true } } },
        })
      : null,
  ]);
  const sharing = prefs?.aiContextSharing ?? false;
  const empty = { attempts: [], mistakes: [], savedWords: [], conceptStates: [], memories: [] };
  const lessonView = lesson ? { title: lesson.title, objective: lesson.objective } : null;
  if (!sharing) return { profile, sharing, lesson: lessonView, ...empty };

  const conceptIds = lesson?.concepts.map((c) => c.conceptId);
  const [attempts, mistakes, savedWords, concepts, memories] = await Promise.all([
    prisma.exerciseAttempt.findMany({
      where: {
        userId,
        context: { in: ["lesson", "review", "practice"] },
        ...(lesson ? { exercise: { lessonId: lesson.id } } : {}),
      },
      orderBy: { createdAt: "desc" },
      take: 5,
      select: { exerciseId: true, response: true, isCorrect: true },
    }),
    prisma.mistakeRecord.findMany({
      where: { userId, resolvedAt: null, ...(conceptIds ? { conceptId: { in: conceptIds } } : {}) },
      orderBy: { createdAt: "desc" },
      take: 20,
      select: { originalAnswer: true, correctAnswer: true, concept: { select: { name: true } } },
    }),
    prisma.savedWord.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 8,
      select: { entry: { select: { headword: true } } },
    }),
    prisma.conceptProgress.findMany({ where: { userId }, select: { masteryState: true } }),
    prisma.learnerMemory.findMany({
      where: { userId, verified: true },
      orderBy: { updatedAt: "desc" },
      take: 10,
      select: { kind: true, content: true, verified: true },
    }),
  ]);
  const graded = new Map((await getExercisesForGrading(attempts.map((a) => a.exerciseId))).map((g) => [g.id, g]));
  return {
    profile,
    sharing,
    lesson: lessonView,
    attempts: attempts.flatMap((a) => {
      const g = graded.get(a.exerciseId);
      return g
        ? [
            {
              objective: g.exercise.objective,
              answer: describeResponse(g.exercise, a.response),
              isCorrect: a.isCorrect,
            },
          ]
        : [];
    }),
    mistakes: mistakes.map((m) => ({
      conceptName: m.concept?.name ?? null,
      originalAnswer: m.originalAnswer,
      correctAnswer: m.correctAnswer,
    })),
    savedWords: savedWords.map((w) => ({ word: w.entry.headword })),
    conceptStates: concepts.map((c) => c.masteryState),
    memories,
  };
}

/** The learner's role-play conversations for one scenario, newest first. */
export async function listScenarioConversations(userId: string, scenarioSlug: string, limit = 10) {
  return prisma.tutorConversation.findMany({
    where: { userId, scenarioSlug },
    orderBy: { updatedAt: "desc" },
    take: limit,
    select: { id: true, title: true, updatedAt: true, _count: { select: { messages: true } } },
  });
}

import "server-only";
import { BLANK } from "@content/schemas";
import { z } from "zod";
import type { Prisma, ReviewItem } from "@/generated/prisma/client";
import { toClientExercise } from "@/lib/learning/client-exercise";
import { type GradeResult, gradeExercise, InvalidResponseError } from "@/lib/learning/grading/grade-exercise";
import { checkTextAnswer } from "@/lib/learning/grading/text-answer";
import { applyReview, EMPTY_PROGRESS } from "@/lib/learning/mastery";
import { type ReviewCardView, vocabularyMode } from "@/lib/learning/review-card";
import { type Rating, ratingFromAnswer, schedule, type SrsCard } from "@/lib/learning/srs/scheduler";
import { describeDue, endOfLocalDay, localDateKey } from "@/lib/learning/time";
import { prisma } from "./client";
import { getExercisesForGrading } from "./curriculum";
import { trackAnswer } from "./mistakes";
import { loadProgressMap, saveProgress } from "./progress";

/*
 * Review queue. Every function is scoped to the signed-in learner's userId.
 * Graded items (exercises, word recall) are checked on the server; self-rated
 * items (word recognition, flashcards) take the learner's own rating.
 */

const clozeSchema = z.object({ text: z.string(), accepted: z.array(z.string()).min(1) });

async function learnerTimeZone(userId: string): Promise<string> {
  const profile = await prisma.profile.findUnique({ where: { userId }, select: { timezone: true } });
  return profile?.timezone ?? "UTC";
}

export interface ReviewOverview {
  dueNow: number;
  laterToday: number;
  tomorrow: number;
  next7Days: number;
  total: number;
  nextDue: { at: Date; label: string } | null;
}

/** Items due right now: the count on the Review link in the app navigation. */
export async function countDueReviews(userId: string, now = new Date()): Promise<number> {
  return prisma.reviewItem.count({ where: { userId, dueAt: { lte: now } } });
}

export async function getReviewOverview(userId: string, now = new Date()): Promise<ReviewOverview> {
  const tz = await learnerTimeZone(userId);
  const endToday = endOfLocalDay(now, tz);
  const endTomorrow = endOfLocalDay(new Date(endToday.getTime() + 1), tz);
  const in7Days = new Date(now.getTime() + 7 * 86_400_000);
  const [dueNow, laterToday, tomorrow, next7Days, total, next] = await Promise.all([
    prisma.reviewItem.count({ where: { userId, dueAt: { lte: now } } }),
    prisma.reviewItem.count({ where: { userId, dueAt: { gt: now, lte: endToday } } }),
    prisma.reviewItem.count({ where: { userId, dueAt: { gt: endToday, lte: endTomorrow } } }),
    prisma.reviewItem.count({ where: { userId, dueAt: { gt: now, lte: in7Days } } }),
    prisma.reviewItem.count({ where: { userId } }),
    prisma.reviewItem.findFirst({
      where: { userId, dueAt: { gt: now } },
      orderBy: { dueAt: "asc" },
      select: { dueAt: true },
    }),
  ]);
  return {
    dueNow,
    laterToday,
    tomorrow,
    next7Days,
    total,
    nextDue: next ? { at: next.dueAt, label: describeDue(next.dueAt, now, tz) } : null,
  };
}

type ItemWithRelations = ReviewItem & {
  savedWord: {
    entry: {
      headword: string;
      partOfSpeech: string;
      topic: string;
      definition: string;
      examples: string[];
      collocations: string[];
      ipa: string | null;
      usageNote: string | null;
      cloze: Prisma.JsonValue;
    };
  } | null;
  flashcard: { front: string; back: string; note: string | null } | null;
  exercise: { lesson: { slug: string; title: string } | null } | null;
};

const itemInclude = {
  savedWord: { include: { entry: true } },
  flashcard: true,
  exercise: { select: { lesson: { select: { slug: true, title: true } } } },
} as const;

async function toCard(item: ItemWithRelations): Promise<ReviewCardView | null> {
  if (item.itemType === "exercise" && item.exerciseId) {
    const [record] = await getExercisesForGrading([item.exerciseId]);
    if (!record) return null; // archived exercise
    return {
      id: item.id,
      kind: "exercise",
      exercise: toClientExercise({ ...record.exercise, id: record.id }),
      lesson: item.exercise?.lesson ?? null,
    };
  }
  if (item.itemType === "vocabulary" && item.savedWord) {
    const e = item.savedWord.entry;
    if (vocabularyMode(item.reps) === "word_recall") {
      const cloze = clozeSchema.parse(e.cloze);
      const [before, after] = cloze.text.split(BLANK);
      return {
        id: item.id,
        kind: "word_recall",
        word: { partOfSpeech: e.partOfSpeech, topic: e.topic, definition: e.definition },
        cloze: [before, after],
      };
    }
    return {
      id: item.id,
      kind: "word_recognise",
      word: {
        headword: e.headword,
        partOfSpeech: e.partOfSpeech,
        ipa: e.ipa,
        definition: e.definition,
        examples: e.examples,
        collocations: e.collocations,
        usageNote: e.usageNote,
      },
    };
  }
  if (item.itemType === "flashcard" && item.flashcard) {
    // Pick fields explicitly: the flashcard's own id must not replace the review item's id.
    const { front, back, note } = item.flashcard;
    return { id: item.id, kind: "flashcard", front, back, note };
  }
  return null;
}

/** Items due now, oldest first. */
export async function getDueQueue(userId: string, now = new Date(), limit = 20): Promise<ReviewCardView[]> {
  const items = await prisma.reviewItem.findMany({
    where: { userId, dueAt: { lte: now } },
    orderBy: { dueAt: "asc" },
    take: limit,
    include: itemInclude,
  });
  const cards = await Promise.all(items.map(toCard));
  return cards.filter((c): c is ReviewCardView => c !== null);
}

export interface UpcomingItem {
  id: string;
  kind: "exercise" | "vocabulary" | "flashcard";
  label: string;
  dueLabel: string;
  dueAt: Date;
}

export async function listUpcoming(userId: string, now = new Date(), limit = 30): Promise<UpcomingItem[]> {
  const tz = await learnerTimeZone(userId);
  const items = await prisma.reviewItem.findMany({
    where: { userId },
    orderBy: { dueAt: "asc" },
    take: limit,
    include: {
      savedWord: { include: { entry: { select: { headword: true } } } },
      flashcard: { select: { front: true } },
      exercise: { select: { instructions: true, lesson: { select: { title: true } } } },
    },
  });
  return items.map((i) => ({
    id: i.id,
    kind: i.itemType,
    label:
      i.itemType === "vocabulary"
        ? (i.savedWord?.entry.headword ?? "Saved word")
        : i.itemType === "flashcard"
          ? (i.flashcard?.front ?? "Flashcard")
          : `${i.exercise?.lesson?.title ?? "Lesson"} — ${i.exercise?.instructions ?? "exercise"}`,
    dueLabel: describeDue(i.dueAt, now, tz),
    dueAt: i.dueAt,
  }));
}

export interface ReviewAnswerInput {
  reviewItemId: string;
  /** For graded items: the learner's response. */
  response?: unknown;
  /** For self-rated items: the learner's own rating. */
  rating?: Rating;
  /** True if the learner used a hint or revealed the answer before answering correctly. */
  helped?: boolean;
}

export interface ReviewAnswerResult {
  rating: Rating;
  correct: boolean | null;
  result: GradeResult | null;
  /** For word recall: the word, shown after answering. */
  answer: string | null;
  nextDueAt: Date;
  nextDueLabel: string;
}

function asCard(item: ReviewItem): SrsCard {
  return {
    state: item.state,
    step: item.step,
    ease: item.ease,
    intervalDays: item.intervalDays,
    reps: item.reps,
    lapses: item.lapses,
    dueAt: item.dueAt,
  };
}

/** Check (or accept the rating for) one review item, reschedule it and record the evidence. */
export async function answerReview(
  userId: string,
  input: ReviewAnswerInput,
  now = new Date(),
): Promise<ReviewAnswerResult> {
  const item = await prisma.reviewItem.findFirst({ where: { id: input.reviewItemId, userId }, include: itemInclude });
  if (!item) throw new InvalidResponseError("Review item not found.");
  const tz = await learnerTimeZone(userId);

  let rating: Rating;
  let correct: boolean | null = null;
  let result: GradeResult | null = null;
  let answer: string | null = null;
  let exerciseRecord: Awaited<ReturnType<typeof getExercisesForGrading>>[number] | undefined;

  if (item.itemType === "exercise") {
    [exerciseRecord] = item.exerciseId ? await getExercisesForGrading([item.exerciseId]) : [];
    if (!exerciseRecord) throw new InvalidResponseError("This exercise is no longer available.");
    result = gradeExercise(exerciseRecord.exercise, input.response);
    correct = result.correct;
    rating = ratingFromAnswer(result.correct, input.helped === true);
  } else if (item.itemType === "vocabulary" && vocabularyMode(item.reps) === "word_recall") {
    const entry = item.savedWord?.entry;
    if (!entry) throw new InvalidResponseError("This word is no longer saved.");
    const cloze = clozeSchema.parse(entry.cloze);
    const typed = z.object({ answer: z.string().max(100) }).safeParse(input.response);
    if (!typed.success) throw new InvalidResponseError("Type the word.");
    const check = checkTextAnswer(typed.data.answer, { accepted: cloze.accepted });
    if (check.status === "empty") throw new InvalidResponseError("Type the word.");
    correct = check.status === "correct";
    answer = cloze.accepted[0];
    rating = ratingFromAnswer(correct, input.helped === true);
  } else {
    if (!input.rating) throw new InvalidResponseError("Choose how well you remembered.");
    rating = input.rating;
  }

  const next = schedule(asCard(item), rating, now, item.id);

  await prisma.$transaction(async (tx) => {
    await tx.reviewItem.update({
      where: { id: item.id },
      data: { ...next, lastReviewedAt: now },
    });
    await tx.reviewLog.create({
      data: {
        reviewItemId: item.id,
        userId,
        rating,
        correct,
        previousState: item.state,
        nextState: next.state,
        previousIntervalDays: item.intervalDays,
        nextIntervalDays: next.intervalDays,
        reviewedAt: now,
      },
    });
    if (exerciseRecord && result) {
      const independent = input.helped !== true;
      await tx.exerciseAttempt.create({
        data: {
          userId,
          exerciseId: exerciseRecord.id,
          context: "review",
          response: input.response as Prisma.InputJsonValue,
          isCorrect: result.correct,
          score: result.score,
          revealedAnswer: input.helped === true,
          independent,
        },
      });
      // Delayed reviews are the evidence that can make a concept "mastered".
      const progress = await loadProgressMap(tx, userId, exerciseRecord.conceptIds);
      const dayKey = localDateKey(now, tz);
      for (const conceptId of exerciseRecord.conceptIds) {
        const updated = applyReview(
          progress.get(conceptId) ?? EMPTY_PROGRESS,
          { correct: result.correct, independent, dayKey },
          now,
        );
        await saveProgress(tx, userId, conceptId, updated);
      }
      await trackAnswer(
        tx,
        userId,
        {
          exerciseId: exerciseRecord.id,
          exercise: exerciseRecord.exercise,
          conceptIds: exerciseRecord.conceptIds,
          response: input.response,
          result,
          context: "review",
        },
        now,
      );
    }
  });

  return { rating, correct, result, answer, nextDueAt: next.dueAt, nextDueLabel: describeDue(next.dueAt, now, tz) };
}

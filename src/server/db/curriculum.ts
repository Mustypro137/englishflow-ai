import "server-only";
import {
  type ApplicationTask,
  applicationTaskSchema,
  type Cefr,
  type ExerciseContent,
  exerciseSchema,
  type LessonBlock,
  lessonBlockSchema,
} from "@content/schemas";
import { z } from "zod";
import type { Exercise } from "@/generated/prisma/client";
import { type ClientExercise, toClientExercise } from "@/lib/learning/client-exercise";
import { prisma } from "./client";

/*
 * Read-only access to curriculum content (shared by all learners).
 * Answers never leave this module except through gradeable exercises used on the server.
 *
 * Content is identical for every learner and changes only when the seed runs, so these
 * reads use Next.js "use cache" (in-memory, cleared by each new build/deploy). After
 * re-seeding a running server, restart it to see the new content immediately.
 */

export type LessonPhase = "guided" | "independent" | "recall";

export interface CurriculumLessonSummary {
  id: string;
  slug: string;
  title: string;
  objective: string;
  status: "planned" | "published";
  estimatedMinutes: number | null;
  exerciseCount: number;
}

export interface CurriculumLevel {
  code: Cefr;
  title: string;
  description: string;
  modules: {
    slug: string;
    title: string;
    description: string;
    units: { slug: string; title: string; lessons: CurriculumLessonSummary[] }[];
  }[];
}

/** The whole roadmap, in order, without lesson bodies or exercises. */
export async function getCurriculumOverview(): Promise<CurriculumLevel[]> {
  "use cache";
  const levels = await prisma.level.findMany({
    orderBy: { order: "asc" },
    include: {
      modules: {
        where: { archivedAt: null },
        orderBy: { order: "asc" },
        include: {
          units: {
            where: { archivedAt: null },
            orderBy: { order: "asc" },
            include: {
              lessons: {
                where: { archivedAt: null },
                orderBy: { order: "asc" },
                include: { _count: { select: { exercises: { where: { archivedAt: null } } } } },
              },
            },
          },
        },
      },
    },
  });
  return levels.map((level) => ({
    code: level.code,
    title: level.title,
    description: level.description,
    modules: level.modules.map((m) => ({
      slug: m.slug,
      title: m.title,
      description: m.description,
      units: m.units.map((u) => ({
        slug: u.slug,
        title: u.title,
        lessons: u.lessons.map((l) => ({
          id: l.id,
          slug: l.slug,
          title: l.title,
          objective: l.objective,
          status: l.status,
          estimatedMinutes: l.estimatedMinutes,
          exerciseCount: l._count.exercises,
        })),
      })),
    })),
  }));
}

/** Validate a stored exercise against the content schema before using it. */
export function parseStoredExercise(row: Exercise) {
  return exerciseSchema.parse({
    slug: row.slug,
    type: row.type,
    objective: row.objective,
    instructions: row.instructions,
    explanation: row.explanation,
    hint: row.hint ?? undefined,
    difficulty: row.difficulty,
    skill: row.skill,
    payload: row.payload,
  });
}

export function toClient(row: Exercise): ClientExercise {
  return toClientExercise({ ...parseStoredExercise(row), id: row.id });
}

export interface LessonView {
  id: string;
  slug: string;
  title: string;
  objective: string;
  estimatedMinutes: number | null;
  levelCode: Cefr;
  unitTitle: string;
  reviewStatus: string;
  body: LessonBlock[];
  application: ApplicationTask;
  masteryCriteria: string[];
  concepts: { slug: string; name: string }[];
  exercises: Record<LessonPhase, ClientExercise[]>;
}

/** A published lesson with browser-safe exercises, or null if it is unknown, planned or archived. */
export async function getLessonBySlug(slug: string): Promise<LessonView | null> {
  "use cache";
  const lesson = await prisma.lesson.findFirst({
    where: { slug, status: "published", archivedAt: null },
    include: {
      unit: { include: { module: true } },
      concepts: { include: { concept: true } },
      exercises: { where: { archivedAt: null }, orderBy: { order: "asc" } },
    },
  });
  if (!lesson) return null;

  const exercises: Record<LessonPhase, ClientExercise[]> = { guided: [], independent: [], recall: [] };
  for (const row of lesson.exercises) {
    if (row.phase === "placement") continue;
    exercises[row.phase].push(toClient(row));
  }

  return {
    id: lesson.id,
    slug: lesson.slug,
    title: lesson.title,
    objective: lesson.objective,
    estimatedMinutes: lesson.estimatedMinutes,
    levelCode: lesson.unit.module.levelCode,
    unitTitle: lesson.unit.title,
    reviewStatus: lesson.reviewStatus,
    body: z.array(lessonBlockSchema).parse(lesson.body),
    application: applicationTaskSchema.parse(lesson.application),
    masteryCriteria: lesson.masteryCriteria,
    concepts: lesson.concepts.map((lc) => ({ slug: lc.concept.slug, name: lc.concept.name })),
    exercises,
  };
}

export interface GradingRecord {
  exercise: ExerciseContent;
  id: string;
  lessonId: string | null;
  phase: Exercise["phase"];
  placementSection: Exercise["placementSection"];
  placementLevel: Exercise["placementLevel"];
  conceptIds: string[];
}

/** Server-only: an exercise with its answers, for grading. */
export async function getExercisesForGrading(ids: string[]): Promise<GradingRecord[]> {
  "use cache";
  const rows = await prisma.exercise.findMany({
    where: { id: { in: ids }, archivedAt: null },
    include: { concepts: true },
  });
  return rows.map((row) => ({
    exercise: parseStoredExercise(row),
    id: row.id,
    lessonId: row.lessonId,
    phase: row.phase,
    placementSection: row.placementSection,
    placementLevel: row.placementLevel,
    conceptIds: row.concepts.map((c) => c.conceptId),
  }));
}

/** Ids of a lesson's (non-archived) exercises, used to count progress. */
export async function getLessonExerciseIds(lessonId: string): Promise<string[]> {
  "use cache";
  const rows = await prisma.exercise.findMany({ where: { lessonId, archivedAt: null }, select: { id: true } });
  return rows.map((r) => r.id);
}

export interface PlacementQuestion {
  section: "grammar" | "vocabulary" | "reading";
  exercise: ClientExercise;
}

/** Placement questions in order (grammar, vocabulary, reading). Levels are not sent to the browser. */
export async function getPlacementQuestions(): Promise<PlacementQuestion[]> {
  "use cache";
  const rows = await prisma.exercise.findMany({
    where: { phase: "placement", archivedAt: null },
    orderBy: { order: "asc" },
  });
  const sectionOrder = { grammar: 0, vocabulary: 1, reading: 2 } as const;
  return rows
    .filter(
      (r): r is Exercise & { placementSection: "grammar" | "vocabulary" | "reading" } =>
        r.placementSection === "grammar" || r.placementSection === "vocabulary" || r.placementSection === "reading",
    )
    .sort((a, b) => sectionOrder[a.placementSection] - sectionOrder[b.placementSection] || a.order - b.order)
    .map((r) => ({ section: r.placementSection, exercise: toClient(r) }));
}

export interface GraphLesson {
  id: string;
  slug: string;
  title: string;
  objective: string;
  levelCode: Cefr;
  unitSlug: string;
  unitTitle: string;
  status: "planned" | "published";
  estimatedMinutes: number | null;
  exerciseCount: number;
  conceptSlugs: string[];
}

export interface GraphConcept {
  id: string;
  slug: string;
  name: string;
  description: string;
  skill: Exercise["skill"];
  levelCode: Cefr;
  prerequisites: string[];
  lessonSlugs: string[];
}

/** Lessons (in curriculum order) and concepts with their links — the shape the recommendation engine needs. */
export async function getCurriculumGraph(): Promise<{ lessons: GraphLesson[]; concepts: GraphConcept[] }> {
  "use cache";
  const [levels, concepts] = await Promise.all([
    prisma.level.findMany({
      orderBy: { order: "asc" },
      include: {
        modules: {
          where: { archivedAt: null },
          orderBy: { order: "asc" },
          include: {
            units: {
              where: { archivedAt: null },
              orderBy: { order: "asc" },
              include: {
                lessons: {
                  where: { archivedAt: null },
                  orderBy: { order: "asc" },
                  include: {
                    concepts: { include: { concept: { select: { slug: true } } } },
                    _count: { select: { exercises: { where: { archivedAt: null } } } },
                  },
                },
              },
            },
          },
        },
      },
    }),
    prisma.concept.findMany({
      include: {
        prerequisites: { include: { prerequisite: { select: { slug: true } } } },
        lessons: { include: { lesson: { select: { slug: true, archivedAt: true } } } },
      },
    }),
  ]);
  const lessons = levels.flatMap((level) =>
    level.modules.flatMap((m) =>
      m.units.flatMap((u) =>
        u.lessons.map((l) => ({
          id: l.id,
          slug: l.slug,
          title: l.title,
          objective: l.objective,
          levelCode: level.code,
          unitSlug: u.slug,
          unitTitle: u.title,
          status: l.status,
          estimatedMinutes: l.estimatedMinutes,
          exerciseCount: l._count.exercises,
          conceptSlugs: l.concepts.map((c) => c.concept.slug),
        })),
      ),
    ),
  );
  const levelOrder = new Map(levels.map((l, i) => [l.code, i]));
  return {
    lessons,
    concepts: concepts
      .map((c) => ({
        id: c.id,
        slug: c.slug,
        name: c.name,
        description: c.description,
        skill: c.skill,
        levelCode: c.levelCode,
        prerequisites: c.prerequisites.map((p) => p.prerequisite.slug),
        lessonSlugs: c.lessons.filter((l) => !l.lesson.archivedAt).map((l) => l.lesson.slug),
      }))
      .sort((a, b) => (levelOrder.get(a.levelCode) ?? 0) - (levelOrder.get(b.levelCode) ?? 0)),
  };
}

/** Independent and recall exercises from the given lessons, for mixed practice (browser-safe). */
export async function getPracticePool(lessonIds: string[]): Promise<{ lessonId: string; exercise: ClientExercise }[]> {
  "use cache";
  if (lessonIds.length === 0) return [];
  const rows = await prisma.exercise.findMany({
    where: { lessonId: { in: lessonIds }, archivedAt: null, phase: { in: ["independent", "recall"] } },
    orderBy: [{ lessonId: "asc" }, { order: "asc" }],
  });
  return rows.map((row) => ({ lessonId: row.lessonId!, exercise: toClient(row) }));
}

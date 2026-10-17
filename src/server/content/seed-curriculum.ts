/**
 * Load validated curriculum content into the database.
 * Idempotent: upserts by stable slug. Content removed from the files is archived
 * (archivedAt), never deleted, so learners' past attempts stay valid.
 * Learner tables are never touched.
 *
 * Writes run in parallel batches for speed rather than in one transaction; because
 * every step is an upsert or a full replace, re-running the seed repairs any
 * interrupted run.
 *
 * Deliberately free of "server-only" so the seed script and tests can import it.
 */
import type { ExerciseContent } from "@content/schemas";
import { labExercises, type ValidatedContent } from "@content/validate";
import type { Prisma, PrismaClient } from "@/generated/prisma/client";

export interface SeedSummary {
  levels: number;
  concepts: number;
  modules: number;
  units: number;
  lessons: number;
  publishedLessons: number;
  exercises: number;
  placementItems: number;
  labQuestions: number;
  vocabularyEntries: number;
  archived: number;
}

const LEVEL_ORDER = ["A1", "A2", "B1", "B2", "C1", "C2"] as const;
type Cefr = (typeof LEVEL_ORDER)[number];
const CONCURRENCY = 8;

/** Run fn over items with at most `limit` in flight, preserving order of results. */
async function mapLimit<T, R>(items: readonly T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const results = new Array<R>(items.length);
  let next = 0;
  async function worker() {
    while (next < items.length) {
      const i = next++;
      results[i] = await fn(items[i]);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}

interface ExerciseRow {
  e: ExerciseContent;
  lessonSlug: string | null;
  phase: "guided" | "independent" | "recall" | "placement" | "skill_lab";
  order: number;
  placementSection?: "grammar" | "vocabulary" | "reading" | "listening";
  placementLevel?: Cefr;
}

export async function seedCurriculum(prisma: PrismaClient, content: ValidatedContent): Promise<SeedSummary> {
  const { levels } = content;

  // Levels and concepts
  await mapLimit(levels, CONCURRENCY, (level) => {
    const data = { order: LEVEL_ORDER.indexOf(level.code), title: level.title, description: level.description };
    return prisma.level.upsert({ where: { code: level.code }, create: { code: level.code, ...data }, update: data });
  });

  const concepts = levels.flatMap((l) => l.concepts.map((c) => ({ c, levelCode: l.code })));
  const conceptRows = await mapLimit(concepts, CONCURRENCY, ({ c, levelCode }) => {
    const data = { name: c.name, description: c.description, skill: c.skill, levelCode };
    return prisma.concept.upsert({ where: { slug: c.slug }, create: { slug: c.slug, ...data }, update: data });
  });
  const conceptIds = new Map(conceptRows.map((r) => [r.slug, r.id]));

  await prisma.conceptPrerequisite.deleteMany({ where: { conceptId: { in: [...conceptIds.values()] } } });
  await prisma.conceptPrerequisite.createMany({
    data: concepts.flatMap(({ c }) =>
      c.prerequisites.map((p) => ({ conceptId: conceptIds.get(c.slug)!, prerequisiteId: conceptIds.get(p)! })),
    ),
  });

  // Modules → units → lessons
  const modules = levels.flatMap((l) => l.modules.map((m, order) => ({ m, order, levelCode: l.code })));
  const moduleRows = await mapLimit(modules, CONCURRENCY, ({ m, order, levelCode }) => {
    const data = { levelCode, order, title: m.title, description: m.description, archivedAt: null };
    return prisma.courseModule.upsert({ where: { slug: m.slug }, create: { slug: m.slug, ...data }, update: data });
  });
  const moduleIds = new Map(moduleRows.map((r) => [r.slug, r.id]));

  const units = modules.flatMap(({ m }) => m.units.map((u, order) => ({ u, order, moduleSlug: m.slug })));
  const unitRows = await mapLimit(units, CONCURRENCY, ({ u, order, moduleSlug }) => {
    const data = { moduleId: moduleIds.get(moduleSlug)!, order, title: u.title, archivedAt: null };
    return prisma.unit.upsert({ where: { slug: u.slug }, create: { slug: u.slug, ...data }, update: data });
  });
  const unitIds = new Map(unitRows.map((r) => [r.slug, r.id]));

  const lessons = units.flatMap(({ u }) => u.lessons.map((l, order) => ({ l, order, unitSlug: u.slug })));
  const lessonRows = await mapLimit(lessons, CONCURRENCY, ({ l, order, unitSlug }) => {
    const published = l.status === "published";
    const data = {
      unitId: unitIds.get(unitSlug)!,
      order,
      title: l.title,
      objective: l.objective,
      status: l.status,
      body: published ? (l.body as Prisma.InputJsonValue) : undefined,
      application: published ? (l.application as Prisma.InputJsonValue) : undefined,
      masteryCriteria: published ? l.masteryCriteria : [],
      estimatedMinutes: published ? l.estimatedMinutes : null,
      archivedAt: null,
    };
    return prisma.lesson.upsert({ where: { slug: l.slug }, create: { slug: l.slug, ...data }, update: data });
  });
  const lessonIds = new Map(lessonRows.map((r) => [r.slug, r.id]));

  await prisma.lessonConcept.deleteMany({ where: { lessonId: { in: [...lessonIds.values()] } } });
  await prisma.lessonConcept.createMany({
    data: lessons.flatMap(({ l }) =>
      l.concepts.map((slug) => ({ lessonId: lessonIds.get(l.slug)!, conceptId: conceptIds.get(slug)! })),
    ),
  });

  // Exercises (lesson practice + placement)
  const exercises: ExerciseRow[] = [
    ...lessons.flatMap(({ l }) =>
      l.status !== "published"
        ? []
        : [
            ...l.guided.map((e) => ({ e, phase: "guided" as const })),
            ...l.independent.map((e) => ({ e, phase: "independent" as const })),
            ...l.recall.map((e) => ({ e, phase: "recall" as const })),
          ].map(({ e, phase }, order) => ({ e, phase, order, lessonSlug: l.slug })),
    ),
    ...content.placement.map((p, order) => ({
      e: p.exercise,
      phase: "placement" as const,
      order,
      lessonSlug: null,
      placementSection: p.section,
      placementLevel: p.level,
    })),
    ...labExercises(content.labs).map((e, order) => ({
      e,
      phase: "skill_lab" as const,
      order,
      lessonSlug: null,
    })),
  ];
  const exerciseRows = await mapLimit(exercises, CONCURRENCY, (x) => {
    const data = {
      lessonId: x.lessonSlug ? lessonIds.get(x.lessonSlug)! : null,
      type: x.e.type,
      phase: x.phase,
      order: x.order,
      objective: x.e.objective,
      instructions: x.e.instructions,
      explanation: x.e.explanation,
      hint: x.e.hint ?? null,
      payload: x.e.payload as Prisma.InputJsonValue,
      difficulty: x.e.difficulty,
      skill: x.e.skill,
      placementSection: x.placementSection ?? null,
      placementLevel: x.placementLevel ?? null,
      archivedAt: null,
    };
    return prisma.exercise.upsert({ where: { slug: x.e.slug }, create: { slug: x.e.slug, ...data }, update: data });
  });
  const exerciseIds = new Map(exerciseRows.map((r) => [r.slug, r.id]));

  await prisma.exerciseConcept.deleteMany({ where: { exerciseId: { in: [...exerciseIds.values()] } } });
  await prisma.exerciseConcept.createMany({
    data: exercises.flatMap(({ e }) =>
      e.concepts.map((slug) => ({ exerciseId: exerciseIds.get(e.slug)!, conceptId: conceptIds.get(slug)! })),
    ),
  });

  // Vocabulary entries
  const vocab = content.vocabulary.flatMap((set) => set.entries.map((e) => ({ e, levelCode: set.level })));
  await mapLimit(vocab, CONCURRENCY, ({ e, levelCode }) => {
    const data = {
      headword: e.headword,
      partOfSpeech: e.partOfSpeech,
      levelCode,
      topic: e.topic,
      definition: e.definition,
      examples: e.examples,
      collocations: e.collocations,
      ipa: e.ipa ?? null,
      usageNote: e.usageNote ?? null,
      commonErrors: (e.commonErrors ?? []) as Prisma.InputJsonValue,
      cloze: e.cloze as Prisma.InputJsonValue,
      archivedAt: null,
    };
    return prisma.vocabularyEntry.upsert({ where: { slug: e.slug }, create: { slug: e.slug, ...data }, update: data });
  });

  // Archive anything no longer in the content files.
  const now = new Date();
  const archived = await Promise.all([
    prisma.courseModule.updateMany({
      where: { slug: { notIn: [...moduleIds.keys()] }, archivedAt: null },
      data: { archivedAt: now },
    }),
    prisma.unit.updateMany({
      where: { slug: { notIn: [...unitIds.keys()] }, archivedAt: null },
      data: { archivedAt: now },
    }),
    prisma.lesson.updateMany({
      where: { slug: { notIn: [...lessonIds.keys()] }, archivedAt: null },
      data: { archivedAt: now },
    }),
    prisma.exercise.updateMany({
      where: { slug: { notIn: [...exerciseIds.keys()] }, archivedAt: null, source: "seed" },
      data: { archivedAt: now },
    }),
    prisma.vocabularyEntry.updateMany({
      where: { slug: { notIn: vocab.map((v) => v.e.slug) }, archivedAt: null },
      data: { archivedAt: now },
    }),
  ]);

  return {
    levels: levels.length,
    concepts: conceptIds.size,
    modules: moduleIds.size,
    units: unitIds.size,
    lessons: lessonIds.size,
    publishedLessons: lessons.filter(({ l }) => l.status === "published").length,
    exercises: exercises.filter((x) => x.lessonSlug !== null).length,
    placementItems: content.placement.length,
    labQuestions: labExercises(content.labs).length,
    vocabularyEntries: vocab.length,
    archived: archived.reduce((sum, r) => sum + r.count, 0),
  };
}

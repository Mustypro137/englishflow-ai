/**
 * Validate all curriculum content: each file against its schema, plus checks that
 * need the whole curriculum (unique slugs, prerequisites that exist and have no cycles).
 */
import { curriculum, placementItems, vocabulary as vocabularySets } from "./index";
import {
  levelSchema,
  placementItemSchema,
  type ParsedLevel,
  type PlacementItem,
  type VocabularySet,
  vocabularySetSchema,
} from "./schemas";

export interface ValidatedContent {
  levels: ParsedLevel[];
  placement: PlacementItem[];
  vocabulary: VocabularySet[];
}

export class ContentError extends Error {
  constructor(public problems: string[]) {
    super(`Curriculum content is invalid:\n- ${problems.join("\n- ")}`);
  }
}

export function validateContent(
  rawLevels: unknown[] = curriculum,
  rawPlacement: unknown[] = placementItems,
  rawVocabulary: unknown[] = vocabularySets,
): ValidatedContent {
  const problems: string[] = [];
  const levels: ParsedLevel[] = [];
  for (const [i, raw] of rawLevels.entries()) {
    const r = levelSchema.safeParse(raw);
    if (r.success) levels.push(r.data);
    else for (const issue of r.error.issues) problems.push(`level[${i}] ${issue.path.join(".")}: ${issue.message}`);
  }
  const placement: PlacementItem[] = [];
  for (const [i, raw] of rawPlacement.entries()) {
    const r = placementItemSchema.safeParse(raw);
    if (r.success) placement.push(r.data);
    else for (const issue of r.error.issues) problems.push(`placement[${i}] ${issue.path.join(".")}: ${issue.message}`);
  }
  const vocabulary: VocabularySet[] = [];
  for (const [i, raw] of rawVocabulary.entries()) {
    const r = vocabularySetSchema.safeParse(raw);
    if (r.success) vocabulary.push(r.data);
    else
      for (const issue of r.error.issues) problems.push(`vocabulary[${i}] ${issue.path.join(".")}: ${issue.message}`);
  }
  if (problems.length) throw new ContentError(problems);

  const dupes = (label: string, values: string[]) => {
    const seen = new Set<string>();
    for (const v of values) {
      if (seen.has(v)) problems.push(`Duplicate ${label}: ${v}`);
      seen.add(v);
    }
  };

  const concepts = levels.flatMap((l) => l.concepts);
  const modules = levels.flatMap((l) => l.modules);
  const units = modules.flatMap((m) => m.units);
  const lessons = units.flatMap((u) => u.lessons);
  const exercises = [
    ...lessons.flatMap((l) => (l.status === "published" ? [...l.guided, ...l.independent, ...l.recall] : [])),
    ...placement.map((p) => p.exercise),
  ];

  dupes(
    "level",
    levels.map((l) => l.code),
  );
  dupes(
    "concept",
    concepts.map((c) => c.slug),
  );
  dupes(
    "module",
    modules.map((m) => m.slug),
  );
  dupes(
    "unit",
    units.map((u) => u.slug),
  );
  dupes(
    "lesson",
    lessons.map((l) => l.slug),
  );
  dupes(
    "vocabulary entry",
    vocabulary.flatMap((v) => v.entries.map((e) => e.slug)),
  );
  dupes(
    "exercise",
    exercises.map((e) => e.slug),
  );

  const conceptSlugs = new Set(concepts.map((c) => c.slug));
  for (const c of concepts) {
    for (const p of c.prerequisites)
      if (!conceptSlugs.has(p)) problems.push(`Concept ${c.slug}: unknown prerequisite ${p}`);
    if (c.prerequisites.includes(c.slug)) problems.push(`Concept ${c.slug} requires itself`);
  }
  for (const l of lessons) {
    for (const s of l.concepts) if (!conceptSlugs.has(s)) problems.push(`Lesson ${l.slug}: unknown concept ${s}`);
  }
  for (const e of exercises) {
    for (const s of e.concepts) if (!conceptSlugs.has(s)) problems.push(`Exercise ${e.slug}: unknown concept ${s}`);
  }

  // Prerequisite cycles (depth-first search).
  const graph = new Map(concepts.map((c) => [c.slug, c.prerequisites]));
  const state = new Map<string, "visiting" | "done">();
  const visit = (slug: string, path: string[]) => {
    if (state.get(slug) === "done") return;
    if (state.get(slug) === "visiting") {
      problems.push(`Prerequisite cycle: ${[...path, slug].join(" → ")}`);
      return;
    }
    state.set(slug, "visiting");
    for (const p of graph.get(slug) ?? []) visit(p, [...path, slug]);
    state.set(slug, "done");
  };
  for (const slug of graph.keys()) visit(slug, []);

  if (problems.length) throw new ContentError(problems);
  return { levels, placement, vocabulary };
}

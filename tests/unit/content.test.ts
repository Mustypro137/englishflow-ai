import { describe, expect, it } from "vitest";
import { ContentError, validateContent } from "@content/validate";
import { gradeExercise } from "@/lib/learning/grading/grade-exercise";
import { toClientExercise } from "@/lib/learning/client-exercise";
import type { ExerciseContent } from "@content/schemas";

const content = validateContent();
const lessons = content.levels.flatMap((l) => l.modules.flatMap((m) => m.units.flatMap((u) => u.lessons)));
const published = lessons.flatMap((l) => (l.status === "published" ? [l] : []));
const lessonExercises = published.flatMap((l) => [...l.guided, ...l.independent, ...l.recall]);

/** Build a response that should be graded correct, from the content's own answers. */
function correctResponse(e: ExerciseContent): unknown {
  switch (e.type) {
    case "multiple_choice":
      return { optionId: e.payload.correct };
    case "gap_fill":
      return { answers: e.payload.blanks.map((b) => b.accepted[0]) };
    case "word_order":
      return { tokens: e.payload.accepted[0].split(" ") };
    case "matching":
      return { matches: e.payload.pairs.map((p) => p.right) };
    default:
      return { answer: e.payload.accepted[0] };
  }
}

describe("curriculum content", () => {
  it("passes schema and whole-curriculum validation", () => {
    expect(content.levels.map((l) => l.code)).toEqual(["A1", "A2", "B1", "B2", "C1", "C2"]);
  });

  it("has the eight published A1 lessons, each with every required part", () => {
    expect(published).toHaveLength(8);
    for (const l of published) {
      expect(l.guided.length, l.slug).toBeGreaterThanOrEqual(3);
      expect(l.independent.length, l.slug).toBeGreaterThanOrEqual(3);
      expect(l.recall.length, l.slug).toBeGreaterThanOrEqual(2);
      expect(l.masteryCriteria.length, l.slug).toBeGreaterThan(0);
      expect(l.application.modelAnswers.length, l.slug).toBeGreaterThan(0);
    }
  });

  it("uses every exercise type at least once", () => {
    const types = new Set(lessonExercises.map((e) => e.type));
    expect([...types].sort()).toEqual(
      [
        "error_correction",
        "gap_fill",
        "matching",
        "multiple_choice",
        "sentence_completion",
        "short_answer",
        "transformation",
        "word_order",
      ].sort(),
    );
  });

  it("marks every content answer as correct when graded (answers and grading agree)", () => {
    for (const e of [...lessonExercises, ...content.placement.map((p) => p.exercise)]) {
      expect(gradeExercise(e, correctResponse(e)).correct, e.slug).toBe(true);
    }
  });

  it("never marks a listed wrong answer as correct", () => {
    for (const e of lessonExercises) {
      const feedbackMaps =
        e.type === "gap_fill"
          ? e.payload.blanks.map((b, i) => [i, b.feedback] as const)
          : "feedback" in e.payload
            ? [[0, e.payload.feedback] as const]
            : [];
      for (const [blank, map] of feedbackMaps) {
        for (const wrong of Object.keys(map ?? {})) {
          let response: unknown;
          if (e.type === "gap_fill") {
            const answers = e.payload.blanks.map((b) => b.accepted[0]);
            answers[blank] = wrong;
            response = { answers };
          } else response = { answer: wrong };
          expect(gradeExercise(e, response).correct, `${e.slug}: "${wrong}"`).toBe(false);
        }
      }
    }
  });

  it("has placement items for grammar and vocabulary at every level and three reading passages", () => {
    for (const section of ["grammar", "vocabulary"] as const) {
      const levels = new Set(content.placement.filter((p) => p.section === section).map((p) => p.level));
      expect([...levels].sort(), section).toEqual(["A1", "A2", "B1", "B2", "C1", "C2"]);
    }
    const passages = new Set(
      content.placement
        .filter((p) => p.section === "reading")
        .map((p) => p.exercise.type === "multiple_choice" && p.exercise.payload.passage?.title),
    );
    expect(passages.size).toBe(3);
  });

  it("does not let the position of the correct option follow a pattern", () => {
    const mcs = [...lessonExercises, ...content.placement.map((p) => p.exercise)].filter(
      (e): e is Extract<ExerciseContent, { type: "multiple_choice" }> => e.type === "multiple_choice",
    );
    const positions = new Map<number, number>();
    for (const e of mcs) {
      const client = toClientExercise({ ...e, id: e.slug });
      if (client.type !== "multiple_choice") continue;
      const pos = client.options.findIndex((o) => o.id === e.payload.correct);
      positions.set(pos, (positions.get(pos) ?? 0) + 1);
    }
    const share = Math.max(...positions.values()) / mcs.length;
    expect(share, JSON.stringify([...positions])).toBeLessThan(0.5);
  });

  it("reports broken content clearly", () => {
    const broken = structuredClone(content.levels[0]) as unknown as { concepts: { prerequisites: string[] }[] };
    broken.concepts[0].prerequisites = ["does-not-exist"];
    expect(() => validateContent([broken], [])).toThrow(ContentError);
    expect(() => validateContent([broken], [])).toThrow(/unknown prerequisite does-not-exist/);
  });

  it("detects prerequisite cycles", () => {
    const cyclic = structuredClone(content.levels[0]) as unknown as {
      concepts: { slug: string; prerequisites: string[] }[];
    };
    const first = cyclic.concepts.find((c) => c.slug === "subject-pronouns")!;
    first.prerequisites = ["be-present-positive"];
    expect(() => validateContent([cyclic], [])).toThrow(/Prerequisite cycle/);
  });
});

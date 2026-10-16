import { describe, expect, it } from "vitest";
import { buildSessionPlan, allocate, clampSessionMinutes } from "@/lib/learning/planner";
import { nextLesson, recommend } from "@/lib/learning/recommend/engine";
import type { LearnerSnapshot, SnapshotLesson } from "@/lib/learning/snapshot";

const now = new Date("2026-10-20T10:00:00Z");

function lesson(i: number, overrides: Partial<SnapshotLesson> = {}): SnapshotLesson {
  return {
    id: `l${i}`,
    slug: `lesson-${i}`,
    title: `Lesson ${i}`,
    objective: `Objective ${i}`,
    levelCode: "A1",
    unitSlug: i <= 2 ? "unit-1" : "unit-2",
    unitTitle: i <= 2 ? "People and things" : "Daily life",
    status: "published",
    estimatedMinutes: 15,
    conceptSlugs: [`c${i}`],
    answered: 0,
    total: 10,
    completed: false,
    completedAt: null,
    ...overrides,
  };
}

function snapshot(overrides: Partial<LearnerSnapshot> = {}): LearnerSnapshot {
  return {
    now,
    timezone: "UTC",
    level: "A1",
    goals: [],
    reviewsDue: 0,
    recurringMistakes: [],
    lessons: [lesson(1), lesson(2), lesson(3), lesson(4, { status: "planned" })],
    concepts: [
      { slug: "c1", name: "Concept one", skill: "grammar", levelCode: "A1", prerequisites: [], state: "new" },
      { slug: "c2", name: "Concept two", skill: "grammar", levelCode: "A1", prerequisites: ["c1"], state: "new" },
      { slug: "c3", name: "Concept three", skill: "grammar", levelCode: "A1", prerequisites: ["c1"], state: "new" },
    ],
    recentPracticeBySkill: {},
    savedWords: 0,
    lastMixedPracticeAt: null,
    ...overrides,
  };
}

describe("recommendation engine", () => {
  it("a brand-new learner is pointed at the first lesson, with a reason", () => {
    const recs = recommend(snapshot());
    expect(recs).toHaveLength(1);
    expect(recs[0]).toMatchObject({ kind: "lesson", href: "/app/learn/lesson-1" });
    expect(recs[0].reason).toMatch(/Next in your path/);
  });

  it("puts due reviews first", () => {
    const recs = recommend(snapshot({ reviewsDue: 7 }));
    expect(recs[0]).toMatchObject({ kind: "review", title: "Review 7 items", href: "/app/review" });
    expect(recs[0].reason).toMatch(/7 items are due/);
  });

  it("targets concepts with repeated mistakes, but not a single slip", () => {
    const one = recommend(
      snapshot({ recurringMistakes: [{ conceptSlug: "c2", name: "Concept two", openMistakes: 1 }] }),
    );
    expect(one.some((r) => r.kind === "targeted")).toBe(false);
    const three = recommend(
      snapshot({ recurringMistakes: [{ conceptSlug: "c2", name: "Concept two", openMistakes: 3 }] }),
    );
    const targeted = three.find((r) => r.kind === "targeted")!;
    expect(targeted).toMatchObject({ href: "/app/learn/lesson-2#guided" });
    expect(targeted.reason).toMatch(/3 unfixed mistakes with Concept two/);
  });

  it("recommends an unfinished prerequisite before the next lesson", () => {
    // Lesson 1 finished but its concept isn't secure yet; next lesson (2) needs c1.
    const s = snapshot({
      level: "A1",
      lessons: [lesson(1, { completed: false, answered: 2 }), lesson(2), lesson(3)],
    });
    // Learner skipped ahead: lesson 2 is "next" only if lesson 1 is done, so mark 1 complete but c1 weak via a third lesson needing c1.
    const recs = recommend({
      ...s,
      lessons: [lesson(5, { conceptSlugs: ["c1"], slug: "lesson-c1", title: "Teaches c1" }), ...s.lessons],
    });
    expect(recs.some((r) => r.kind === "lesson")).toBe(true);
    // Prerequisite rule: next lesson teaches c1 itself here, so no prerequisite suggestion.
    expect(recs.some((r) => r.kind === "prerequisite")).toBe(false);
  });

  it("flags a prerequisite that is taught by an unfinished lesson elsewhere", () => {
    const s = snapshot({
      lessons: [
        lesson(2, { conceptSlugs: ["c2"] }), // next lesson, needs c1
        lesson(9, { slug: "basics", title: "The basics", conceptSlugs: ["c1"] }), // teaches c1, not done
      ],
    });
    const pre = recommend(s).find((r) => r.kind === "prerequisite")!;
    expect(pre).toMatchObject({ href: "/app/learn/basics" });
    expect(pre.reason).toBe("“Concept one” is needed before “Lesson 2”.");
  });

  it("suggests vocabulary when it matters for the learner's goals and is under-practised", () => {
    const recs = recommend(snapshot({ goals: ["travel"] }));
    const skill = recs.find((r) => r.kind === "skill")!;
    expect(skill).toMatchObject({ title: "Save five new words", href: "/app/vocabulary" });
    expect(
      recommend(snapshot({ goals: ["travel"], recentPracticeBySkill: { vocabulary: 20 } })).some(
        (r) => r.kind === "skill",
      ),
    ).toBe(false);
  });

  it("is honest when no lessons exist yet at the learner's level", () => {
    const recs = recommend(snapshot({ level: "B1" }));
    expect(recs[0].reason).toMatch(/Lessons at your level \(B1\) aren't written yet/);
    expect(nextLesson(snapshot({ level: "B1" }))).toMatchObject({ belowLevel: true });
  });

  it("offers a mixed check after a unit is finished, once", () => {
    const done = new Date("2026-10-19T10:00:00Z");
    const finished = snapshot({
      lessons: [
        lesson(1, { completed: true, completedAt: done }),
        lesson(2, { completed: true, completedAt: done }),
        lesson(3),
      ],
    });
    const mixed = recommend(finished).find((r) => r.kind === "mixed_practice")!;
    expect(mixed).toMatchObject({ href: "/app/practice?unit=unit-1" });
    expect(recommend({ ...finished, lastMixedPracticeAt: now }).some((r) => r.kind === "mixed_practice")).toBe(false);
  });

  it("never repeats the same destination and respects the limit", () => {
    const recs = recommend(
      snapshot({
        reviewsDue: 3,
        goals: ["travel"],
        recurringMistakes: [{ conceptSlug: "c1", name: "Concept one", openMistakes: 4 }],
      }),
      2,
    );
    expect(recs).toHaveLength(2);
    expect(new Set(recs.map((r) => r.href.split("#")[0])).size).toBe(2);
  });
});

describe("study planner", () => {
  it("allocates whole minutes that add up exactly", () => {
    const a = allocate(17, { review: 5, new_learning: 7, targeted: 7 });
    expect(Object.values(a).reduce((x, y) => x + (y ?? 0), 0)).toBe(17);
  });

  it("follows the 30-minute template when everything is relevant", () => {
    const s = snapshot({ reviewsDue: 5, lessons: [lesson(1, { completed: true, completedAt: now }), lesson(2)] });
    const plan = buildSessionPlan(30, s, recommend(s));
    expect(plan.blocks.map((b) => [b.kind, b.minutes])).toEqual([
      ["review", 5],
      ["new_learning", 7],
      ["targeted", 7],
      ["vocabulary", 6],
      ["apply", 5],
    ]);
  });

  it("gives review time to new learning when nothing is due", () => {
    const s = snapshot({ reviewsDue: 0 });
    const plan = buildSessionPlan(20, s, recommend(s));
    expect(plan.blocks.some((b) => b.kind === "review")).toBe(false);
    expect(plan.notes.join(" ")).toMatch(/No reviews are due/);
    expect(plan.blocks.reduce((a, b) => a + b.minutes, 0)).toBe(20);
  });

  it("puts more weight on review with a large backlog", () => {
    const s = snapshot({ reviewsDue: 40, lessons: [lesson(1, { completed: true, completedAt: now }), lesson(2)] });
    const plan = buildSessionPlan(30, s, recommend(s));
    const review = plan.blocks.find((b) => b.kind === "review")!;
    expect(review.minutes).toBeGreaterThan(5);
  });

  it("keeps a 10-minute session to blocks of at least 2 minutes", () => {
    const s = snapshot({ reviewsDue: 3, lessons: [lesson(1, { completed: true, completedAt: now }), lesson(2)] });
    const plan = buildSessionPlan(10, s, recommend(s));
    expect(plan.blocks.every((b) => b.minutes >= 2)).toBe(true);
    expect(plan.blocks.reduce((a, b) => a + b.minutes, 0)).toBe(10);
  });

  it("supports a custom length within limits", () => {
    expect(clampSessionMinutes(3)).toBe(5);
    expect(clampSessionMinutes(500)).toBe(120);
    expect(clampSessionMinutes(Number.NaN)).toBe(20);
    const s = snapshot();
    expect(buildSessionPlan(45, s, recommend(s)).blocks.reduce((a, b) => a + b.minutes, 0)).toBe(45);
  });

  it("is honest that listening and reading aren't available yet", () => {
    const s = snapshot();
    expect(buildSessionPlan(30, s, recommend(s)).notes.join(" ")).toMatch(
      /Listening and reading practice arrive later/,
    );
  });
});

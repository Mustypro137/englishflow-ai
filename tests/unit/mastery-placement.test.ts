import { describe, expect, it } from "vitest";
import { applyAttempt, applyExposure, EMPTY_PROGRESS, MASTERY_CONFIG } from "@/lib/learning/mastery";
import { estimatePlacement, estimateSection, type PlacementAnswer } from "@/lib/learning/placement";
import type { Cefr } from "@content/schemas";

const now = new Date("2026-10-16T10:00:00Z");

describe("concept progress", () => {
  it("opening a lesson is exposure only", () => {
    const p = applyExposure(EMPTY_PROGRESS, now);
    expect(p).toMatchObject({ exposures: 1, attempts: 0, masteryState: "new", lastExposedAt: now });
  });

  it("one attempt moves to learning; enough accurate answers move to practicing", () => {
    let p = applyAttempt(EMPTY_PROGRESS, { correct: false, independent: true }, now);
    expect(p.masteryState).toBe("learning");
    for (let i = 0; i < 3; i++) p = applyAttempt(p, { correct: true, independent: true }, now);
    expect(p).toMatchObject({ attempts: 4, correct: 3, independentCorrect: 3, masteryState: "practicing" });
  });

  it("only counts independent correct answers as independent", () => {
    const p = applyAttempt(EMPTY_PROGRESS, { correct: true, independent: false }, now);
    expect(p).toMatchObject({ correct: 1, independentCorrect: 0 });
  });

  it("drops back to learning when recent accuracy falls", () => {
    let p = EMPTY_PROGRESS;
    for (let i = 0; i < 4; i++) p = applyAttempt(p, { correct: true, independent: true }, now);
    expect(p.masteryState).toBe("practicing");
    for (let i = 0; i < 4; i++) p = applyAttempt(p, { correct: false, independent: true }, now);
    expect(p.masteryState).toBe("learning");
  });

  it("keeps only the most recent outcomes", () => {
    let p = EMPTY_PROGRESS;
    for (let i = 0; i < 15; i++) p = applyAttempt(p, { correct: i % 2 === 0, independent: true }, now);
    expect(p.recentOutcomes).toHaveLength(MASTERY_CONFIG.recentWindow);
  });

  it("never awards mastered from practice alone", () => {
    let p = EMPTY_PROGRESS;
    for (let i = 0; i < 50; i++) p = applyAttempt(p, { correct: true, independent: true }, now);
    expect(p.masteryState).toBe("practicing");
  });
});

function answers(section: PlacementAnswer["section"], spec: Partial<Record<Cefr, boolean[]>>): PlacementAnswer[] {
  return Object.entries(spec).flatMap(([level, results]) =>
    results!.map((correct) => ({ section, level: level as Cefr, correct })),
  );
}

describe("placement estimate", () => {
  it("stops at the first level that is not passed", () => {
    const r = estimateSection(
      "grammar",
      answers("grammar", {
        A1: [true, true],
        A2: [true, true],
        B1: [true, false],
        B2: [false, false],
        C1: [true, true],
        C2: [false, false],
      }),
    );
    expect(r.level).toBe("B1");
    expect(r.atCeiling).toBe(false);
  });

  it("requires good cumulative accuracy, not just one lucky level", () => {
    const r = estimateSection(
      "grammar",
      answers("grammar", { A1: [true, false], A2: [true, false], B1: [true, false] }),
    );
    // A1 passes (50% level, 50% cumulative fails the 70% rule) → nothing passed.
    expect(r.level).toBeNull();
  });

  it("marks a learner who passes everything as at the ceiling of the check", () => {
    const r = estimateSection("reading", answers("reading", { A2: [true, true], B1: [true, true], B2: [true, true] }));
    expect(r).toMatchObject({ level: "B2", atCeiling: true });
  });

  it("needs enough answers per section", () => {
    const r = estimateSection("vocabulary", answers("vocabulary", { A1: [true, true] }));
    expect(r.enoughEvidence).toBe(false);
  });

  it("overall is the lower median of sections with enough evidence", () => {
    const all = [
      ...answers("grammar", { A1: [true, true], A2: [true, true], B1: [true, true], B2: [false, false] }),
      ...answers("vocabulary", { A1: [true, true], A2: [true, true], B1: [false, false] }),
      ...answers("reading", { A2: [true, true], B1: [true, true], B2: [true, true] }),
    ];
    const r = estimatePlacement(all);
    expect(r.sections.map((s) => s.level)).toEqual(["B1", "A2", "B2"]);
    expect(r.overall).toBe("B1");
    expect(r.enoughEvidence).toBe(true);
  });

  it("suggests starting at A1 when nothing is passed, and reports missing evidence", () => {
    expect(estimatePlacement(answers("grammar", { A1: [false, false], A2: [false, false] })).overall).toBeNull();
    expect(estimatePlacement([]).enoughEvidence).toBe(false);
  });
});

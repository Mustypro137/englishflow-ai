import { describe, expect, it } from "vitest";
import { pickNextLesson } from "@/lib/learning/next-lesson";

const level = (code: "A1" | "A2" | "B1", lessons: { id: string; status: "planned" | "published" }[]) => ({
  code,
  modules: [{ units: [{ lessons }] }],
});
const levels = [
  level("A1", [
    { id: "a1-1", status: "published" },
    { id: "a1-2", status: "published" },
    { id: "a1-3", status: "planned" },
  ]),
  level("A2", [{ id: "a2-1", status: "planned" }]),
  level("B1", [{ id: "b1-1", status: "planned" }]),
];

describe("pickNextLesson", () => {
  it("starts with the first lesson for a new learner", () => {
    expect(pickNextLesson(levels, () => false, null).lesson?.id).toBe("a1-1");
  });

  it("skips completed lessons and never suggests planned ones", () => {
    const r = pickNextLesson(levels, (id) => id === "a1-1", "A1");
    expect(r).toMatchObject({ lesson: { id: "a1-2" }, belowLearnerLevel: false });
  });

  it("says so honestly when nothing is written yet at the learner's level", () => {
    const r = pickNextLesson(levels, () => false, "B1");
    expect(r).toMatchObject({ lesson: { id: "a1-1", levelCode: "A1" }, belowLearnerLevel: true, allDone: false });
  });

  it("reports when every published lesson is done", () => {
    expect(pickNextLesson(levels, () => true, "A1")).toEqual({ lesson: null, belowLearnerLevel: false, allDone: true });
  });
});

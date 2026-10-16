import { describe, expect, it } from "vitest";
import { BLANK } from "@content/schemas";
import { validateContent } from "@content/validate";
import { describeResponse } from "@/lib/learning/grading/describe-response";
import type { GradableExercise } from "@/lib/learning/grading/grade-exercise";
import { checkTextAnswer } from "@/lib/learning/grading/text-answer";
import { vocabularyMode } from "@/lib/learning/review-card";

const { vocabulary } = validateContent();
const entries = vocabulary.flatMap((v) => v.entries);

describe("vocabulary content", () => {
  it("has 48 A1 words across six topics, each with examples and collocations", () => {
    expect(entries).toHaveLength(48);
    expect(new Set(entries.map((e) => e.topic)).size).toBe(6);
    for (const e of entries) {
      expect(e.examples.length, e.slug).toBeGreaterThanOrEqual(2);
      expect(e.collocations.length, e.slug).toBeGreaterThanOrEqual(1);
    }
  });

  it("uses clean, unique ids (accents removed)", () => {
    expect(new Set(entries.map((e) => e.slug)).size).toBe(entries.length);
    expect(entries.find((e) => e.headword === "café")?.slug).toBe("a1-cafe");
  });

  it("accepts every listed answer for each recall sentence, and the sentence has exactly one gap", () => {
    for (const e of entries) {
      expect(e.cloze.text.split(BLANK)).toHaveLength(2);
      for (const answer of e.cloze.accepted) {
        expect(checkTextAnswer(answer, { accepted: e.cloze.accepted }).status, `${e.slug}: ${answer}`).toBe("correct");
      }
    }
  });

  it("accepts regional alternatives where listed", () => {
    const find = (slug: string) => entries.find((e) => e.slug === slug)!;
    expect(find("a1-neighbour").cloze.accepted).toEqual(expect.arrayContaining(["neighbour", "neighbor"]));
    expect(find("a1-sofa").cloze.accepted).toContain("couch");
  });

  it("alternates review direction for saved words", () => {
    expect([0, 1, 2, 3].map(vocabularyMode)).toEqual([
      "word_recall",
      "word_recognise",
      "word_recall",
      "word_recognise",
    ]);
  });
});

describe("describeResponse", () => {
  const mc: GradableExercise = {
    type: "multiple_choice",
    explanation: "",
    payload: {
      prompt: "p",
      options: [
        { id: "a", text: "am" },
        { id: "b", text: "is" },
      ],
      correct: "b",
    },
  };
  const gap: GradableExercise = {
    type: "gap_fill",
    explanation: "",
    payload: { text: "I ___ here and they ___ there.", blanks: [{ accepted: ["am"] }, { accepted: ["are"] }] },
  };

  it("shows the chosen option text and the learner's gap answers in place", () => {
    expect(describeResponse(mc, { optionId: "a" })).toBe("am");
    expect(describeResponse(gap, { answers: ["is", "are"] })).toBe("I [is] here and they [are] there.");
    expect(describeResponse(mc, { optionId: "zzz" })).toBe("(no answer)");
  });
});

import { describe, expect, it } from "vitest";
import { gradeExercise, InvalidResponseError, type GradableExercise } from "@/lib/learning/grading/grade-exercise";
import { expandContractions, normalizeAnswer } from "@/lib/learning/grading/text-answer";
import { toClientExercise } from "@/lib/learning/client-exercise";

const explanation = "Because.";

const mc: GradableExercise = {
  type: "multiple_choice",
  explanation,
  payload: {
    prompt: "She ___ a doctor.",
    options: [
      { id: "a", text: "am" },
      { id: "b", text: "is" },
      { id: "c", text: "are" },
    ],
    correct: "b",
    optionFeedback: { a: "Am goes with I only." },
  },
};

const gap: GradableExercise = {
  type: "gap_fill",
  explanation,
  payload: {
    text: "I ___ a student and they ___ teachers.",
    blanks: [{ accepted: ["am", "'m"], feedback: { is: "Use am with I." } }, { accepted: ["are"] }],
  },
};

const order: GradableExercise = {
  type: "word_order",
  explanation,
  payload: { tokens: ["is", "she", "from", "Brazil"], accepted: ["she is from Brazil"], punctuation: "." },
};

const match: GradableExercise = {
  type: "matching",
  explanation,
  payload: {
    pairs: [
      { left: "I", right: "am" },
      { left: "she", right: "is" },
      { left: "they", right: "are" },
    ],
  },
};

const transform: GradableExercise = {
  type: "transformation",
  explanation,
  payload: {
    source: "He is happy.",
    instruction: "Make it negative.",
    accepted: ["He is not happy."],
    feedback: { "he not is happy": "Put not after is." },
  },
};

describe("text normalization", () => {
  it("ignores spaces before punctuation and final punctuation", () => {
    expect(normalizeAnswer("She is here .")).toBe("she is here");
  });

  it("expands contractions so short and full forms compare equal", () => {
    expect(expandContractions("she isn't here")).toBe("she is not here");
    expect(expandContractions("i'm ok, you're late")).toBe("i am ok, you are late");
    expect(expandContractions("i can not swim")).toBe("i cannot swim");
  });
});

describe("gradeExercise", () => {
  it("multiple choice: correct, and wrong with option-specific feedback", () => {
    expect(gradeExercise(mc, { optionId: "b" })).toMatchObject({ correct: true, score: 1, correctAnswer: "is" });
    expect(gradeExercise(mc, { optionId: "a" })).toMatchObject({
      correct: false,
      score: 0,
      feedback: "Am goes with I only.",
      explanation,
    });
    expect(gradeExercise(mc, { optionId: "c" }).feedback).toBeNull();
  });

  it("multiple choice: rejects unknown options", () => {
    expect(() => gradeExercise(mc, { optionId: "z" })).toThrow(InvalidResponseError);
  });

  it("gap fill: grades each blank, gives partial credit and the first targeted feedback", () => {
    expect(gradeExercise(gap, { answers: ["am", "are"] })).toMatchObject({ correct: true, score: 1 });
    const half = gradeExercise(gap, { answers: ["is", "are"] });
    expect(half).toMatchObject({ correct: false, score: 0.5, feedback: "Use am with I.", parts: [false, true] });
    expect(half.correctAnswer).toBe("I am a student and they are teachers.");
  });

  it("gap fill: rejects the wrong number of answers", () => {
    expect(() => gradeExercise(gap, { answers: ["am"] })).toThrow(InvalidResponseError);
  });

  it("word order: accepts the right order regardless of case and requires every token once", () => {
    expect(gradeExercise(order, { tokens: ["she", "is", "from", "Brazil"] })).toMatchObject({
      correct: true,
      correctAnswer: "She is from Brazil.",
    });
    expect(gradeExercise(order, { tokens: ["is", "she", "from", "Brazil"] }).correct).toBe(false);
    expect(() => gradeExercise(order, { tokens: ["she", "is", "Brazil"] })).toThrow(InvalidResponseError);
  });

  it("matching: partial credit per pair", () => {
    expect(gradeExercise(match, { matches: ["am", "is", "are"] })).toMatchObject({ correct: true, score: 1 });
    const r = gradeExercise(match, { matches: ["am", "are", "is"] });
    expect(r.correct).toBe(false);
    expect(r.score).toBeCloseTo(1 / 3);
    expect(r.parts).toEqual([true, false, false]);
  });

  it("transformation: accepts contractions and gives targeted feedback", () => {
    expect(gradeExercise(transform, { answer: "He isn't happy" }).correct).toBe(true);
    expect(gradeExercise(transform, { answer: "he's not happy." }).correct).toBe(true);
    expect(gradeExercise(transform, { answer: "He not is happy." })).toMatchObject({
      correct: false,
      feedback: "Put not after is.",
    });
  });

  it("rejects responses of the wrong shape", () => {
    expect(() => gradeExercise(transform, { optionId: "a" })).toThrow(InvalidResponseError);
    expect(() => gradeExercise(mc, "b")).toThrow(InvalidResponseError);
  });
});

describe("toClientExercise", () => {
  const meta = { id: "x", slug: "x", objective: "o", instructions: "i", hint: undefined, difficulty: 1 };
  const answerKeys = ["accepted", "correct", "feedback", "optionFeedback", "pairs", "explanation", "blanks"];

  it.each([
    ["multiple_choice", mc],
    ["gap_fill", gap],
    ["word_order", order],
    ["matching", match],
    ["transformation", transform],
  ] as const)("%s: never includes answers or explanations", (_name, ex) => {
    const client = toClientExercise({ ...meta, ...ex });
    for (const key of answerKeys) expect(Object.keys(client)).not.toContain(key);
    expect(JSON.stringify(client)).not.toContain("Because.");
  });

  it("does not leak the correct multiple-choice option or the matching order", () => {
    const client = toClientExercise({ ...meta, ...mc });
    expect(JSON.stringify(client)).not.toContain('"correct"');
    const m = toClientExercise({ ...meta, ...match });
    expect(m.type === "matching" && m.right).toEqual(["am", "are", "is"]);
  });
});

import { describe, expect, it } from "vitest";
import { checkTextAnswer, normalizeAnswer } from "@/lib/learning/grading/text-answer";

describe("normalizeAnswer", () => {
  it("ignores case, extra whitespace and trailing punctuation", () => {
    expect(normalizeAnswer("  She   GOES. ")).toBe("she goes");
    expect(normalizeAnswer("goes!?")).toBe("goes");
  });

  it("treats curly and straight apostrophes the same", () => {
    expect(normalizeAnswer("doesn’t")).toBe("doesn't");
  });

  it("keeps case when asked", () => {
    expect(normalizeAnswer("London", { caseSensitive: true })).toBe("London");
  });
});

describe("checkTextAnswer", () => {
  const spec = {
    accepted: ["goes"],
    wrongAnswerFeedback: { go: "Add -es with she." },
  };

  it("reports an empty answer separately from a wrong one", () => {
    expect(checkTextAnswer("   ", spec)).toEqual({ status: "empty" });
  });

  it("accepts the answer regardless of formatting", () => {
    expect(checkTextAnswer(" Goes. ", spec)).toEqual({ status: "correct", matched: "goes" });
  });

  it("returns targeted feedback for a predicted mistake", () => {
    expect(checkTextAnswer("GO", spec)).toEqual({ status: "incorrect", feedback: "Add -es with she." });
  });

  it("returns no specific feedback for an unexpected answer", () => {
    expect(checkTextAnswer("walks", spec)).toEqual({ status: "incorrect", feedback: undefined });
  });

  it("accepts any of several valid answers", () => {
    const multi = { accepted: ["do not", "don't"] };
    expect(checkTextAnswer("don’t", multi).status).toBe("correct");
    expect(checkTextAnswer("do not", multi).status).toBe("correct");
  });

  it("treats contractions and full forms as equal, even before punctuation", () => {
    const sentences = { accepted: ["No, it is not. It is Monday"] };
    expect(checkTextAnswer("No, it isn't. It's Monday.", sentences).status).toBe("correct");
    expect(checkTextAnswer("I'm Ana! You're Tom?", { accepted: ["I am Ana! You are Tom"] }).status).toBe("correct");
  });

  it("keeps contractions distinct when the exercise asks for it", () => {
    const strict = { accepted: ["do not"], contractionsEquivalent: false };
    expect(checkTextAnswer("don't", strict).status).toBe("incorrect");
  });

  it("does not accept a partial match", () => {
    expect(checkTextAnswer("goe", spec).status).toBe("incorrect");
  });
});

import {
  containsPhrase,
  listeningItemSchema,
  pairWordsIn,
  readingTextSchema,
  sentenceContaining,
  wordCount,
} from "@content/labs/schemas";
import { validateContent } from "@content/validate";
import { describe, expect, it } from "vitest";
import { allClipSpecs } from "@/lib/audio/clips";
import { clipHash, duplicateKeys, EMPTY_MANIFEST, planGeneration, resolveClip } from "@/lib/audio/manifest";
import { estimatePlacement, type PlacementAnswer } from "@/lib/learning/placement";
import { checkExpansion, usesPattern } from "@/lib/learning/sentence-studio";
import { compareDictation, diffWords, summarizeDiff, tokenize } from "@/lib/learning/text-diff";
import { sanitizeFeedback, type WritingFeedbackResponse } from "@/server/ai/writing-feedback";

describe("dictation comparison", () => {
  it("accepts an exact answer, ignoring case and punctuation", () => {
    const { summary } = compareDictation("Can I have a coffee, please?", "can i have a coffee please");
    expect(summary).toMatchObject({ exact: true, correct: 6, total: 6, accuracy: 1 });
  });

  it("treats contractions and full forms, and small numbers as digits or words, as the same", () => {
    expect(compareDictation("I'm from Brazil.", "I am from Brazil").summary.exact).toBe(true);
    expect(compareDictation("It's on platform six.", "its on platform 6").summary.exact).toBe(false);
    expect(compareDictation("It's on platform six.", "it's on platform 6").summary.exact).toBe(true);
    expect(compareDictation("That’s six pounds.", "That's six pounds").summary.exact).toBe(true);
  });

  it("finds a missing word", () => {
    const ops = diffWords("I live in flat four.", "I live flat four");
    expect(ops).toEqual([
      { kind: "equal", expected: "I", actual: "I" },
      { kind: "equal", expected: "live", actual: "live" },
      { kind: "missing", expected: "in" },
      { kind: "equal", expected: "flat", actual: "flat" },
      { kind: "equal", expected: "four.", actual: "four" },
    ]);
    expect(summarizeDiff(ops)).toMatchObject({ correct: 4, missing: 1, total: 5, exact: false });
  });

  it("pairs a wrong word with the right one and spots spelling slips", () => {
    const ops = diffWords("The train is late.", "The trian is lake");
    expect(ops.filter((o) => o.kind === "replace")).toEqual([
      { kind: "replace", expected: "train", actual: "trian", near: false },
      { kind: "replace", expected: "late.", actual: "lake", near: true },
    ]);
  });

  it("counts extra words against accuracy, so typing more doesn't help", () => {
    const { summary } = compareDictation("Good morning.", "good good morning morning");
    expect(summary.correct).toBe(2);
    expect(summary.extra).toBe(2);
    expect(summary.accuracy).toBe(0);
    expect(summary.exact).toBe(false);
  });

  it("handles empty input", () => {
    expect(compareDictation("Hello there.", "").summary).toMatchObject({ correct: 0, missing: 2, accuracy: 0 });
    expect(summarizeDiff(diffWords("", ""))).toMatchObject({ total: 0, exact: false });
  });

  it("keeps the written form of a contraction for display", () => {
    expect(tokenize("I'm here").map((t) => t.display)).toEqual(["I'm", "", "here"]);
  });
});

describe("transcript and rewrite comparison", () => {
  it("shows what changed between two versions", () => {
    const ops = diffWords("She goes to work by bus.", "She go to work.");
    expect(ops.map((o) => o.kind)).toEqual(["equal", "replace", "equal", "equal", "missing", "missing"]);
  });
});

describe("audio manifest", () => {
  const spec = { key: "listening/x/0", text: "Hello there.", voice: "female" as const };

  it("hashes words and voice, ignoring spacing", () => {
    expect(clipHash("Hello  there.", "female")).toBe(clipHash("Hello there.", "female"));
    expect(clipHash("Hello there.", "male")).not.toBe(clipHash("Hello there.", "female"));
    expect(clipHash("Hello there!", "female")).not.toBe(clipHash("Hello there.", "female"));
  });

  it("only uses a file while it matches the current words", () => {
    const manifest = {
      generator: "test",
      clips: { [spec.key]: { url: "https://example.com/a.mp3", hash: clipHash(spec.text, spec.voice) } },
    };
    expect(resolveClip(manifest, spec)).toBe("https://example.com/a.mp3");
    expect(resolveClip(manifest, { ...spec, text: "Hello, there." })).toBeNull();
    expect(resolveClip(EMPTY_MANIFEST, spec)).toBeNull();
  });

  it("plans missing, changed and unused clips", () => {
    const manifest = {
      generator: "test",
      clips: {
        [spec.key]: { url: "https://example.com/a.mp3", hash: "0000000000000000" },
        "old/key": { url: "https://example.com/b.mp3", hash: "1111111111111111" },
      },
    };
    const plan = planGeneration([spec, { ...spec, key: "listening/x/1" }], manifest);
    expect(plan.stale.map((s) => s.key)).toEqual([spec.key]);
    expect(plan.missing.map((s) => s.key)).toEqual(["listening/x/1"]);
    expect(plan.unused).toEqual(["old/key"]);
    expect(plan.characters).toBe(24);
  });

  it("gives every clip in the content a unique key", () => {
    const content = validateContent();
    const specs = allClipSpecs(content.labs, content.placement);
    expect(duplicateKeys(specs)).toEqual([]);
    expect(specs.some((s) => s.key.startsWith("placement/"))).toBe(true);
    expect(specs.every((s) => s.text.trim().length > 0)).toBe(true);
  });
});

describe("skill-lab content", () => {
  const content = validateContent();

  it("has listening and reading at A1 and A2, and listening placement items", () => {
    expect(content.labs.listeningItems.filter((i) => i.level === "A1").length).toBeGreaterThanOrEqual(5);
    expect(content.labs.readingTexts.filter((t) => t.level === "A1").length).toBeGreaterThanOrEqual(5);
    expect(content.labs.writingTasks.length).toBeGreaterThanOrEqual(6);
    expect(content.placement.filter((p) => p.section === "listening").length).toBeGreaterThanOrEqual(4);
  });

  it("rejects a listening item whose phrase isn't in its line", () => {
    const item = content.labs.listeningItems[0];
    const bad = { ...item, phrases: [...item.phrases.slice(1), { line: 0, text: "not in the line", meaning: "x" }] };
    expect(listeningItemSchema.safeParse(bad).success).toBe(false);
    expect(listeningItemSchema.safeParse({ ...item, dictation: [99] }).success).toBe(false);
  });

  it("rejects a reading text whose glossary word isn't in the text, or without an inference question", () => {
    const text = content.labs.readingTexts[0];
    expect(
      readingTextSchema.safeParse({
        ...text,
        glossary: [...text.glossary, { word: "zebra", definition: "An animal." }],
      }).success,
    ).toBe(false);
    expect(
      readingTextSchema.safeParse({ ...text, questions: text.questions.filter((q) => q.focus !== "inference") })
        .success,
    ).toBe(false);
  });

  it("finds whole words only, and the sentence a word was found in", () => {
    expect(containsPhrase("I have a card.", "car")).toBe(false);
    expect(containsPhrase("Is there a café near here?", "café")).toBe(true);
    expect(sentenceContaining(["Hi. I live in Lisbon with my cousin, Inês. She cooks."], "cousin")).toBe(
      "I live in Lisbon with my cousin, Inês.",
    );
    expect(wordCount("  one two  three ")).toBe(3);
  });

  it("gives every minimal-pair sentence a word with each sound (for the text alternative)", () => {
    for (const set of content.labs.pronunciation.minimalPairs) {
      for (const s of set.sentences) {
        const [a, b] = pairWordsIn(s, set.pairs);
        expect(a.length, s).toBeGreaterThan(0);
        expect(b.length, s).toBeGreaterThan(0);
      }
    }
  });
});

describe("sentence studio checks", () => {
  it("accepts an expansion that keeps every word and adds one, in any order", () => {
    expect(checkExpansion("I drink coffee.", "Every morning I drink coffee.")).toMatchObject({
      ok: true,
      addedWords: 2,
      missing: [],
    });
  });

  it("explains what's missing or that nothing was added", () => {
    expect(checkExpansion("I drink coffee.", "I drink tea every day.")).toMatchObject({
      ok: false,
      missing: ["coffee."],
    });
    expect(checkExpansion("I drink coffee.", "I drink coffee")).toMatchObject({ ok: false, addedWords: 0 });
    expect(checkExpansion("She works.", "She works at night").endsWithPunctuation).toBe(false);
  });

  it("checks that a sentence uses the pattern", () => {
    expect(usesPattern("There's a bakery near me.", ["there is", "there's"])).toBe(true);
    expect(usesPattern("Their house is big.", ["there is", "there's"])).toBe(false);
  });
});

describe("writing feedback clean-up", () => {
  const text = "Yesterday I has a very very good day with my freind.";
  const response = (over: Partial<WritingFeedbackResponse> = {}): WritingFeedbackResponse => ({
    correctness: [
      { original: "I has", corrected: "I had", explanation: "Past simple of have.", category: "grammar" },
      { original: "freind", corrected: "friend", explanation: "Spelling.", category: "spelling" },
      { original: "we goes", corrected: "we go", explanation: "Invented.", category: "grammar" },
    ],
    naturalness: [{ original: "very very good", suggestion: "really good", explanation: "More natural." }],
    style: [{ original: "Yesterday", suggestion: "Last Sunday", explanation: "More specific." }],
    correctedText: "Yesterday I had a very very good day with my friend.",
    meaningCheck: "Your meaning is clear.",
    summary: "Two errors.",
    nextStep: "Check past forms.",
    ...over,
  });

  it("drops feedback that points at words the learner didn't write", () => {
    const f = sanitizeFeedback(text, response(), { style: false });
    expect(f.correctness.map((c) => c.original)).toEqual(["I has", "freind"]);
    expect(f.correctness[0]).toMatchObject({ suggestion: "I had", category: "grammar" });
    expect(f.dropped).toBe(1);
  });

  it("keeps style only when asked", () => {
    expect(sanitizeFeedback(text, response(), { style: false }).style).toBeNull();
    expect(sanitizeFeedback(text, response(), { style: true }).style).toHaveLength(1);
  });

  it("refuses a corrected version that doesn't look like the learner's text", () => {
    expect(sanitizeFeedback(text, response(), { style: false }).correctedText).toMatch(/I had/);
    expect(
      sanitizeFeedback(text, response({ correctedText: "Completely different." }), { style: false }).correctedText,
    ).toBeNull();
    // Nothing to correct → no "corrected version".
    expect(sanitizeFeedback(text, response({ correctness: [] }), { style: false }).correctedText).toBeNull();
  });

  it("ignores items that change nothing, and duplicates", () => {
    const f = sanitizeFeedback(
      text,
      response({
        naturalness: [
          { original: "good day", suggestion: "good day", explanation: "Same." },
          { original: "very very good", suggestion: "really good", explanation: "A." },
          { original: "Very very good", suggestion: "great", explanation: "B." },
        ],
      }),
      { style: false },
    );
    expect(f.naturalness).toHaveLength(1);
  });
});

describe("placement with listening", () => {
  const answers = (section: PlacementAnswer["section"], levels: [string, boolean][]): PlacementAnswer[] =>
    levels.map(([level, correct]) => ({ section, level: level as PlacementAnswer["level"], correct }));

  it("reports listening separately without changing the overall level", () => {
    const base = [
      ...answers("grammar", [
        ["A1", true],
        ["A1", true],
        ["A2", true],
        ["A2", true],
      ]),
      ...answers("vocabulary", [
        ["A1", true],
        ["A1", true],
        ["A2", true],
        ["A2", true],
      ]),
    ];
    const without = estimatePlacement(base);
    const withListening = estimatePlacement([
      ...base,
      ...answers("listening", [
        ["A1", false],
        ["A1", false],
        ["A2", false],
        ["A2", false],
      ]),
    ]);
    expect(withListening.overall).toBe(without.overall);
    expect(withListening.listening).toMatchObject({ section: "listening", level: null, enoughEvidence: true });
    expect(without.listening).toBeNull();
    expect(withListening.sections.map((s) => s.section)).toEqual(["grammar", "vocabulary", "reading"]);
  });
});

import "server-only";
import type { z } from "zod";
import { AiError } from "@/lib/ai/errors";
import { memorySuggestionSchema } from "../memory-schema";
import type { AiProvider, ChatChunk, ChatRequest, StructuredRequest, StructuredResult } from "../types";
import { writingFeedbackResponseSchema, type WritingFeedbackResponse } from "../writing-feedback";

/**
 * Deterministic stand-in used only by the browser tests (AI_PROVIDER=mock with
 * ALLOW_MOCK_AI=1, never on Vercel). It knows a few fixed errors and nothing else;
 * every reply says it comes from a test provider.
 */
const KNOWN_ERRORS = [
  { wrong: "I has", right: "I have", why: "With I, use have, not has.", category: "grammar" as const },
  {
    wrong: "She go",
    right: "She goes",
    why: "After she, add -es to go in the present simple.",
    category: "grammar" as const,
  },
  { wrong: "a apple", right: "an apple", why: "Use an before a vowel sound.", category: "grammar" as const },
  { wrong: "freind", right: "friend", why: "The spelling is f-r-i-e-n-d.", category: "spelling" as const },
];

function lastLearnerText(prompt: string): string {
  return prompt.match(/<learner_text>\n([\s\S]*?)\n<\/learner_text>/)?.[1] ?? "";
}

function mockFeedback(prompt: string): WritingFeedbackResponse {
  const text = lastLearnerText(prompt);
  const found = KNOWN_ERRORS.filter((e) => text.includes(e.wrong));
  let corrected = text;
  for (const e of found) corrected = corrected.replaceAll(e.wrong, e.right);
  return {
    correctness: found.map((e) => ({
      original: e.wrong,
      corrected: e.right,
      explanation: e.why,
      category: e.category,
    })),
    naturalness: text.includes("very very")
      ? [{ original: "very very", suggestion: "really", explanation: "Repeating very sounds informal." }]
      : [],
    style: /Style suggestions requested: yes/.test(prompt)
      ? [
          {
            original: text.split(/\s+/).slice(0, 2).join(" "),
            suggestion: "Try a different opening",
            explanation: "Test style note.",
          },
        ]
      : [],
    correctedText: corrected,
    meaningCheck: "Your meaning is clear. (Test provider)",
    summary: found.length
      ? `Test provider: found ${found.length} error${found.length === 1 ? "" : "s"} to fix.`
      : "Test provider: no errors found.",
    nextStep: found.length ? "Fix the marked errors, then submit your rewrite." : "Try adding one more detail.",
  };
}

export class MockProvider implements AiProvider {
  readonly name = "mock";

  isConfigured(): boolean {
    return true;
  }

  async *chat(req: ChatRequest): AsyncIterable<ChatChunk> {
    const role = req.dynamicSystem.match(/You are playing (.+?)\./)?.[1];
    const reply = role
      ? `(Test provider, playing ${role}) Thanks — please go on.`
      : "(Test provider) This is a practice reply.";
    for (const word of reply.split(" ")) yield { type: "text", text: `${word} ` };
    yield { type: "usage", inputTokens: 10, outputTokens: 10 };
  }

  async generateStructured<T>(req: StructuredRequest, schema: z.ZodType<T>): Promise<StructuredResult<T>> {
    const usage = { inputTokens: 10, outputTokens: 10 };
    if (schema === (writingFeedbackResponseSchema as unknown)) {
      return { data: schema.parse(mockFeedback(req.prompt)), usage };
    }
    if (schema === (memorySuggestionSchema as unknown)) return { data: schema.parse({ memories: [] }), usage };
    throw new AiError("invalid_output", "the test provider can't generate this");
  }
}

import "server-only";
import { AiError } from "@/lib/ai/errors";
import { prisma } from "@/server/db/client";
import { addSuggestedMemories } from "@/server/db/memory";
import { memorySuggestionSchema } from "./memory-schema";
import { getAiProvider } from "./provider";
import { recordAiUsage, reserveAiRequest } from "./usage";

const SYSTEM = `You help an English-learning app keep short notes about a learner, which the learner reviews before they are used.
From the conversation, propose at most three notes that would help future tutoring:
- "preference": how the learner likes to learn (e.g. "Prefers examples about work").
- "recurring_error": a language error the learner made more than once, with the correct form (e.g. "Says 'I am agree' instead of 'I agree'").
- "goal": a learning goal the learner stated.
Only include what the learner clearly said or did in this conversation. Never guess personal details, level, nationality or anything sensitive. Write each note in simple English, under 25 words. Return an empty list if nothing qualifies.`;

/**
 * Ask the model for memory suggestions from one conversation. They are stored as
 * unverified, so the tutor ignores them until the learner confirms them.
 */
export async function suggestMemories(userId: string, conversationId: string): Promise<number> {
  const provider = getAiProvider();
  if (!provider.isConfigured()) throw new AiError("not_configured");
  const conversation = await prisma.tutorConversation.findFirst({
    where: { id: conversationId, userId },
    select: { messages: { orderBy: { createdAt: "desc" }, take: 12, select: { role: true, content: true } } },
  });
  if (!conversation) throw new AiError("bad_request", "conversation not found");
  const learnerTurns = conversation.messages.filter((m) => m.role === "user");
  if (learnerTurns.length === 0) return 0;

  await reserveAiRequest(userId);
  const transcript = conversation.messages
    .reverse()
    .map((m) => `${m.role === "user" ? "Learner" : "Tutor"}: ${m.content.slice(0, 1500)}`)
    .join("\n\n");
  const { data, usage } = await provider.generateStructured(
    { system: SYSTEM, prompt: `<conversation>\n${transcript}\n</conversation>`, maxTokens: 600 },
    memorySuggestionSchema,
  );
  await recordAiUsage(userId, usage);
  return addSuggestedMemories(userId, data.memories);
}

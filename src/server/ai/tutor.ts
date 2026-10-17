import "server-only";
import { AiError, type AiErrorKind } from "@/lib/ai/errors";
import type { TutorModeName } from "@/lib/ai/modes";
import { prisma } from "@/server/db/client";
import { createConversation, loadContextRecords } from "@/server/db/tutor";
import { selectContext } from "./context";
import { historyForModel, TUTOR_SYSTEM_PROMPT, tutorDynamicPrompt } from "./prompts";
import { getAiProvider } from "./provider";
import { recordAiUsage, reserveAiRequest } from "./usage";

export const MAX_TUTOR_MESSAGE = 4000;
const MAX_REPLY_TOKENS = { concise: 700, detailed: 1500 } as const;

export interface TutorTurnInput {
  conversationId: string | null;
  mode: TutorModeName;
  message: string;
  style: "concise" | "detailed";
  lessonSlug: string | null;
}

export type TutorEvent =
  | { type: "conversation"; id: string; title: string }
  | { type: "text"; text: string }
  | { type: "done"; messageId: string }
  | { type: "error"; kind: AiErrorKind; message: string };

/**
 * Check everything that can fail before streaming (configuration, ownership, limits),
 * save the learner's message, and return the reply as a stream of events.
 * Throws AiError for problems found before streaming starts.
 */
export async function startTutorTurn(
  userId: string,
  input: TutorTurnInput,
  signal?: AbortSignal,
): Promise<AsyncGenerator<TutorEvent>> {
  const provider = getAiProvider();
  if (!provider.isConfigured()) throw new AiError("not_configured");
  const message = input.message.trim();
  if (!message || message.length > MAX_TUTOR_MESSAGE) throw new AiError("bad_request");

  const existing = input.conversationId
    ? await prisma.tutorConversation.findFirst({
        where: { id: input.conversationId, userId },
        select: { id: true, mode: true, title: true, lessonSlug: true },
      })
    : null;
  if (input.conversationId && !existing) throw new AiError("bad_request", "conversation not found");

  await reserveAiRequest(userId);

  const conversation =
    existing ??
    (await createConversation(userId, { mode: input.mode, firstMessage: message, lessonSlug: input.lessonSlug }));
  const [prefs, previous] = await Promise.all([
    prisma.learningPreferences.findUnique({ where: { userId }, select: { tutorHintMode: true } }),
    prisma.tutorMessage.findMany({
      where: { conversationId: conversation.id },
      orderBy: { createdAt: "desc" },
      take: 30,
      select: { role: true, content: true },
    }),
  ]);
  await prisma.tutorMessage.create({
    data: { conversationId: conversation.id, role: "user", content: message, style: input.style },
  });
  const context = selectContext(await loadContextRecords(userId, conversation.lessonSlug));
  const turns = historyForModel([...previous.reverse(), { role: "user", content: message }]);

  return (async function* (): AsyncGenerator<TutorEvent> {
    yield { type: "conversation", id: conversation.id, title: conversation.title };
    let reply = "";
    let usage = { inputTokens: 0, outputTokens: 0 };
    try {
      for await (const chunk of provider.chat({
        stableSystem: TUTOR_SYSTEM_PROMPT,
        dynamicSystem: tutorDynamicPrompt({
          mode: conversation.mode,
          style: input.style,
          hintMode: prefs?.tutorHintMode ?? "hint_first",
          context,
        }),
        messages: turns,
        maxTokens: MAX_REPLY_TOKENS[input.style],
        signal,
      })) {
        if (chunk.type === "text") {
          reply += chunk.text;
          yield { type: "text", text: chunk.text };
        } else {
          usage = { inputTokens: chunk.inputTokens, outputTokens: chunk.outputTokens };
        }
      }
      if (!reply.trim()) throw new AiError("invalid_output", "empty reply");
    } catch (err) {
      const e = err instanceof AiError ? err : new AiError("unavailable");
      if (!(err instanceof AiError)) console.error("[tutor] stream failed:", err instanceof Error ? err.message : err);
      // A partial or failed reply is never saved as if it were complete.
      yield { type: "error", kind: e.kind, message: e.userMessage };
      return;
    }
    const saved = await prisma.tutorMessage.create({
      data: {
        conversationId: conversation.id,
        role: "assistant",
        content: reply,
        inputTokens: usage.inputTokens,
        outputTokens: usage.outputTokens,
      },
      select: { id: true },
    });
    await Promise.all([
      recordAiUsage(userId, usage),
      prisma.tutorConversation.update({ where: { id: conversation.id }, data: { updatedAt: new Date() } }),
    ]);
    yield { type: "done", messageId: saved.id };
  })();
}

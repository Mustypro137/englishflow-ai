import { z } from "zod";
import { AI_ERROR_MESSAGES, AiError, type AiErrorKind } from "@/lib/ai/errors";
import { TUTOR_MODES } from "@/lib/ai/modes";
import { MAX_TUTOR_MESSAGE, startTutorTurn } from "@/server/ai/tutor";
import { getSessionUser } from "@/server/auth/session";

export const maxDuration = 60;

const body = z.object({
  conversationId: z.string().min(1).max(64).nullable(),
  mode: z.enum(TUTOR_MODES),
  message: z.string().trim().min(1).max(MAX_TUTOR_MESSAGE),
  style: z.enum(["concise", "detailed"]),
  lessonSlug: z
    .string()
    .regex(/^[a-z0-9-]{1,100}$/)
    .nullable(),
});

const STATUS: Record<AiErrorKind, number> = {
  not_configured: 503,
  rate_limited: 429,
  budget_exceeded: 429,
  timeout: 504,
  unavailable: 503,
  invalid_output: 502,
  refused: 422,
  bad_request: 400,
};

/** No Origin header (same-origin fetches may omit it) or the same host. "null" or anything else is refused. */
function sameOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return true;
  try {
    return new URL(origin).host === new URL(request.url).host;
  } catch {
    return false;
  }
}

function errorResponse(kind: AiErrorKind) {
  return Response.json({ error: { kind, message: AI_ERROR_MESSAGES[kind] } }, { status: STATUS[kind] });
}

/**
 * Tutor reply as a stream of newline-delimited JSON events (see TutorEvent).
 * Errors found before streaming are returned as JSON with an HTTP status.
 */
export async function POST(request: Request) {
  // Same-origin JSON only: blocks cross-site form posts.
  if (!sameOrigin(request)) return errorResponse("bad_request");
  if (!request.headers.get("content-type")?.includes("application/json")) return errorResponse("bad_request");

  const user = await getSessionUser();
  if (!user)
    return Response.json({ error: { kind: "unauthorized", message: "Please sign in again." } }, { status: 401 });

  const parsed = body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return errorResponse("bad_request");

  let events: AsyncGenerator<unknown>;
  try {
    events = await startTutorTurn(user.id, parsed.data, request.signal);
  } catch (err) {
    if (err instanceof AiError) return errorResponse(err.kind);
    console.error("[tutor] failed to start:", err instanceof Error ? err.message : err);
    return errorResponse("unavailable");
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async pull(controller) {
      const { value, done } = await events.next();
      if (done) controller.close();
      else controller.enqueue(encoder.encode(`${JSON.stringify(value)}\n`));
    },
    async cancel() {
      await events.return(undefined);
    },
  });
  return new Response(stream, {
    headers: { "content-type": "application/x-ndjson; charset=utf-8", "cache-control": "no-store" },
  });
}

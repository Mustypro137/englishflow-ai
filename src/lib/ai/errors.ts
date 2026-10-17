/**
 * AI failures the learner can see. Shared by the server (which decides the kind)
 * and the browser (which shows the message). Never contains provider details.
 */
export const AI_ERROR_KINDS = [
  "not_configured",
  "rate_limited",
  "budget_exceeded",
  "timeout",
  "unavailable",
  "invalid_output",
  "refused",
  "bad_request",
] as const;
export type AiErrorKind = (typeof AI_ERROR_KINDS)[number];

const STILL_WORKS = "Your lessons, reviews and practice still work.";

export const AI_ERROR_MESSAGES: Record<AiErrorKind, string> = {
  not_configured: `The AI tutor isn't set up on this site yet. ${STILL_WORKS}`,
  rate_limited: "You're sending messages quickly. Wait a minute, then try again.",
  budget_exceeded: `You've used today's AI allowance. It resets at midnight UTC. ${STILL_WORKS}`,
  timeout: `The tutor took too long to answer. Please try again. ${STILL_WORKS}`,
  unavailable: `The tutor is unavailable right now. ${STILL_WORKS}`,
  invalid_output: "The AI produced something that didn't pass our checks, so it wasn't used. Please try again.",
  refused: "The tutor couldn't help with that request. Try asking about English in a different way.",
  bad_request: "That message couldn't be sent. Check it and try again.",
};

export class AiError extends Error {
  constructor(
    readonly kind: AiErrorKind,
    detail?: string,
  ) {
    super(detail ?? kind);
    this.name = "AiError";
  }

  get userMessage(): string {
    return AI_ERROR_MESSAGES[this.kind];
  }
}

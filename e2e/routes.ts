export const PUBLIC_ROUTES = [
  "/",
  "/features",
  "/how-it-works",
  "/curriculum",
  "/pricing",
  "/privacy",
  "/terms",
  "/sign-in",
  "/sign-up",
  "/forgot-password",
  "/reset-password",
] as const;

/** Pages that need a signed-in learner. */
export const APP_ROUTES = [
  "/app",
  "/app/settings",
  "/app/learn",
  "/app/learn/a1-subject-pronouns-and-be",
  "/app/placement",
] as const;

/**
 * Scrubbing for error reports (Sentry). Runs on every event and breadcrumb, in the browser
 * and on the server, before anything leaves the process.
 *
 * Learners type personal text (answers, writing, tutor messages), so an error report
 * keeps only what is needed to find a bug: the error type, a redacted message, the
 * stack trace, the route and the release. Dropped entirely: request bodies, cookies,
 * headers, query strings, user details, form values and console output.
 */

const EMAIL = /[\w.+-]+@[\w-]+(\.[\w-]+)+/g;
/** Long runs of token-like characters: session tokens, reset codes, API keys. */
const TOKEN = /\b[\w-]{24,}\b/g;
/** Text between quotes is often the learner's own words (e.g. "Expected 'am', got 'is'"). */
const QUOTED = /(["'“‘«])([^"'”’»\n]{2,})(["'”’»])/g;
const MAX_MESSAGE = 300;

export function redactText(text: string): string {
  const redacted = text
    .replace(EMAIL, "[email]")
    .replace(TOKEN, "[token]")
    .replace(QUOTED, (_m, open: string, _inner: string, close: string) => `${open}[text]${close}`);
  return redacted.length > MAX_MESSAGE ? `${redacted.slice(0, MAX_MESSAGE)}…` : redacted;
}

/** Keep only the path: query strings can carry reset tokens and search text. */
export function stripQuery(url: string): string {
  const cut = url.search(/[?#]/);
  return cut === -1 ? url : url.slice(0, cut);
}

/** The parts of a Sentry event this module touches (structurally compatible with Sentry's types). */
export interface ScrubbableEvent {
  message?: string;
  request?: { url?: string; method?: string };
  user?: unknown;
  extra?: unknown;
  breadcrumbs?: ScrubbableBreadcrumb[];
  exception?: { values?: { type?: string; value?: string }[] };
  contexts?: object;
  transaction?: string;
}

export interface ScrubbableBreadcrumb {
  category?: string;
  message?: string;
  data?: Record<string, unknown>;
}

/** Breadcrumb categories worth keeping: where the learner was, and which requests failed. */
const KEPT_CATEGORIES = new Set(["navigation", "fetch", "xhr"]);

export function scrubBreadcrumb<T extends ScrubbableBreadcrumb>(crumb: T): T | null {
  if (!crumb.category || !KEPT_CATEGORIES.has(crumb.category)) return null;
  const data: Record<string, unknown> = {};
  const d = crumb.data ?? {};
  if (crumb.category === "navigation") {
    if (typeof d.from === "string") data.from = stripQuery(d.from);
    if (typeof d.to === "string") data.to = stripQuery(d.to);
  } else {
    if (typeof d.url === "string") data.url = stripQuery(d.url);
    if (typeof d.method === "string") data.method = d.method;
    if (typeof d.status_code === "number") data.status_code = d.status_code;
  }
  // The message is dropped: for some integrations it repeats the URL or carries page text.
  const rest = { ...crumb };
  delete rest.message;
  return { ...rest, data };
}

export function scrubEvent<T extends ScrubbableEvent>(event: T): T {
  const out = { ...event } as ScrubbableEvent;
  delete out.user;
  delete out.extra;
  if (out.message) out.message = redactText(out.message);
  if (out.transaction) out.transaction = stripQuery(out.transaction);
  if (out.request) {
    // Method and path only: no body, cookies, headers or query string.
    out.request = {
      ...(out.request.method ? { method: out.request.method } : {}),
      ...(out.request.url ? { url: stripQuery(out.request.url) } : {}),
    };
  }
  if (out.exception?.values) {
    out.exception = {
      ...out.exception,
      values: out.exception.values.map((v) => (v.value ? { ...v, value: redactText(v.value) } : v)),
    };
  }
  if (out.breadcrumbs) {
    out.breadcrumbs = out.breadcrumbs.map((b) => scrubBreadcrumb(b)).filter((b) => b !== null);
  }
  if (out.contexts) {
    // Keep runtime facts (browser, OS, device); drop anything else an integration attached.
    const keep = ["browser", "os", "device", "runtime", "app", "trace", "culture"] as const;
    out.contexts = Object.fromEntries(
      Object.entries(out.contexts).filter(([k]) => (keep as readonly string[]).includes(k)),
    );
  }
  return out as T;
}

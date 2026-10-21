import { describe, expect, it } from "vitest";
import { redactText, scrubBreadcrumb, scrubEvent, stripQuery } from "@/lib/monitoring/scrub";
import { sentryOptions, sentryOrigin } from "@/lib/monitoring/sentry";

describe("redactText", () => {
  it("removes email addresses, tokens and quoted learner text", () => {
    expect(redactText("No account for ana.silva+test@example.co.uk")).toBe("No account for [email]");
    expect(redactText("bad token Xk29fj3Kd92jfKd93jfK2kd93Jf")).toBe("bad token [token]");
    expect(redactText(`Expected "I am a student", got 'I is student'`)).toBe(`Expected "[text]", got '[text]'`);
    expect(redactText("Cannot read properties of undefined (reading 'id')")).toBe(
      "Cannot read properties of undefined (reading '[text]')",
    );
  });

  it("keeps ordinary error text and truncates very long messages", () => {
    expect(redactText("Connection terminated unexpectedly")).toBe("Connection terminated unexpectedly");
    const long = redactText("x ".repeat(400));
    expect(long.length).toBeLessThanOrEqual(301);
    expect(long.endsWith("…")).toBe(true);
  });
});

describe("stripQuery", () => {
  it("keeps the path only", () => {
    expect(stripQuery("https://site.test/reset-password?token=abc#x")).toBe("https://site.test/reset-password");
    expect(stripQuery("/app/review")).toBe("/app/review");
  });
});

describe("scrubEvent", () => {
  const event = {
    event_id: "1",
    message: "Failed for mia@example.com",
    user: { id: "u1", email: "mia@example.com", ip_address: "1.2.3.4" },
    extra: { draft: "My private diary" },
    transaction: "/reset-password?token=secret",
    request: {
      method: "POST",
      url: "https://site.test/app/writing?draft=1",
      data: '{"text":"My private diary"}',
      cookies: { "better-auth.session_token": "abc" },
      headers: { cookie: "x", "user-agent": "UA" },
      query_string: "draft=1",
    },
    exception: { values: [{ type: "Error", value: `Invalid answer "I has a cat"` }] },
    breadcrumbs: [
      { category: "console", message: "learner typed: I has a cat" },
      { category: "ui.click", message: "button.check" },
      { category: "navigation", data: { from: "/app?x=1", to: "/reset-password?token=abc" } },
      { category: "fetch", data: { url: "/api/tutor?x=1", method: "POST", status_code: 500, body: "secret" } },
    ],
    contexts: { browser: { name: "Chrome" }, state: { form: "secret" } },
    tags: { route: "/app/writing" },
  };

  it("drops user details, extras, bodies, cookies, headers and query strings", () => {
    const out = scrubEvent(event);
    expect(out.user).toBeUndefined();
    expect(out.extra).toBeUndefined();
    expect(out.request).toEqual({ method: "POST", url: "https://site.test/app/writing" });
    expect(out.transaction).toBe("/reset-password");
    expect(out.contexts).toEqual({ browser: { name: "Chrome" } });
    expect(out.tags).toEqual({ route: "/app/writing" });
  });

  it("redacts messages and exception values but keeps the error type", () => {
    const out = scrubEvent(event);
    expect(out.message).toBe("Failed for [email]");
    expect(out.exception?.values?.[0]).toEqual({ type: "Error", value: `Invalid answer "[text]"` });
  });

  it("keeps only navigation and request breadcrumbs, without their details", () => {
    expect(scrubEvent(event).breadcrumbs).toEqual([
      { category: "navigation", data: { from: "/app", to: "/reset-password" } },
      { category: "fetch", data: { url: "/api/tutor", method: "POST", status_code: 500 } },
    ]);
  });

  it("never leaves learner text or secrets anywhere in the event", () => {
    const json = JSON.stringify(scrubEvent(event));
    for (const secret of ["private diary", "I has a cat", "mia@example.com", "token=", "1.2.3.4", "session_token"]) {
      expect(json).not.toContain(secret);
    }
  });

  it("does not change the original event", () => {
    scrubEvent(event);
    expect(event.user.email).toBe("mia@example.com");
  });
});

describe("scrubBreadcrumb", () => {
  it("drops breadcrumbs that can contain learner text", () => {
    expect(scrubBreadcrumb({ category: "console", message: "x" })).toBeNull();
    expect(scrubBreadcrumb({ category: "ui.input" })).toBeNull();
    expect(scrubBreadcrumb({ message: "no category" })).toBeNull();
  });
});

describe("Sentry options", () => {
  it("are off without a DSN and always scrub, with no PII, tracing or replay", () => {
    const options = sentryOptions();
    expect(options.dsn).toBeUndefined();
    expect(options).toMatchObject({ sendDefaultPii: false, tracesSampleRate: 0 });
    expect(options.beforeSend).toBe(scrubEvent);
    expect(options.beforeBreadcrumb).toBe(scrubBreadcrumb);
    expect(options).not.toHaveProperty("replaysSessionSampleRate");
  });

  it("derive the ingest origin from a DSN", () => {
    expect(sentryOrigin("https://abc123@o42.ingest.de.sentry.io/7")).toBe("https://o42.ingest.de.sentry.io");
    expect(sentryOrigin("not a url")).toBeNull();
    expect(sentryOrigin(undefined)).toBeNull();
  });
});

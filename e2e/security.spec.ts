import { expect, test } from "@playwright/test";
import { collectCspViolations } from "./helpers";
import { PUBLIC_ROUTES } from "./routes";

test("pages are sent with security headers", async ({ request }) => {
  for (const path of ["/", "/sign-in", "/app"]) {
    const res = await request.get(path, { maxRedirects: 0 });
    const headers = res.headers();
    expect(headers["content-security-policy"], path).toContain("frame-ancestors 'none'");
    expect(headers["strict-transport-security"], path).toContain("max-age=");
    expect(headers["x-content-type-options"], path).toBe("nosniff");
    expect(headers["referrer-policy"], path).toBe("strict-origin-when-cross-origin");
    expect(headers["permissions-policy"], path).toContain("microphone=(self)");
  }
});

// Signed-in pages are checked for CSP violations in the sweep in a11y.spec.ts.
test("the Content-Security-Policy blocks nothing the public pages need", async ({ page }) => {
  const violations = await collectCspViolations(page);
  for (const route of PUBLIC_ROUTES) {
    await page.goto(route);
    await expect(page.locator("main h1").first()).toBeVisible();
  }
  expect(violations).toEqual([]);
});

import { expect, test } from "@playwright/test";
import { completeOnboarding, signUp } from "./helpers";

// The every-page sweep (empty states, errors, broken values, sideways scrolling) is in a11y.spec.ts.

test("pages that don't exist say so, with a way back", async ({ page }) => {
  await signUp(page);
  await completeOnboarding(page);
  for (const route of ["/app/learn/no-such-lesson", "/app/reading/no-such-text", "/app/no-such-page"]) {
    await page.goto(route);
    await expect(page.getByRole("heading", { name: /not found/i }), route).toBeVisible();
    await expect(page.getByRole("main").getByRole("link").first(), route).toBeVisible();
  }
});

import AxeBuilder from "@axe-core/playwright";
import { expect, type Page, test } from "@playwright/test";
import { withoutDeviceSpeech } from "./audio-fixture";
import { collectCspViolations, completeOnboarding, signUp } from "./helpers";
import { APP_ROUTES, PUBLIC_ROUTES } from "./routes";

async function seriousViolations(page: Page) {
  const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
  return results.violations
    .filter((v) => v.impact === "serious" || v.impact === "critical")
    .map((v) => `${v.id}: ${v.help} (${v.nodes.map((n) => n.target.join(" ")).join(", ")})`);
}

for (const route of PUBLIC_ROUTES) {
  test(`no serious accessibility violations on ${route}`, async ({ page }) => {
    await page.goto(route);
    expect(await seriousViolations(page)).toEqual([]);
  });
}

/*
 * One sweep of every signed-in page, for a brand-new learner (each page is visited once, to keep
 * the load on the test server down): no serious accessibility violations, nothing blocked by the
 * Content-Security-Policy, an explained empty state rather than an error or broken numbers, and
 * no sideways scrolling (on the phone project, at phone width).
 */
test("every signed-in page: accessible, allowed by the CSP, no errors or broken values, no sideways scroll", async ({
  page,
}) => {
  // Visits every signed-in page in one session; allow about 15 seconds per page.
  test.setTimeout(20_000 + APP_ROUTES.length * 15_000);
  const cspViolations = await collectCspViolations(page);
  await signUp(page);
  expect(await seriousViolations(page), "/app/onboarding").toEqual([]);
  await completeOnboarding(page);
  for (const route of APP_ROUTES) {
    await page.goto(route);
    const main = page.locator("main");
    await expect(main.locator("h1"), route).toBeVisible();
    expect(await seriousViolations(page), route).toEqual([]);
    await expect(page.getByText("Something went wrong"), route).toHaveCount(0);
    await expect(main, route).not.toContainText(/\bNaN\b|\bundefined\b|\[object Object\]|Infinity/);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow, `${route} scrolls sideways`).toBeLessThanOrEqual(0);
  }
  expect(cspViolations).toEqual([]);
});

test("no serious accessibility violations on lesson feedback and placement results", async ({ page }) => {
  await signUp(page);
  await completeOnboarding(page);
  await page.goto("/app/learn/a1-subject-pronouns-and-be");
  const first = page.locator("article").first();
  await first.getByRole("radio", { name: "am", exact: true }).check();
  await first.getByRole("button", { name: "Check" }).click();
  await first.getByRole("button", { name: "Show the answer" }).click();
  expect(await seriousViolations(page), "lesson feedback").toEqual([]);

  await withoutDeviceSpeech(page);
  await page.goto("/app/placement");
  await page.getByRole("button", { name: "Start the check" }).click();
  expect(await seriousViolations(page), "placement question").toEqual([]);
  for (let i = 0; i < 3; i++) await page.getByRole("button", { name: "Skip this part" }).click();
  await expect(page.getByText("Answer at least one section to get an estimate.")).toBeVisible();
});

test("no serious accessibility violations with the mobile menu open", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "mobile", "mobile menu only");
  await page.goto("/");
  await page.getByRole("button", { name: "Open menu" }).click();
  await expect(page.getByRole("dialog", { name: "Menu" })).toBeVisible();
  expect(await seriousViolations(page)).toEqual([]);
});

test("no serious accessibility violations after answering the sample exercise", async ({ page }) => {
  await page.goto("/");
  await page.getByLabel("Your answer").fill("go");
  await page.getByRole("button", { name: "Check" }).click();
  await expect(page.getByText("Not quite.")).toBeVisible();
  expect(await seriousViolations(page)).toEqual([]);
});

import AxeBuilder from "@axe-core/playwright";
import { expect, type Page, test } from "@playwright/test";
import { completeOnboarding, signUp } from "./helpers";
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

test("no serious accessibility violations in the signed-in app", async ({ page }) => {
  // Visits every signed-in page in one session; allow about 15 seconds per page.
  test.setTimeout(20_000 + APP_ROUTES.length * 15_000);
  await signUp(page);
  expect(await seriousViolations(page), "/app/onboarding").toEqual([]);
  await completeOnboarding(page);
  for (const route of APP_ROUTES) {
    await page.goto(route);
    await expect(page.locator("main h1")).toBeVisible();
    expect(await seriousViolations(page), route).toEqual([]);
  }
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

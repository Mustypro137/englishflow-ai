import { expect, test } from "@playwright/test";
import { completeOnboarding, signUp } from "./helpers";

test.beforeEach(async ({ page }) => {
  await signUp(page);
  await completeOnboarding(page);
});

test("a new learner sees an honest empty dashboard with a reasoned first step", async ({ page }) => {
  await expect(page.getByRole("heading", { name: "Let's get started" })).toBeVisible();
  await expect(page.getByRole("region", { name: "Today's plan" })).toContainText(/subject pronouns and be/);
  await expect(page.getByRole("region", { name: "Continue learning" })).toContainText(/subject pronouns and be/);
  await expect(page.getByRole("list", { name: /last 7 days/ })).toContainText("0 activities");
  await page.goto("/app/progress");
  await expect(page.getByRole("region", { name: "Achievements" })).toContainText("earned from real milestones");
});

test("answers show up on the dashboard, and gamification can be switched off", async ({ page }) => {
  await page.goto("/app/learn/a1-subject-pronouns-and-be");
  const first = page.locator("article").first();
  await first.getByRole("radio", { name: "am", exact: true }).check();
  await first.getByRole("button", { name: "Check" }).click();
  await expect(first.getByText(/Correct|Not quite/).first()).toBeVisible();

  await page.goto("/app");
  await expect(page.getByRole("heading", { name: "Let's get started" })).toHaveCount(0);
  await expect(page.getByRole("list", { name: /last 7 days/ })).toContainText("1 activity");
  await expect(page.getByRole("region", { name: "Continue learning" })).toContainText("1 of");
  await expect(page.getByText("Streak", { exact: true })).toBeVisible();
  await page.goto("/app/progress");
  await expect(page.getByRole("region", { name: "Achievements" })).toContainText("First steps");

  await page.goto("/app/settings");
  await page.getByRole("checkbox", { name: "Show streaks, points and badges" }).uncheck();
  await page.getByRole("button", { name: "Save preferences" }).click();
  await expect(page.getByText("Preferences saved.")).toBeVisible();
  await page.goto("/app");
  await expect(page.getByRole("region", { name: "This week" })).toBeVisible();
  await expect(page.getByText("Streak", { exact: true })).toHaveCount(0);
  await page.goto("/app/progress");
  await expect(page.getByRole("region", { name: "Achievements" })).toHaveCount(0);
});

test("plans a study session, ticks off steps and finishes it", async ({ page }) => {
  await page.getByRole("link", { name: "Plan a study session" }).click();
  await expect(page).toHaveURL(/\/app\/session$/);
  await page.getByRole("radio", { name: "10 min" }).check();
  await page.getByRole("button", { name: "Update plan" }).click();
  await expect(page.getByRole("heading", { name: "Your 10-minute plan" })).toBeVisible();
  await expect(page.getByText("No reviews are due")).toBeVisible();

  await page.getByLabel("Or another length (minutes)").fill("30");
  await page.getByRole("button", { name: "Update plan" }).click();
  await expect(page.getByRole("heading", { name: "Your 30-minute plan" })).toBeVisible();
  await page.getByRole("button", { name: /Start this 30-minute session/ }).click();

  await expect(page.getByRole("heading", { name: "Today's 30-minute session" })).toBeVisible();
  const steps = page.getByRole("button", { name: /^Mark done/ });
  const count = await steps.count();
  expect(count).toBeGreaterThan(1);
  for (let i = 0; i < count; i++) {
    await page
      .getByRole("button", { name: /^Mark done/ })
      .first()
      .click();
    await expect(page.getByText(`${i + 1} of ${count} steps done`)).toBeVisible();
  }
  await expect(page.getByText("Session complete — well done.")).toBeVisible();
  await page.goto("/app/calendar");
  await expect(page.getByRole("region", { name: /Study sessions in/ })).toContainText("· 30 min");
  await expect(page.getByRole("region", { name: /Study sessions in/ })).toContainText("Finished");
});

test("completes the writing challenge with five sentences of the learner's own", async ({ page }) => {
  await page.goto("/app/challenges");
  const box = page.getByLabel("Your sentences");
  await box.fill("I am Ada. Hi.");
  await expect(page.getByText("1 of 5 sentences")).toBeVisible();
  await page.getByRole("button", { name: "Save my sentences" }).click();
  await expect(page.getByText(/1 of 5 sentences count so far/)).toBeVisible();

  await box.fill("I am a nurse. My sister is a teacher. We live in Lagos. Our flat is small. I am happy here.");
  await page.getByRole("button", { name: "Save my sentences" }).click();
  await expect(page.getByText("Saved — 5 sentences. Challenge complete.")).toBeVisible();
  await page.reload();
  await expect(page.getByRole("listitem").filter({ hasText: "Five sentences of your own" })).toContainText("Completed");
});

test("grammar, calendar and mixed practice pages work for a new learner", async ({ page }) => {
  await page.goto("/app/grammar");
  await expect(page.getByRole("heading", { level: 1, name: "Grammar" })).toBeVisible();
  const a1 = page.getByRole("region", { name: "A1" });
  await expect(a1.getByRole("link", { name: /subject pronouns and be/ }).first()).toBeVisible();
  await expect(page.getByRole("region", { name: "B1" })).toContainText("Lesson planned");

  await page.goto("/app/calendar");
  await expect(page.getByRole("table")).toContainText("(today)");
  await expect(page.getByRole("region", { name: "Reviews coming up" })).toContainText("Nothing scheduled");

  await page.goto("/app/practice");
  await expect(page.getByRole("heading", { name: "Mixed practice opens after your first lesson" })).toBeVisible();
});

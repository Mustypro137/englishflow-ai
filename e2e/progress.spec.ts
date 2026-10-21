import { expect, test } from "@playwright/test";
import { completeOnboarding, signUp } from "./helpers";

test.beforeEach(async ({ page }) => {
  await signUp(page);
  await completeOnboarding(page);
});

test("a new learner sees an honest empty progress page", async ({ page }) => {
  await page.goto("/app/progress");
  await expect(page.getByRole("heading", { level: 1, name: "Progress" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Nothing to measure yet" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Start a lesson" })).toBeVisible();
  await expect(page.getByRole("region", { name: "How these are measured" })).toBeVisible();
});

test("one answer shows up as activity, without claiming an accuracy", async ({ page }) => {
  await page.goto("/app/learn/a1-subject-pronouns-and-be");
  const first = page.locator("article").first();
  await first.getByRole("radio", { name: "am", exact: true }).check();
  await first.getByRole("button", { name: "Check" }).click();
  await expect(first.getByText(/Correct|Not quite/).first()).toBeVisible();

  await page.goto("/app/progress");
  const activity = page.getByRole("region", { name: "Study activity" });
  await expect(activity.getByRole("list", { name: /Activity per week/ })).toContainText("1 answers");
  await expect(activity).toContainText("Days studied in total1");

  const skills = page.getByRole("region", { name: "By skill" });
  await expect(skills.getByRole("heading", { name: "Grammar" })).toBeVisible();
  // One answer is not enough evidence for a percentage.
  await expect(skills).toContainText("not enough answers yet");
  await expect(skills).not.toContainText("100%");

  await expect(page.getByRole("region", { name: "By topic" }).getByRole("listitem")).not.toHaveCount(0);
  await expect(page.getByRole("region", { name: "Memory in review" })).toContainText("No reviews yet");
});

test("the dashboard links to detailed progress, and the page is in the navigation", async ({ page }, testInfo) => {
  await page.goto("/app");
  await page.getByRole("link", { name: "See detailed progress" }).click();
  await expect(page).toHaveURL(/\/app\/progress$/);
  if (testInfo.project.name === "desktop") {
    await expect(
      page.getByRole("navigation", { name: "Learning" }).getByRole("link", { name: "Progress" }),
    ).toHaveAttribute("aria-current", "page");
  }
});

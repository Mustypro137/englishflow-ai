import { expect, type Page, test } from "@playwright/test";
import { completeOnboarding, signUp } from "./helpers";

const LESSON = "/app/learn/a1-subject-pronouns-and-be";

async function newLearner(page: Page) {
  await signUp(page);
  await completeOnboarding(page);
}

test("the curriculum lists real lessons and marks unwritten ones as coming soon", async ({ page }) => {
  await newLearner(page);
  await page.getByRole("navigation", { name: "Learning" }).getByRole("link", { name: "Curriculum" }).first().click();
  await expect(page.getByRole("heading", { level: 1, name: "Curriculum" })).toBeVisible();
  await expect(page.getByRole("link", { name: /subject pronouns and be/ })).toBeVisible();
  await expect(page.getByText("8 of 12 lessons ready")).toBeVisible();
  // Planned lessons are listed but not linked, and their URLs do not open.
  await expect(page.getByText("My, your, his, her: possessive adjectives")).toBeVisible();
  await expect(page.getByRole("link", { name: /possessive adjectives/ })).toHaveCount(0);
  // Streaming pages show the not-found UI (with noindex) after the response has started,
  // so the status code can be 200; what matters is that the lesson does not open.
  await page.goto("/app/learn/a1-possessive-adjectives");
  await expect(page.getByRole("heading", { level: 1, name: "Page not found" })).toBeVisible();
});

test("a lesson gives targeted feedback, and answers persist after a reload", async ({ page }) => {
  await newLearner(page);
  await page.goto(LESSON);
  await expect(page.getByText("0 of 11 exercises answered")).toBeVisible();

  const first = page.locator("article").first();
  await first.getByRole("radio", { name: "am", exact: true }).check();
  await first.getByRole("button", { name: "Check" }).click();
  await expect(first.getByText("Not quite")).toBeVisible();
  await expect(first.getByText("Am is only for I.")).toBeVisible();
  // The answer is only shown on request.
  await expect(first.getByText("Answer:")).toHaveCount(0);
  await expect(page.getByText("1 of 11 exercises answered")).toBeVisible();

  await first.getByRole("button", { name: "Try again" }).click();
  await first.getByRole("radio", { name: "is", exact: true }).check();
  await first.getByRole("button", { name: "Check" }).click();
  await expect(first.getByText("Correct", { exact: true })).toBeVisible();
  await expect(first.getByText("With he, she and it, the verb be is is")).toBeVisible();

  const gap = page.locator('article[data-exercise-type="gap_fill"]').first();
  await gap.getByLabel("Your answer").fill("are");
  await gap.getByRole("button", { name: "Check" }).click();
  await expect(gap.getByText("Correct", { exact: true })).toBeVisible();

  await page.reload();
  await expect(page.getByText("2 of 11 exercises answered")).toBeVisible();
  await expect(page.getByText("1 correct on the first try")).toBeVisible();
  await expect(page.locator("article").first().getByText("Answered correctly before")).toBeVisible();

  await page.goto("/app/learn");
  await expect(page.getByRole("link", { name: /subject pronouns and be — 2 of 11 answered/ })).toBeVisible();
});

test("a word-order exercise can be completed with the keyboard only", async ({ page }) => {
  await newLearner(page);
  await page.goto(LESSON);
  const order = page.locator('article[data-exercise-type="word_order"]').first();
  for (const word of ["they", "are", "my", "classmates"]) {
    await order.getByRole("button", { name: word, exact: true }).focus();
    await page.keyboard.press("Enter");
  }
  await expect(order.getByRole("button", { name: "Remove “classmates”" })).toBeVisible();
  await order.getByRole("button", { name: "Check" }).focus();
  await page.keyboard.press("Enter");
  await expect(order.getByText("Correct", { exact: true })).toBeVisible();
});

test("an incomplete answer is not sent", async ({ page }) => {
  await newLearner(page);
  await page.goto(LESSON);
  const first = page.locator("article").first();
  await first.getByRole("button", { name: "Check" }).click();
  await expect(first.getByText(/Answer every part first/)).toBeVisible();
  await expect(page.getByText("0 of 11 exercises answered")).toBeVisible();
});

test("placement: answer, see an honest estimate, choose a level, and the home page reflects it", async ({ page }) => {
  await newLearner(page);
  await page.goto("/app");
  await page.getByRole("link", { name: "Take the placement check" }).click();
  await expect(page.getByText("This gives an estimate, not a certificate")).toBeVisible();
  await page.getByRole("button", { name: "Start the check" }).click();

  // Answer grammar and vocabulary with "I don't know", skip reading.
  for (let i = 0; i < 24; i++) {
    await expect(page.getByRole("heading", { level: 1 })).toContainText(/Grammar|Vocabulary/);
    await page.getByRole("button", { name: "I don't know" }).click();
  }
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Reading");
  await page.getByRole("button", { name: "Skip this part" }).click();

  await expect(page.getByRole("heading", { level: 1, name: "Your estimated starting level" })).toBeVisible({
    timeout: 30_000,
  });
  await expect(page.getByText("Listening and speaking")).toBeVisible();
  await expect(page.getByText("Not assessed yet")).toBeVisible();
  const results = page.getByRole("main");
  await expect(results.getByText("Start at A1").first()).toBeVisible();
  await expect(results.getByText("Not assessed", { exact: true })).toBeVisible();
  await expect(page.getByRole("radio", { name: "A1 (suggested)" })).toBeChecked();

  await page.getByRole("radio", { name: "B1" }).check();
  await page.getByRole("button", { name: "Start at this level" }).click();
  await expect(page).toHaveURL(/\/app$/);
  await expect(page.getByText(/Working level: B1/)).toBeVisible();
  await expect(page.getByText("your own estimate", { exact: true })).toBeVisible();
  await expect(page.getByText("Lessons at your level (B1) are planned but not written yet.")).toBeVisible();
  await expect(page.getByRole("link", { name: "Take the placement check" })).toHaveCount(0);
});

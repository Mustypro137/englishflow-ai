import { expect, type Page, test } from "@playwright/test";
import { completeOnboarding, signUp } from "./helpers";

async function newLearner(page: Page) {
  await signUp(page);
  await completeOnboarding(page);
}

test("save a word, find it after reload, and review it — a wrong answer brings it back soon", async ({ page }) => {
  await newLearner(page);
  await page.goto("/app/vocabulary");
  await page.getByRole("button", { name: "Save “aunt” to my words" }).click();
  await expect(page.getByRole("button", { name: "Remove “aunt” from my words" })).toBeVisible();

  await page.reload();
  const myWords = page.getByRole("region", { name: /My words/ });
  await expect(myWords.getByText("aunt", { exact: true })).toBeVisible();
  await expect(myWords.getByText("Next review: now")).toBeVisible();

  await page.goto("/app/review");
  await expect(page.getByRole("definition").filter({ hasText: /^1$/ }).first()).toBeVisible();
  await expect(page.getByText("Which word is it?")).toBeVisible();
  await page.getByLabel("The missing word").fill("uncle");
  await page.getByRole("button", { name: "Check" }).click();
  await expect(page.getByText("Not quite")).toBeVisible();
  await expect(page.getByText(/The word is\s*aunt/)).toBeVisible();
  await expect(page.getByText("Next review: in 10 min")).toBeVisible();

  await page.getByRole("button", { name: "Next" }).click();
  await expect(page.getByRole("heading", { name: "Reviews done for now" })).toBeVisible();
});

test("create, review, edit and delete a flashcard — using the keyboard to rate", async ({ page }) => {
  await newLearner(page);
  await page.goto("/app/notebook");
  await page.getByLabel("Front (the question or prompt)").fill("the room where you cook");
  await page.getByLabel("Back (the answer)").fill("kitchen");
  await page.getByRole("button", { name: "Add card" }).click();
  await expect(page.getByText("Card added. It's ready to review now.")).toBeVisible();
  await expect(page.getByLabel("Front (the question or prompt)")).toHaveValue("");
  await expect(page.getByRole("button", { name: "Edit card “the room where you cook”" })).toBeVisible();

  await page.goto("/app/review");
  await expect(page.getByRole("heading", { name: "the room where you cook" })).toBeVisible();
  await expect(page.getByText("kitchen")).toHaveCount(0); // hidden until revealed
  await page.getByRole("button", { name: "Show the answer" }).click();
  await expect(page.getByText("kitchen")).toBeVisible();
  const good = page.getByRole("button", { name: /^Good/ });
  await good.focus();
  await page.keyboard.press("Enter");
  await expect(page.getByText("Next review: tomorrow")).toBeVisible();

  await page.goto("/app/notebook");
  await page.getByRole("button", { name: "Edit card “the room where you cook”" }).click();
  // The "new card" form is also on the page, so work inside the card being edited.
  const editing = page.getByRole("listitem").filter({ has: page.getByRole("button", { name: "Save changes" }) });
  await editing.getByLabel("Back (the answer)").fill("the kitchen");
  await editing.getByRole("button", { name: "Save changes" }).click();
  await expect(page.getByText("the kitchen", { exact: true })).toBeVisible();

  page.once("dialog", (d) => d.accept());
  await page.getByRole("button", { name: "Delete card “the room where you cook”" }).click();
  await expect(page.getByRole("button", { name: "Delete card “the room where you cook”" })).toHaveCount(0);
});

test("notes and bookmarks are saved to the notebook", async ({ page }) => {
  await newLearner(page);
  await page.goto("/app/learn/a1-a-and-an");
  await page.getByRole("button", { name: "Bookmark" }).click();
  await expect(page.getByRole("button", { name: "Bookmarked" })).toBeVisible();

  await page.goto("/app/notebook");
  await expect(page.getByRole("link", { name: /A book, an apple/ })).toBeVisible();
  await page.getByLabel("Note", { exact: true }).fill("Use an before a vowel sound: an hour, an apple.");
  await page.getByLabel("Related lesson (optional)").selectOption("a1-a-and-an");
  await page.getByRole("button", { name: "Save note" }).click();
  await expect(page.getByText("Note saved.")).toBeVisible();
  await page.reload();
  await expect(page.getByText("Use an before a vowel sound: an hour, an apple.")).toBeVisible();
  await expect(page.getByText("Lesson: A book, an apple: using a and an")).toBeVisible();

  page.once("dialog", (d) => d.accept());
  await page.getByRole("button", { name: "Delete note" }).click();
  await expect(page.getByText("Use an before a vowel sound: an hour, an apple.")).toHaveCount(0);
});

test("a wrong lesson answer appears in the mistake tracker with the correction", async ({ page }) => {
  await newLearner(page);
  await page.goto("/app/learn/a1-subject-pronouns-and-be");
  const first = page.locator("article").first();
  await first.getByRole("radio", { name: "am", exact: true }).check();
  await first.getByRole("button", { name: "Check" }).click();
  await expect(first.getByText("Not quite")).toBeVisible();

  await page.goto("/app/mistakes");
  await expect(page.getByRole("heading", { name: "To fix (1)" })).toBeVisible();
  const mistake = page.getByRole("listitem").filter({ hasText: "Choose the correct word." });
  await expect(mistake.getByRole("definition").filter({ hasText: /^am$/ })).toBeVisible();
  await expect(mistake.getByRole("definition").filter({ hasText: /^is$/ })).toBeVisible();
  await expect(mistake.getByText("Am is only for I.")).toBeVisible();
  await expect(mistake.getByRole("link", { name: "Practise this lesson" })).toBeVisible();

  // The exercise is now scheduled for a delayed review.
  await page.goto("/app/review");
  await expect(page.getByText(/You're up to date|Your next review is tomorrow/).first()).toBeVisible();
  await expect(page.getByText("Choose the correct word.").first()).toBeVisible();

  await page.goto("/app/mistakes");
  page.once("dialog", (d) => d.accept());
  await page.getByRole("button", { name: "Delete" }).click();
  await expect(page.getByRole("heading", { name: "No mistakes recorded yet" })).toBeVisible();
});

test("the Today page shows reviews that are due", async ({ page }) => {
  await newLearner(page);
  await page.goto("/app/vocabulary");
  await page.getByRole("button", { name: "Save “key” to my words" }).click();
  await expect(page.getByRole("button", { name: "Remove “key” from my words" })).toBeVisible();
  await page.goto("/app");
  const reviews = page.getByRole("region", { name: "Reviews" });
  await expect(reviews.getByText("1", { exact: true })).toBeVisible();
  await expect(reviews.getByText("due now")).toBeVisible();
  await expect(page.getByRole("region", { name: "Recommended for you" })).toContainText("Review 1 item");
  await reviews.getByRole("link", { name: "Start reviewing" }).click();
  await expect(page).toHaveURL(/\/app\/review$/);
});

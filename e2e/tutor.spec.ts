import { expect, test } from "@playwright/test";
import { completeOnboarding, signUp } from "./helpers";

// The browser-test server runs without an AI provider, exactly like a site whose owner
// hasn't added a key yet. These tests check that nothing pretends to work.

test.beforeEach(async ({ page }) => {
  await signUp(page);
  await completeOnboarding(page);
});

test("the tutor shows a clear setup message when no AI provider is configured", async ({ page }) => {
  await page.goto("/app/tutor");
  await expect(page.getByRole("heading", { name: "AI tutor", level: 1 })).toBeVisible();
  await expect(page.getByText("The AI tutor isn't set up on this site yet")).toBeVisible();
  await expect(page.getByText(/lessons, reviews, practice, mistakes and notebook all work without it/)).toBeVisible();
  await expect(page.getByRole("textbox", { name: "Your message" })).toHaveCount(0);
  await expect(page.getByText("No conversations yet.")).toBeVisible();

  // The API refuses honestly too.
  const res = await page.request.post("/api/tutor", {
    data: { conversationId: null, mode: "explain", message: "Hi", style: "concise", lessonSlug: null },
  });
  expect(res.status()).toBe(503);
  expect((await res.json()).error.kind).toBe("not_configured");

  // Lessons link to the tutor and still work without it.
  await page.goto("/app/learn/a1-subject-pronouns-and-be");
  await page.getByRole("link", { name: "Ask the AI tutor about this lesson" }).click();
  await expect(page).toHaveURL(/\/app\/tutor\?lesson=a1-subject-pronouns-and-be/);
  await expect(page.getByText("The AI tutor isn't set up on this site yet")).toBeVisible();
});

test("AI-generated practice says it isn't set up, without fake exercises", async ({ page }) => {
  await page.goto("/app/practice/more");
  await expect(page.getByText("AI-generated practice isn't set up on this site yet")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Start a lesson first" })).toBeVisible();
});

test("learners can add, edit and delete saved learning context", async ({ page }) => {
  await page.goto("/app/settings");
  await page.getByRole("link", { name: "Manage saved learning context" }).click();
  await expect(page.getByRole("heading", { name: "Saved learning context", level: 1 })).toBeVisible();
  await expect(page.getByText("Learning history sharing is off")).toBeVisible();

  const add = page.getByRole("region", { name: "Add a note" });
  await add.getByLabel("Kind of note").selectOption("preference");
  await add.getByLabel("Note", { exact: true }).fill("Prefers examples about cooking");
  await add.getByRole("button", { name: "Add note" }).click();
  const notes = page.getByRole("region", { name: "Your notes" });
  await expect(notes.getByText("Prefers examples about cooking")).toBeVisible();
  await expect(notes.getByText("Confirmed")).toBeVisible();

  await notes.getByRole("button", { name: "Edit" }).click();
  await notes.getByLabel("Note", { exact: true }).fill("Prefers examples about football");
  await notes.getByRole("button", { name: "Save changes" }).click();
  await expect(notes.getByText("Prefers examples about football")).toBeVisible();

  await page.reload();
  await expect(notes.getByText("Prefers examples about football")).toBeVisible();
  await notes.getByRole("button", { name: "Delete" }).click();
  await expect(notes.getByText("No notes yet.")).toBeVisible();
});

test("the tutor's access to learning history is off by default and can be turned on", async ({ page }) => {
  await page.goto("/app/settings");
  const sharing = page.getByRole("checkbox", { name: "Let the AI tutor use my learning history" });
  await expect(sharing).not.toBeChecked();
  await page.getByRole("radio", { name: /Guided/ }).check();
  await sharing.check();
  await page.getByRole("button", { name: "Save preferences" }).click();
  await expect(page.getByText("Preferences saved.")).toBeVisible();
  await page.reload();
  await expect(sharing).toBeChecked();
  await expect(page.getByRole("radio", { name: /Guided/ })).toBeChecked();
  await page.goto("/app/settings/memory");
  await expect(page.getByText("Learning history sharing is on")).toBeVisible();
});

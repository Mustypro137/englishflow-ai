import { expect, type Locator, type Page, test } from "@playwright/test";
import { completeOnboarding, newLearner, signUp } from "./helpers";

/*
 * Keyboard-only walkthrough of the core journey: sign up, onboarding, a lesson answer with
 * feedback, a notebook entry, settings and sign out. No clicks, no fill(): every control is
 * reached with Tab (or arrow keys inside a radio group) and used with the keyboard.
 */

/** Press Tab until `target` has focus, failing if it can't be reached. */
async function tabTo(page: Page, target: Locator, max = 60) {
  await expect(target).toBeVisible();
  for (let i = 0; i < max; i++) {
    if (await target.evaluate((el) => el === document.activeElement)) return;
    await page.keyboard.press("Tab");
  }
  await expect(target, "reachable with Tab").toBeFocused();
}

/** Reach a radio group with Tab, then move to `target` with the arrow keys (which also selects it). */
async function chooseRadio(page: Page, target: Locator) {
  const group = await target.getAttribute("name");
  for (let i = 0; i < 60; i++) {
    const focusedName = await page.evaluate(() => (document.activeElement as HTMLInputElement | null)?.name);
    if (focusedName === group) break;
    await page.keyboard.press("Tab");
  }
  for (let i = 0; i < 12 && !(await target.isChecked()); i++) await page.keyboard.press("ArrowDown");
  await expect(target).toBeChecked();
  await expect(target).toBeFocused();
}

async function typeInto(page: Page, field: Locator, text: string) {
  await tabTo(page, field);
  await page.keyboard.type(text);
}

test("the core journey works with the keyboard alone", async ({ page }) => {
  test.setTimeout(240_000);
  const learner = newLearner();

  // Sign up.
  await page.goto("/sign-up");
  await typeInto(page, page.getByLabel("Name"), learner.name);
  await typeInto(page, page.getByLabel("Email"), learner.email);
  await typeInto(page, page.getByLabel("Password", { exact: true }), learner.password);
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/\/app\/onboarding$/, { timeout: 30_000 });

  // Onboarding.
  const travel = page.getByRole("checkbox", { name: "Travel" });
  await tabTo(page, travel);
  await page.keyboard.press("Space");
  await expect(travel).toBeChecked();
  await chooseRadio(page, page.getByRole("radio", { name: /A2 — Elementary/ }));
  await chooseRadio(page, page.getByRole("radio", { name: "30 minutes" }));
  await tabTo(page, page.getByRole("button", { name: "Save and continue" }));
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/\/app$/);

  // A lesson answer, with feedback announced and reachable.
  await page.goto("/app/learn/a1-subject-pronouns-and-be");
  const first = page.locator("article").first();
  await chooseRadio(page, first.getByRole("radio", { name: "am", exact: true }));
  await tabTo(page, first.getByRole("button", { name: "Check" }));
  await page.keyboard.press("Enter");
  await expect(first.getByText(/Correct|Not quite/).first()).toBeVisible();

  // A notebook note.
  await page.goto("/app/notebook");
  await chooseRadio(page, page.getByRole("radio", { name: "Grammar note" }));
  await typeInto(page, page.getByRole("textbox", { name: "Note", exact: true }), "Use am with I.");
  await tabTo(page, page.getByRole("button", { name: "Save note" }));
  await page.keyboard.press("Enter");
  await expect(page.getByText("Use am with I.")).toBeVisible();

  // Settings: a checkbox and a save button.
  await page.goto("/app/settings");
  const reduced = page.getByRole("checkbox", { name: /Reduce motion/ });
  await tabTo(page, reduced);
  await page.keyboard.press("Space");
  await expect(reduced).toBeChecked();
  await tabTo(page, page.getByRole("button", { name: "Save preferences" }));
  await page.keyboard.press("Enter");
  await expect(page.getByText("Preferences saved.")).toBeVisible();

  // Sign out.
  await tabTo(page, page.getByRole("button", { name: "Sign out" }), 120);
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/\/$/);
});

test("dialogs trap focus and close with Escape", async ({ page }) => {
  await signUp(page);
  await completeOnboarding(page);

  await page.goto("/app/settings");
  const trigger = page.getByRole("button", { name: "Delete my account…" });
  await tabTo(page, trigger);
  await page.keyboard.press("Enter");
  const dialog = page.getByRole("dialog", { name: "Delete your account?" });
  await expect(dialog).toBeVisible();
  for (let i = 0; i < 8; i++) {
    await page.keyboard.press("Tab");
    expect(await dialog.evaluate((d) => d.contains(document.activeElement)), "focus stays in the dialog").toBe(true);
  }
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  await expect(trigger).toBeFocused();
});

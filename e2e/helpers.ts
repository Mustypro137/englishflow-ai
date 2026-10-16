import { randomUUID } from "node:crypto";
import { type Browser, expect, type Page, type TestInfo } from "@playwright/test";

export const TEST_PASSWORD = "correct-horse-battery";

/** Throwaway learner. The e2e+…@example.test pattern is cleaned up by global teardown. */
export function newLearner() {
  return { name: "Test Learner", email: `e2e+${randomUUID()}@example.test`, password: TEST_PASSWORD };
}

export async function signUp(page: Page, learner = newLearner()) {
  await page.goto("/sign-up");
  await page.getByLabel("Name").fill(learner.name);
  await page.getByLabel("Email").fill(learner.email);
  await page.getByLabel("Password", { exact: true }).fill(learner.password);
  await page.getByRole("button", { name: "Create account" }).click();
  // Generous timeout: the first request can wait for the free Neon database to wake up.
  await expect(page).toHaveURL(/\/app\/onboarding$/, { timeout: 30_000 });
  return learner;
}

export async function completeOnboarding(page: Page, options: { minutes?: string; level?: RegExp } = {}) {
  await page.getByRole("checkbox", { name: "Travel" }).check();
  await page.getByRole("radio", { name: options.level ?? /A2 — Elementary/ }).check();
  await page.getByRole("radio", { name: `${options.minutes ?? "30"} minutes` }).check();
  await page.getByRole("button", { name: "Save and continue" }).click();
  await expect(page).toHaveURL(/\/app$/);
}

export async function signIn(page: Page, email: string, password = TEST_PASSWORD) {
  await page.goto("/sign-in");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
}

export async function signOut(page: Page) {
  await page.getByRole("button", { name: "Sign out" }).click();
  await expect(page).toHaveURL(/\/$/);
}

/** A second, independent browser session that keeps this project's settings (base URL, device). */
export async function newSession(browser: Browser, testInfo: TestInfo): Promise<Page> {
  const context = await browser.newContext(testInfo.project.use);
  return context.newPage();
}

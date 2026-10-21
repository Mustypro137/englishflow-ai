import { readFile } from "node:fs/promises";
import { expect, test } from "@playwright/test";
import { completeOnboarding, newLearner, newSession, signIn, signOut, signUp } from "./helpers";

/** The Today page greets by local time of day. */
const greeting = (name: string) => new RegExp(`^Good (morning|afternoon|evening), ${name}$`);

test("sign up, onboard, sign out, sign in — and saved choices persist", async ({ page }) => {
  const learner = await signUp(page);

  await expect(page.getByRole("heading", { level: 1, name: "Set up your learning" })).toBeVisible();
  await completeOnboarding(page, { minutes: "30", level: /A2 — Elementary/ });

  await expect(page.getByRole("heading", { level: 1, name: greeting(learner.name) })).toBeVisible();
  await expect(
    page.getByRole("region", { name: "Today's plan" }).getByText("Built around your 30-minute goal"),
  ).toBeVisible();
  await expect(page.getByText(/Working level: A2/)).toBeVisible();
  await expect(page.getByText("your own estimate", { exact: true })).toBeVisible();

  await signOut(page);
  await signIn(page, learner.email);
  await expect(page).toHaveURL(/\/app$/);

  await page.reload();
  await expect(page.getByRole("heading", { level: 1, name: greeting(learner.name) })).toBeVisible();
  await expect(
    page.getByRole("region", { name: "Today's plan" }).getByText("Built around your 30-minute goal"),
  ).toBeVisible();
});

test("signed-out visitors are sent to sign in, then back to where they were going", async ({ page }) => {
  const learner = await signUp(page);
  await completeOnboarding(page);
  await signOut(page);

  await page.goto("/app/settings");
  await expect(page).toHaveURL(/\/sign-in\?next=%2Fapp%2Fsettings$/);
  await page.getByLabel("Email").fill(learner.email);
  await page.getByLabel("Password", { exact: true }).fill(learner.password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/app\/settings$/);
});

test("wrong password shows one generic, accessible error", async ({ page }) => {
  const learner = await signUp(page);
  await completeOnboarding(page);
  await signOut(page);

  await signIn(page, learner.email, "not-the-right-password");
  await expect(page.getByRole("main").getByRole("alert")).toHaveText("The email or password is incorrect.");
  await signIn(page, "nobody-here@example.test", "whatever-password");
  await expect(page.getByRole("main").getByRole("alert")).toHaveText("The email or password is incorrect.");
});

test("sign-up validates input before sending it", async ({ page }) => {
  await page.goto("/sign-up");
  await page.getByLabel("Name").fill("Short Password");
  await page.getByLabel("Email").fill("not-an-email");
  await page.getByLabel("Password", { exact: true }).fill("short");
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page.getByText("Enter a valid email address.")).toBeVisible();
  await expect(page.getByText("Use at least 10 characters.")).toBeVisible();
  await expect(page.getByLabel("Email")).toHaveAttribute("aria-invalid", "true");
  await expect(page).toHaveURL(/\/sign-up$/);
});

test("signing up twice with the same email is refused", async ({ page, browser }, testInfo) => {
  const learner = await signUp(page);
  const other = await newSession(browser, testInfo);
  await other.goto("/sign-up");
  await other.getByLabel("Name").fill("Copy");
  await other.getByLabel("Email").fill(learner.email);
  await other.getByLabel("Password", { exact: true }).fill(learner.password);
  await other.getByRole("button", { name: "Create account" }).click();
  await expect(other.getByRole("main").getByRole("alert")).toContainText("already exists");
  await other.close();
});

test("onboarding keeps answers and explains the problem when something is missing", async ({ page }) => {
  await signUp(page);
  await page.getByLabel("What should we call you?").fill("");
  await page.getByRole("checkbox", { name: "Work and career" }).check();
  await page.getByRole("button", { name: "Save and continue" }).click();
  await expect(page.getByText("Please check the highlighted answers.")).toBeVisible();
  await expect(page.getByText("Enter your name.")).toBeVisible();
  await expect(page.getByRole("checkbox", { name: "Work and career" })).toBeChecked();
  await expect(page).toHaveURL(/\/app\/onboarding$/);
});

test("settings save, persist after reload, and apply the text size and theme", async ({ page }) => {
  await signUp(page);
  await completeOnboarding(page);
  await page.goto("/app/settings");

  await page.getByRole("radio", { name: "Extra large" }).check();
  await page.getByRole("radio", { name: "Dark", exact: true }).check();
  await page.getByRole("checkbox", { name: /Reduce motion/ }).check();
  await page.getByRole("radio", { name: "60 minutes" }).check();
  await page.getByRole("button", { name: "Save preferences" }).click();
  await expect(page.getByText("Preferences saved.")).toBeVisible();
  await expect(page.locator("html")).toHaveAttribute("data-text-scale", "x-large");
  await expect(page.locator("html")).toHaveAttribute("data-reduced-motion", "true");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");

  await page.getByLabel("Name").fill("Renamed Learner");
  await page.getByRole("button", { name: "Save profile" }).click();
  await expect(page.getByText("Profile saved.")).toBeVisible();

  await page.reload();
  await expect(page.getByRole("radio", { name: "Extra large" })).toBeChecked();
  await expect(page.getByRole("radio", { name: "60 minutes" })).toBeChecked();
  await expect(page.getByRole("radio", { name: "Dark", exact: true })).toBeChecked();
  await expect(page.getByLabel("Name")).toHaveValue("Renamed Learner");
  await expect(page.locator("html")).toHaveAttribute("data-text-scale", "x-large");
});

test("a learner can download their data as JSON", async ({ page, request }) => {
  const learner = await signUp(page);
  await completeOnboarding(page);
  await page.goto("/app/settings");

  const [download] = await Promise.all([
    page.waitForEvent("download"),
    page.getByRole("link", { name: "Download my data" }).click(),
  ]);
  expect(download.suggestedFilename()).toMatch(/^englishflow-export-\d{4}-\d{2}-\d{2}\.json$/);
  const data = JSON.parse(await readFile(await download.path(), "utf8"));
  expect(data.account.email).toBe(learner.email);
  expect(data.profile.onboardingCompletedAt).toBeTruthy();

  // Signed out, there is nothing to download.
  expect((await request.get("/api/export")).status()).toBe(401);
});

test("a learner can delete their account, and it is really gone", async ({ page }) => {
  const learner = await signUp(page);
  await completeOnboarding(page);
  await page.goto("/app/settings");

  await page.getByRole("button", { name: "Delete my account…" }).click();
  const dialog = page.getByRole("dialog", { name: "Delete your account?" });
  await dialog.getByLabel("Password", { exact: true }).fill("wrong-password-123");
  await dialog.getByRole("button", { name: "Delete permanently" }).click();
  await expect(dialog.getByRole("alert")).toHaveText("That password is incorrect.");

  await dialog.getByLabel("Password", { exact: true }).fill(learner.password);
  await dialog.getByRole("button", { name: "Delete permanently" }).click();
  await expect(page).toHaveURL(/\/\?account=deleted$/);

  await signIn(page, learner.email);
  await expect(page.getByRole("main").getByRole("alert")).toHaveText("The email or password is incorrect.");
});

test("a new account must finish onboarding before reaching the home page", async ({ page }) => {
  await signUp(page);
  await page.goto("/app");
  await expect(page).toHaveURL(/\/app\/onboarding$/);
});

test("each learner sees only their own details", async ({ browser }, testInfo) => {
  const a = await newSession(browser, testInfo);
  const b = await newSession(browser, testInfo);
  const learnerA = newLearner();
  const learnerB = newLearner();
  await signUp(a, { ...learnerA, name: "Learner Alpha" });
  await completeOnboarding(a, { minutes: "10" });
  await signUp(b, { ...learnerB, name: "Learner Beta" });
  await completeOnboarding(b, { minutes: "60" });

  await a.reload();
  await expect(a.getByRole("heading", { level: 1, name: greeting("Learner Alpha") })).toBeVisible();
  await expect(
    a.getByRole("region", { name: "Today's plan" }).getByText("Built around your 10-minute goal"),
  ).toBeVisible();
  await expect(a.getByText("Learner Beta")).toHaveCount(0);

  await b.goto("/app/settings");
  await expect(b.getByLabel("Name")).toHaveValue("Learner Beta");
  await expect(b.getByText(learnerA.email)).toHaveCount(0);
  await a.close();
  await b.close();
});

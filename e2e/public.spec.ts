import { expect, test } from "@playwright/test";
import { APP_ROUTES, PUBLIC_ROUTES } from "./routes";

for (const route of PUBLIC_ROUTES) {
  test(`public page ${route} renders with header, one h1 and footer`, async ({ page }) => {
    const response = await page.goto(route);
    expect(response?.status()).toBe(200);
    await expect(page.getByRole("banner")).toBeVisible();
    await expect(page.getByRole("contentinfo")).toBeVisible();
    await expect(page.locator("h1")).toHaveCount(1);
    await expect(page.locator("main#main-content")).toBeVisible();
  });
}

for (const route of APP_ROUTES) {
  test(`learner page ${route} requires signing in`, async ({ page }) => {
    await page.goto(route);
    await expect(page).toHaveURL(/\/sign-in\?next=/);
    await expect(page.getByRole("heading", { level: 1, name: "Sign in" })).toBeVisible();
  });
}

test("unknown routes show the 404 page", async ({ page }) => {
  const response = await page.goto("/does-not-exist");
  expect(response?.status()).toBe(404);
  await expect(page.getByRole("heading", { level: 1, name: "Page not found" })).toBeVisible();
});

test("legal pages are clearly marked as placeholders", async ({ page }) => {
  for (const route of ["/privacy", "/terms"]) {
    await page.goto(route);
    await expect(page.getByText("Placeholder — requires legal review before launch")).toBeVisible();
  }
});

test("pricing page does not offer plans or prices", async ({ page }) => {
  await page.goto("/pricing");
  await expect(page.getByRole("heading", { level: 1, name: "Pricing is not set yet" })).toBeVisible();
  await expect(page.locator("main")).not.toContainText("$");
});

test("curriculum page shows content status for all six levels", async ({ page }) => {
  await page.goto("/curriculum");
  for (const code of ["A1", "A2", "B1", "B2", "C1", "C2"]) {
    await expect(page.getByRole("heading", { level: 3, name: new RegExp(`^${code}`) })).toBeVisible();
  }
  await expect(page.getByText("In development").first()).toBeVisible();
});

test.describe("sample exercise", () => {
  test("gives targeted feedback for a wrong answer and confirms a correct one", async ({ page }) => {
    await page.goto("/");
    const input = page.getByLabel("Your answer");
    const check = page.getByRole("button", { name: "Check" });

    await check.click();
    await expect(page.getByText(/Type an answer first/)).toBeVisible();

    await input.fill("go");
    await check.click();
    await expect(page.getByText("Not quite.")).toBeVisible();
    await expect(page.getByText(/the verb takes -s or -es/)).toBeVisible();
    await expect(input).toHaveAttribute("aria-invalid", "true");

    await page.getByRole("button", { name: "Show answer" }).click();
    await expect(page.getByText("Answer: goes.")).toBeVisible();
    await expect(page.getByText("goes", { exact: true })).toBeVisible();

    await input.fill("Goes.");
    await check.click();
    await expect(page.getByText("Correct: she goes.")).toBeVisible();

    await page.getByRole("button", { name: "Try again" }).click();
    await expect(input).toHaveValue("");
  });

  test("can be completed with the keyboard only", async ({ page }) => {
    await page.goto("/");
    await page.getByLabel("Your answer").focus();
    await page.keyboard.type("goes");
    await page.keyboard.press("Enter");
    await expect(page.getByText("Correct: she goes.")).toBeVisible();
  });
});

import { expect, test } from "@playwright/test";

const isMobile = (projectName: string) => projectName === "mobile";

test("first Tab focuses the skip link, which moves focus to main content", async ({ page }) => {
  await page.goto("/features");
  await page.keyboard.press("Tab");
  const skip = page.getByRole("link", { name: "Skip to main content" });
  await expect(skip).toBeFocused();
  await expect(skip).toBeVisible();
  await page.keyboard.press("Enter");
  await expect(page.locator("main#main-content")).toBeFocused();
});

test("desktop header navigation works and marks the current page", async ({ page }, testInfo) => {
  test.skip(isMobile(testInfo.project.name), "desktop navigation only");
  await page.goto("/");
  const nav = page.getByRole("navigation", { name: "Main" });
  await nav.getByRole("link", { name: "Curriculum" }).click();
  await expect(page).toHaveURL(/\/curriculum$/);
  await expect(nav.getByRole("link", { name: "Curriculum" })).toHaveAttribute("aria-current", "page");
});

test("desktop header links are reachable with the keyboard", async ({ page }, testInfo) => {
  test.skip(isMobile(testInfo.project.name), "desktop navigation only");
  await page.goto("/");
  const targets = ["Features", "How it works", "Curriculum", "Pricing", "Sign in", "Create account"];
  const reached: string[] = [];
  for (let i = 0; i < 14 && reached.length < targets.length; i++) {
    await page.keyboard.press("Tab");
    const name = await page.evaluate(() => document.activeElement?.textContent?.trim() ?? "");
    if (targets.includes(name) && !reached.includes(name)) reached.push(name);
  }
  expect(reached).toEqual(targets);
});

test("mobile menu opens, navigates, and closes with Escape", async ({ page }, testInfo) => {
  test.skip(!isMobile(testInfo.project.name), "mobile navigation only");
  await page.goto("/");
  await expect(page.getByRole("navigation", { name: "Main" })).toBeHidden();

  const open = page.getByRole("button", { name: "Open menu" });
  await open.click();
  const dialog = page.getByRole("dialog", { name: "Menu" });
  await expect(dialog).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  await expect(open).toBeFocused();

  await open.click();
  await dialog.getByRole("link", { name: "How it works" }).click();
  await expect(page).toHaveURL(/\/how-it-works$/);
  await expect(dialog).toBeHidden();
});

test("no page scrolls horizontally on a phone", async ({ page }, testInfo) => {
  test.skip(!isMobile(testInfo.project.name), "mobile layout only");
  for (const route of ["/", "/features", "/how-it-works", "/curriculum", "/pricing", "/sign-up", "/sign-in"]) {
    await page.goto(route);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow, route).toBeLessThanOrEqual(0);
  }
});

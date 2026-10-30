import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page, type TestInfo } from "@playwright/test";

test.use({ reducedMotion: "reduce" });

async function expectAccessible(page: Page, testInfo: TestInfo, state: string) {
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
    .analyze();
  await testInfo.attach(`axe-${state}`, { body: JSON.stringify(results, null, 2), contentType: "application/json" });
  expect(results.violations).toEqual([]);
}

for (const scheme of ["light", "dark"] as const) {
  test.describe(scheme, () => {
    test.use({ colorScheme: scheme });
    for (const route of ["/adopt", "/home", "/profile", "/profile?tab=settings", "/playground", "/market", "/guilds/new"]) {
      test(`accessibility: ${route}`, async ({ page }, testInfo) => {
        await page.goto(route);
        await expect(page.locator("main h1")).toBeVisible();
        await expect(page.locator(".pk-boot, .pk-waiting--page")).toHaveCount(0);
        await expectAccessible(page, testInfo, "page");
      });
    }

    test("accessibility: wallet dialog and adoption validation", async ({ page }, testInfo) => {
      await page.goto("/home");
      await page.getByRole("banner").getByRole("button", { name: "Connect", exact: true }).click();
      await expect(page.getByRole("dialog", { name: "Connect a wallet" })).toBeVisible();
      await expectAccessible(page, testInfo, "wallet-dialog");
      await page.keyboard.press("Escape");
      await page.goto("/adopt");
      await page.getByRole("button", { name: /choose the luna cat/i }).click();
      await page.getByRole("textbox", { name: "Pet name" }).fill("x");
      await page.getByRole("button", { name: /that’s the one/i }).click();
      await expect(page.getByRole("alert").filter({ hasText: /name needs/i })).toBeVisible();
      await expectAccessible(page, testInfo, "invalid-name");
    });
  });
}

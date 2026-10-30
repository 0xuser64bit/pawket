import { expect, test } from "@playwright/test";

test.use({ reducedMotion: "reduce" });

for (const width of [320, 390, 768, 1280, 1920]) {
  test(`critical screens and overlays remain usable at ${width}px`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height: 800 });
    await page.addInitScript(() => localStorage.setItem("pawket.room", "flat"));
    for (const route of ["/home", "/adopt", "/profile?tab=settings", "/market", "/guilds/new", "/playground"]) {
      await page.goto(route);
      await expect(page.locator("main h1")).toBeVisible();
      await expect(page.locator(".pk-boot, .pk-waiting--page")).toHaveCount(0);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
      await page.screenshot({ path: testInfo.outputPath(`${route.replace(/[^a-z]/g, "-")}-${width}.png`), fullPage: true });
    }
    await page.goto("/home");
    const connect = page.getByRole("banner").getByRole("button", { name: "Connect", exact: true });
    await connect.focus();
    await page.keyboard.press("Enter");
    const dialog = page.getByRole("dialog", { name: "Connect a wallet" });
    await expect(dialog).toBeVisible();
    await page.keyboard.press("Shift+Tab");
    await expect(dialog.getByRole("button", { name: "Not now" })).toBeFocused();
    await page.keyboard.press("Tab");
    await expect(dialog.getByRole("button", { name: "Close Connect a wallet" })).toBeFocused();
    const box = (await dialog.boundingBox())!;
    expect(box.x).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width).toBeLessThanOrEqual(width);
    expect(await page.evaluate(() => document.documentElement.style.overflow)).toBe("hidden");
    await page.keyboard.press("Escape");
    await expect(dialog).toHaveCount(0);
    await expect(connect).toBeFocused();
    expect(await page.evaluate(() => document.documentElement.style.overflow)).toBe("");
    expect(await page.locator("[inert]").count()).toBe(0);
  });
}

test("profile tab history and repeated keyboard navigation keep their panels aligned", async ({ page }) => {
  await page.goto("/profile#shelf");
  const pets = page.getByRole("tab", { name: "Pets", exact: true });
  await pets.focus();
  await page.keyboard.press("End");
  await expect(page.getByRole("tab", { name: "Settings", exact: true })).toBeFocused();
  await expect(page.getByRole("tabpanel", { name: "Settings", exact: true })).toBeVisible();
  await page.goBack();
  await expect(pets).toHaveAttribute("aria-selected", "true");
  await expect(page.getByRole("tabpanel", { name: "Pets", exact: true })).toBeVisible();
  await page.goForward();
  await expect(page.getByRole("tabpanel", { name: "Settings", exact: true })).toBeVisible();
  const settings = page.getByRole("tab", { name: "Settings", exact: true });
  await settings.focus();
  await page.keyboard.press("Home");
  await page.keyboard.press("ArrowLeft");
  await expect(settings).toBeFocused();
  await expect(settings).toHaveAttribute("aria-selected", "true");
});

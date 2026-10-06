import { expect, test } from "@playwright/test";

test.use({ viewport: { width: 375, height: 740 }, hasTouch: true, isMobile: true });

test("the icon-only room control and modal close are usable on a phone", async ({ page }) => {
  await page.goto("/home");
  const room = page.getByRole("button", { name: /^Room:/ });
  await expect(room).toHaveText("");
  const box = await room.boundingBox();
  expect(box && box.width >= 44 && box.height >= 44).toBe(true);
  const connect = page.getByRole("banner").getByRole("button", { name: "Connect", exact: true });
  await connect.click();
  const sheet = page.getByRole("dialog", { name: "Connect a wallet" });
  await expect(sheet).toBeVisible();
  await page.keyboard.press("Shift+Tab");
  await expect(sheet.getByRole("button", { name: "Not now" })).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(sheet.getByRole("button", { name: "Close Connect a wallet" })).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(sheet).toHaveCount(0);
  await expect(connect).toBeFocused();
});

test("a sheet stays within a short phone in either room, with its controls reachable", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 480 });
  await page.goto("/market");
  await page.getByRole("button", { name: /Halo/ }).click();
  const sheet = page.getByRole("dialog", { name: "Halo" });
  await expect(sheet).toBeVisible();
  await expect.poll(async () => {
    const box = await sheet.boundingBox();
    return box && box.y >= 0 && box.x >= 0 && box.x + box.width <= 320 && box.y + box.height <= 480;
  }).toBe(true);
  await expect(sheet.getByRole("button", { name: "Not now" })).toBeInViewport();
  await sheet.getByRole("button", { name: "Not now" }).click();
  await expect(sheet).toHaveCount(0);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.getByRole("button", { name: /Halo/ }).click();
  await sheet.getByRole("button", { name: "Not now" }).click();
  await expect(sheet).toHaveCount(0);
});

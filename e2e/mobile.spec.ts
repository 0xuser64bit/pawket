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

async function adopt(page: import("@playwright/test").Page) {
  await page.goto("/adopt");
  await page.getByRole("button", { name: /choose the luna cat/i }).click();
  await page.getByRole("textbox", { name: "Pet name" }).fill("Pepper");
  await page.getByRole("button", { name: /that’s the one/i }).click();
  await page.getByRole("button", { name: /take them home/i }).click();
  await page.goto("/playground");
}

for (const name of ["Catch", "Hop"]) {
  test(`${name} pauses without losing the round and resumes by touch`, async ({ page }) => {
    await adopt(page);
    await page.getByRole("button", { name: new RegExp(`^${name}`) }).tap();
    const field = page.locator(".pk-game");
    await field.tap();
    await page.getByRole("button", { name: "Pause round" }).tap();
    await expect(page.getByText("Round paused")).toBeVisible();
    const before = await field.getAttribute("aria-label");
    await page.waitForTimeout(750);
    await expect(field).toHaveAttribute("aria-label", before!);
    await page.getByRole("button", { name: "Keep playing" }).tap();
    await expect(page.getByText("Round paused")).toHaveCount(0);
    await expect(field).not.toHaveAttribute("aria-label", before!, { timeout: 3000 });
  });
}

test("Catch keeps a finger drag and a backgrounded round pauses", async ({ page }) => {
  await adopt(page);
  await page.getByRole("button", { name: /^Catch/ }).tap();
  const field = page.locator(".pk-game");
  await expect(field).toBeInViewport();
  const box = (await field.boundingBox())!;
  const session = await page.context().newCDPSession(page);
  const point = (part: number) => ({ x: box.x + box.width * part, y: box.y + box.height * 0.7 });
  await session.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [point(0.25)] });
  await session.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [point(0.8)] });
  await expect.poll(() => page.locator(".pk-game__catcher").evaluate((el) => parseFloat((el as HTMLElement).style.left))).toBeGreaterThan(60);
  await session.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
  await session.detach();
  await page.evaluate(() => {
    Object.defineProperty(document, "hidden", { configurable: true, value: true });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await expect(page.getByText("Round paused")).toBeVisible();
});

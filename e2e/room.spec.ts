import { expect, test, type Page } from "@playwright/test";

/**
 * The 3D room on Home. Headless Chromium draws WebGL in software, so the
 * room is given time to come up; nothing here asserts pixels, only what the
 * room says it is doing and what a player can press.
 */

async function adopt(page: Page, name = "Pepper") {
  await page.goto("/adopt");
  await page.getByRole("button", { name: /choose the luna cat/i }).click();
  await page.getByRole("textbox", { name: "Pet name" }).fill(name);
  await page.getByRole("button", { name: /that’s the one/i }).click();
  await page.getByRole("button", { name: /take them home/i }).click();
  await expect(page.getByRole("heading", { name: `${name}'s room` })).toBeVisible();
}

/** The live room names itself and how to turn it. */
const liveRoom = (page: Page) => page.getByRole("group", { name: /arrow keys turn the room/i });

test("the room comes up in 3D and an emote plays in it", async ({ page }) => {
  await adopt(page);
  await expect(liveRoom(page)).toBeVisible({ timeout: 45_000 });
  await page.getByRole("button", { name: "Say" }).click();
  await page.getByRole("button", { name: "Wave" }).click();
  await expect(page.getByRole("status").filter({ hasText: "You wave. Pepper saw." })).toBeVisible();
  await expect(page.getByText(/do not change a vital, XP or the streak/i)).toBeVisible();
});

test("a care shows in the room only after it is saved", async ({ page }) => {
  await adopt(page);
  await expect(liveRoom(page)).toBeVisible({ timeout: 45_000 });
  await page.getByRole("button", { name: "Feed" }).click();
  await expect(page.getByText(/Fed\. \+10 XP/)).toBeVisible();
  await expect(page.getByRole("status").filter({ hasText: "You set the bowl down. Pepper eats." })).toBeVisible();
  // The next Feed is resting: no second moment can be asked for.
  await expect(page.getByRole("button", { name: /Feed/ })).toBeDisabled();
});

test("the flat room is a choice this device remembers", async ({ page }) => {
  await adopt(page);
  await expect(liveRoom(page)).toBeVisible({ timeout: 45_000 });
  await page.getByRole("button", { name: "Flat room" }).click();
  await expect(liveRoom(page)).toHaveCount(0);
  await expect(page.locator(".pk-room canvas")).toHaveCount(0);
  await page.reload();
  await expect(page.getByRole("button", { name: "3D room" })).toBeVisible();
  await expect(page.locator(".pk-room canvas")).toHaveCount(0);
  await page.getByRole("button", { name: "3D room" }).click();
  await expect(liveRoom(page)).toBeVisible({ timeout: 45_000 });
});

test("your look is saved on this device and dresses the room", async ({ page }) => {
  await adopt(page);
  await page.getByRole("button", { name: "Look" }).click();
  await page.getByRole("button", { name: "Change your look" }).click();
  await page.getByRole("tab", { name: "Clothes" }).click();
  await page.getByRole("radio", { name: "Long sleeve" }).click();
  await page.getByRole("radiogroup", { name: "Top colour" }).getByRole("radio", { name: "Sprout" }).click();
  const summary = page.getByText(/^Espresso buns, sprout long sleeve/);
  await expect(summary).toBeVisible();
  await page.reload();
  await page.getByRole("button", { name: "Look" }).click();
  await expect(summary).toBeVisible();
});

test("an empty room still draws you, and asks for no pet it does not have", async ({ page }) => {
  await page.goto("/home");
  await expect(page.getByRole("heading", { name: "The window is open" })).toBeVisible();
  await expect(liveRoom(page)).toBeVisible({ timeout: 45_000 });
  await expect(page.getByRole("button", { name: "Wave" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Change your look" })).toBeVisible();
});

test.describe("without WebGL", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      const original = HTMLCanvasElement.prototype.getContext;
      HTMLCanvasElement.prototype.getContext = function (this: HTMLCanvasElement, type: string, ...rest: unknown[]) {
        if (type === "webgl" || type === "webgl2") return null;
        return (original as (...a: unknown[]) => unknown).call(this, type, ...rest);
      } as typeof HTMLCanvasElement.prototype.getContext;
    });
  });

  test("the flat room is the room, and nothing pretends otherwise", async ({ page }) => {
    await adopt(page);
    await expect(page.locator(".pk-room__pet svg")).toBeVisible();
    await expect(page.locator(".pk-room canvas")).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Wave" })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Flat room" })).toHaveCount(0);
    await page.getByRole("button", { name: "Look" }).click();
    await expect(page.getByText(/the flat room shows your top colour/i)).toBeVisible();
    // Care still works exactly as before.
    await page.getByRole("button", { name: "Feed" }).click();
    await expect(page.getByText(/Fed\. \+10 XP/)).toBeVisible();
  });
});

test.describe("with reduced motion", () => {
  test.use({ reducedMotion: "reduce" });

  test("a moment is shown as a still, and still said", async ({ page }) => {
    await adopt(page);
    await expect(liveRoom(page)).toBeVisible({ timeout: 45_000 });
    await page.getByRole("button", { name: "Say" }).click();
    await page.getByRole("button", { name: "Pet", exact: true }).click();
    await expect(page.getByRole("status").filter({ hasText: "You pet Pepper." })).toBeVisible();
  });
});

test("nothing scrolls sideways on a small phone with the look open", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 700 });
  await adopt(page);
  await page.getByRole("button", { name: "Look" }).click();
  await page.getByRole("button", { name: "Change your look" }).click();
  for (const part of ["Body", "Hair", "Clothes", "Shoes"]) {
    await page.getByRole("tab", { name: part }).click();
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow, part).toBeLessThanOrEqual(0);
  }
});

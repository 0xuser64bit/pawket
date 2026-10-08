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
  // With 3D chosen, the flat room's characters never show while the 3D room builds: the frame holds a loader.
  await expect(page.locator(".pk-room__flat")).toBeHidden();
  await expect(liveRoom(page)).toBeVisible({ timeout: 45_000 });
  await expect(page.locator(".pk-room__flat")).toBeHidden();
  await page.getByRole("button", { name: "Say" }).click();
  await page.getByRole("button", { name: "Wave" }).click();
  await expect(page.getByRole("status").filter({ hasText: "You wave. Pepper saw." })).toBeVisible();
  await expect(page.getByText(/do not change a vital, XP or the streak/i)).toBeVisible();
});

test("the room takes a photo of the two of you, to save or share", async ({ page }) => {
  await adopt(page);
  await expect(liveRoom(page)).toBeVisible({ timeout: 45_000 });
  await page.getByRole("button", { name: "Photo" }).click();
  const photo = page.getByRole("dialog", { name: /Pepper and me/ });
  await expect(photo).toBeVisible();
  const save = photo.getByRole("link", { name: "Save the photo" });
  await expect(save).toHaveAttribute("download", /^pawket-pepper-\d{4}-\d{2}-\d{2}\.png$/);
  await expect(save).toHaveAttribute("href", /^data:image\/png;base64,/);
  await photo.getByRole("button", { name: "Close", exact: true }).click();
  await expect(photo).toHaveCount(0);
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
  await page.getByRole("button", { name: "Switch to 2D view" }).click();
  await expect(page.locator(".pk-room__flat")).toBeVisible();
  await expect(liveRoom(page)).toHaveCount(0);
  await expect(page.locator(".pk-room canvas")).toHaveCount(0);
  // Letting go of the canvas is not the room failing, and 3D comes straight back.
  await expect(page.getByText(/stopped drawing/)).toHaveCount(0);
  await page.getByRole("button", { name: "Switch to 3D view" }).click();
  await expect(liveRoom(page)).toBeVisible({ timeout: 45_000 });
  await page.getByRole("button", { name: "Switch to 2D view" }).click();
  await expect(page.locator(".pk-room canvas")).toHaveCount(0);
  await page.reload();
  await expect(page.getByRole("button", { name: "Switch to 3D view" })).toBeVisible();
  await expect(page.locator(".pk-room canvas")).toHaveCount(0);
  await page.getByRole("button", { name: "Switch to 3D view" }).click();
  await expect(liveRoom(page)).toBeVisible({ timeout: 45_000 });
});

test("your look is saved on this device and dresses the room", async ({ page }) => {
  // Visit once before Home links here again: the prefetched or reused page
  // must still open its editor when the new destination includes #look.
  await page.goto("/profile");
  await expect(page.locator(".pk-fold").first()).not.toHaveAttribute("open");
  await adopt(page);
  await page.getByRole("link", { name: "Look" }).click();
  await expect(page).toHaveURL(/\/profile#look/);
  await page.getByRole("tab", { name: "Clothes" }).click();
  await page.getByRole("radio", { name: "Long sleeve" }).click();
  await page.getByRole("radiogroup", { name: "Top colour" }).getByRole("radio", { name: "Sprout" }).click();
  const summary = page.getByText(/^Espresso buns, sprout long sleeve/);
  await expect(summary).toBeVisible();
  await page.reload();
  await expect(summary).toBeVisible();
});

test("you can wear a hat and glasses, and match your pet's", async ({ page }) => {
  await adopt(page);
  await page.goto("/profile?tab=wardrobe#shelf");
  await page.getByRole("button", { name: /Knit beanie/ }).click();
  await expect(page.getByRole("button", { name: /Knit beanie/ })).toHaveAttribute("aria-pressed", "true");
  await page.locator("summary", { hasText: "How you look" }).click();
  await page.getByRole("tab", { name: "Extras" }).click();
  await page.getByRole("radiogroup", { name: "On your nose" }).getByRole("radio", { name: "Heart glasses" }).click();
  await page.getByRole("button", { name: "Match Pepper" }).click();
  await expect(page.getByText("Matching Pepper.")).toBeVisible();
  await expect(page.getByText(/pool beanie, heart glasses$/)).toBeVisible();
  await page.reload();
  // The fold is closed again, and its summary says how you look.
  await expect(page.getByText(/pool beanie, heart glasses$/)).toBeVisible();
});

test("an empty room still draws you, and asks for no pet it does not have", async ({ page }) => {
  await page.goto("/home");
  await expect(page.getByRole("heading", { name: "The window is open" })).toBeVisible();
  await expect(liveRoom(page)).toBeVisible({ timeout: 45_000 });
  await expect(page.getByRole("button", { name: "Wave" })).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Change your look" })).toBeVisible();
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
    // No loader waits for a 3D room that will never come.
    await expect(page.getByText("Building the room in 3D")).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Wave" })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Switch to 2D view" })).toHaveCount(0);
    // Care still works exactly as before.
    await page.getByRole("button", { name: "Feed" }).click();
    await expect(page.getByText(/Fed\. \+10 XP/)).toBeVisible();
    // And the look says plainly where it is worn.
    await page.goto("/profile#look");
    await expect(page.getByText(/the flat room shows your top colour/i)).toBeVisible();
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
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.setViewportSize({ width: 320, height: 700 });
  await adopt(page);
  await page.goto("/profile#look");
  const tabs = page.getByRole("tablist", { name: "Parts of your look" });
  await expect(tabs).toBeVisible();
  const targets = await tabs.getByRole("tab").evaluateAll((els) => els.map((el) => {
    const { width, height } = el.getBoundingClientRect();
    return { name: el.textContent, y: (el as HTMLElement).offsetTop, width, height, content: el.scrollWidth, client: el.clientWidth };
  }));
  expect(targets).toHaveLength(5);
  for (const box of targets) {
    expect(box.y, box.name ?? "").toBe(targets[0].y);
    expect(box.width, box.name ?? "").toBeGreaterThanOrEqual(44);
    expect(box.height, box.name ?? "").toBeGreaterThanOrEqual(44);
    expect(box.content, box.name ?? "").toBeLessThanOrEqual(box.client);
  }
  for (const part of ["Body", "Hair", "Clothes", "Shoes", "Extras"]) {
    await page.getByRole("tab", { name: part }).click();
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow, part).toBeLessThanOrEqual(0);
  }
});

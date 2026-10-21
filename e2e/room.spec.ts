import { expect, test, type Page } from "@playwright/test";

async function adopt(page: Page, name = "Pepper") {
  await page.goto("/adopt");
  await page.getByRole("button", { name: /choose the luna cat/i }).click();
  await page.getByRole("textbox", { name: "Pet name" }).fill(name);
  await page.getByRole("button", { name: /that’s the one/i }).click();
  await page.getByRole("button", { name: /take them home/i }).click();
  await expect(page.getByRole("heading", { name: `${name}'s room` })).toBeVisible();
}

const liveRoom = (page: Page) => page.getByRole("group", { name: /arrow keys turn the room/i });

test("the room comes up in 3D and an emote plays in it", async ({ page }) => {
  await adopt(page);
  await expect(page.locator(".pk-room__flat")).toBeHidden();
  await expect(liveRoom(page)).toBeVisible({ timeout: 45_000 });
  await expect(page.locator(".pk-room__flat")).toBeHidden();
  await page.getByRole("button", { name: "Say" }).click();
  await page.getByRole("button", { name: "Wave" }).click();
  await expect(page.locator(".pk-home__said")).toHaveCount(0);
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
  const candid = await save.getAttribute("href");
  const record = await page.evaluate(() => localStorage.getItem("pawket.pets.v1"));
  await expect(photo.getByRole("radiogroup", { name: "Pose" }).getByRole("radio")).toHaveText(["Candid", "Wave", "Cheer", "Cuddle", "Dance", "Peace", "Heart", "Nice"]);
  await photo.getByRole("radio", { name: "Wave", exact: true }).click();
  await expect(photo.getByRole("radio", { name: "Wave", exact: true })).toHaveAttribute("aria-checked", "true");
  await expect(save).not.toHaveAttribute("href", candid!);
  expect(await page.evaluate(() => localStorage.getItem("pawket.pets.v1"))).toBe(record);
  await photo.getByRole("button", { name: "Close", exact: true }).click();
  await expect(photo).toHaveCount(0);
});

test("a care shows in the room only after it is saved", async ({ page }) => {
  await adopt(page);
  await expect(liveRoom(page)).toBeVisible({ timeout: 45_000 });
  await page.getByRole("button", { name: "Feed" }).click();
  await expect(page.getByText(/Fed\. \+10 XP/)).toBeVisible();
  await expect(page.getByRole("status").filter({ hasText: "You set the bowl down. Pepper eats." })).toBeVisible();
  await expect(page.getByRole("button", { name: /Feed/ })).toBeDisabled();
});

test("the desktop care deck stays clear of the dock on short and tall screens", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await adopt(page);
  for (const width of [1024, 1280]) {
    for (const height of [640, 720, 900]) {
      await page.setViewportSize({ width, height });
      await expect.poll(async () => {
        const deck = (await page.locator(".pk-deck").boundingBox())!;
        const dock = (await page.getByRole("navigation", { name: "Pawket" }).boundingBox())!;
        return dock.y - (deck.y + deck.height);
      }, { message: `Care controls clear the dock at ${width} × ${height}` }).toBeGreaterThanOrEqual(8);
    }
  }
});

test("the flat room is a choice this device remembers", async ({ page }) => {
  test.setTimeout(90_000);
  await adopt(page);
  await expect(liveRoom(page)).toBeVisible({ timeout: 45_000 });
  await page.getByRole("radio", { name: "Flat room" }).click();
  await expect(page.locator(".pk-room__flat")).toBeVisible();
  await expect(liveRoom(page)).toHaveCount(0);
  await expect(page.locator(".pk-room canvas")).toHaveCount(0);
  await expect(page.getByText(/stopped drawing/)).toHaveCount(0);
  await page.getByRole("radio", { name: "3D room" }).click();
  await expect(liveRoom(page)).toBeVisible({ timeout: 45_000 });
  await page.getByRole("radio", { name: "Flat room" }).click();
  await expect(page.locator(".pk-room canvas")).toHaveCount(0);
  await page.reload();
  await expect(page.getByRole("radio", { name: "Flat room" })).toBeChecked();
  await expect(page.locator(".pk-room canvas")).toHaveCount(0);
  await page.getByRole("radio", { name: "3D room" }).click();
  await expect(liveRoom(page)).toBeVisible({ timeout: 45_000 });
});

test("the room is decorated from Home, and a Market room's own thing waits for that room", async ({ page }) => {
  await adopt(page);
  await page.getByRole("radio", { name: "Flat room" }).click();
  await page.getByRole("button", { name: "Decor" }).click();
  const things = page.getByRole("group", { name: /what stands there/ });
  await things.getByRole("button", { name: /^Wall clock/ }).click();
  await expect(things.getByRole("button", { name: /^Wall clock/ })).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator(".pk-room__scene circle[r='23']")).toHaveCount(1);
  await things.getByRole("button", { name: /^Blossom scroll/ }).click();
  await expect(page.getByText(/comes with the Blossom room, in the Market/)).toBeVisible();
  await expect(things.getByRole("button", { name: /^Wall clock/ })).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("radio", { name: "Bed", exact: true }).click();
  await expect(things.getByRole("button", { name: "Nothing" })).toHaveCount(0);
  await things.getByRole("button", { name: /^Cardboard box/ }).click();
  await page.reload();
  await page.getByRole("button", { name: "Decor" }).click();
  await page.getByRole("radio", { name: "Bed", exact: true }).click();
  await expect(page.getByRole("group", { name: /what stands there/ }).getByRole("button", { name: /^Cardboard box/ })).toHaveAttribute("aria-pressed", "true");
});

test("your look is saved on this device and dresses the room", async ({ page }) => {
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
  await page.evaluate(() => {
    const state = JSON.parse(localStorage.getItem("pawket.pets.v1")!);
    state[0].wearing = "knit-beanie";
    localStorage.setItem("pawket.pets.v1", JSON.stringify(state));
  });
  await page.reload();
  await page.locator("summary", { hasText: "How you look" }).click();
  await page.getByRole("tab", { name: "Extras" }).click();
  await page.getByRole("radiogroup", { name: "On your nose" }).getByRole("radio", { name: "Heart glasses" }).click();
  await page.getByRole("button", { name: "Match Pepper" }).click();
  await expect(page.getByText("Matching Pepper.")).toBeVisible();
  await expect(page.getByText(/pool beanie, heart glasses$/)).toBeVisible();
  await page.reload();
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
    await expect(page.getByText("Building the room in 3D")).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Wave" })).toHaveCount(0);
    await expect(page.getByRole("radiogroup", { name: "Room view" })).toHaveCount(0);
    await page.getByRole("button", { name: "Feed" }).click();
    await expect(page.getByText(/Fed\. \+10 XP/)).toBeVisible();
    await page.getByRole("button", { name: "Say" }).click();
    await page.getByRole("button", { name: "Wave" }).click();
    await expect(page.locator(".pk-room__said")).toBeVisible();
    await expect(page.getByRole("status").filter({ hasText: "You wave. Pepper saw." })).toBeVisible();
    await expect(page.locator(".pk-room__said")).toHaveCount(0);
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

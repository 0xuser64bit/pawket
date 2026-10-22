import { expect, test, type Page } from "@playwright/test";

const SCREENS = [
  "/",
  "/adopt",
  "/home",
  "/park",
  "/playground",
  "/profile",
  "/profile?tab=wardrobe",
  "/profile?tab=stickers",
  "/profile?tab=settings",
  "/guilds",
  "/guilds/new",
  "/guilds/sunbeam-club",
  "/guilds/sunbeam-club/coin",
  "/guilds/cloud-nine/coin",
  "/market",
  "/pulse",
  "/wallet",
  "/pet/missing",
  "/pet/11111111111111111111111111111111",
];

async function overflow(page: Page) {
  return page.evaluate(() => {
    const edge = document.documentElement.clientWidth;
    if (document.documentElement.scrollWidth <= edge) return [];
    return Array.from(document.querySelectorAll("body *"))
      .filter((el) => el.getBoundingClientRect().right > edge + 0.5)
      .map((el) => `${el.tagName.toLowerCase()}.${el.getAttribute("class") ?? ""}`)
      .slice(0, 5);
  });
}

for (const width of [320, 375, 768]) {
  test(`nothing scrolls sideways at ${width}px`, async ({ page }) => {
    test.slow();
    await page.setViewportSize({ width, height: 800 });
    for (const path of SCREENS) {
      await test.step(path, async () => {
        await page.goto(path);
        expect(await overflow(page), path).toEqual([]);
      });
    }
  });
}

test("the longest one-word name fits a small phone, and the pets shelf cuts nothing short", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 640 });
  for (const name of ["Pepper", "Wolfeschlegelsteinhausen"]) {
    await page.goto("/adopt");
    await page.getByRole("button", { name: /choose the luna cat/i }).click();
    await page.getByRole("textbox", { name: "Pet name" }).fill(name);
    await page.getByRole("button", { name: /that’s the one/i }).click();
    await expect(page.getByRole("heading", { name: `${name} is yours.` })).toBeVisible();
    expect(await overflow(page), name).toEqual([]);
  }
  for (const width of [320, 375]) {
    await page.setViewportSize({ width, height: 800 });
    await page.goto("/profile#shelf");
    await expect(page.getByRole("button", { name: "Bring home" })).toBeVisible();
    const cut = await page
      .locator(".pk-cards")
      .evaluate((shelf) => Array.from(shelf.querySelectorAll(".pk-btn__label, .pk-chip > span")).filter((el) => el.scrollWidth > el.clientWidth + 1).map((el) => el.textContent));
    expect(cut, `${width}px`).toEqual([]);
    expect(await overflow(page), `${width}px`).toEqual([]);
  }
});

test("the dock keeps every place on a small phone, whichever is lit", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 640 });
  let slots: number[] | undefined;
  for (const path of ["/home", "/park", "/playground", "/market", "/profile", "/guilds"]) {
    await page.goto(path);
    const dock = page.getByRole("navigation", { name: "Pawket" });
    const box = await dock.boundingBox();
    expect(box && box.x >= 0 && box.x + box.width <= 320, path).toBe(true);
    const positions = [];
    for (const place of ["Home", "Park", "Playground", "Market", "Profile", "Guilds"]) {
      const link = dock.getByRole("link", { name: place });
      await expect(link).toBeInViewport();
      await expect(link.getByText(place === "Playground" ? "Play" : place, { exact: true })).toBeVisible();
      const target = (await link.boundingBox())!;
      expect(target.width).toBeGreaterThanOrEqual(44);
      expect(target.height).toBeGreaterThanOrEqual(44);
      positions.push(target.x);
    }
    if (slots) expect(positions).toEqual(slots);
    slots = positions;
  }
});

test("on a desktop the dock floats at the foot, centred, and stays there", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto("/home");
  const dock = page.getByRole("navigation", { name: "Pawket" });
  const box = await dock.boundingBox();
  const frame = await page.locator("html").boundingBox();
  expect(box && frame && Math.abs(box.x + box.width / 2 - (frame.x + frame.width / 2)) <= 1, JSON.stringify({ box, frame })).toBe(true);
  expect(box && 720 - (box.y + box.height)).toBeGreaterThanOrEqual(14);
  expect(box && 720 - (box.y + box.height)).toBeLessThan(24);
  await page.mouse.wheel(0, 2000);
  await expect(dock).toBeInViewport();
  await expect(dock.getByText("Playground")).toBeVisible();
});

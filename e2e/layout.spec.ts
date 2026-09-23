import { expect, test, type Page } from "@playwright/test";

/** Every screen a player can actually open. */
const SCREENS = [
  "/",
  "/adopt",
  "/home",
  "/playground",
  "/inventory",
  "/inventory?tab=wardrobe",
  "/guilds",
  "/pet/missing",
];

/** Whatever sticks out past the right edge, named so a failure says where. */
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
    await page.setViewportSize({ width, height: 800 });
    for (const path of SCREENS) {
      await page.goto(path);
      expect(await overflow(page), path).toEqual([]);
    }
  });
}

test("the dock keeps every place on a small phone, whichever is lit", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 640 });
  for (const path of ["/home", "/playground", "/inventory", "/guilds"]) {
    await page.goto(path);
    const dock = page.getByRole("navigation", { name: "Pawket" });
    const box = await dock.boundingBox();
    expect(box && box.x >= 0 && box.x + box.width <= 320, path).toBe(true);
    for (const place of ["Home", "Playground", "Inventory", "Guilds"]) {
      await expect(dock.getByRole("link", { name: place })).toBeInViewport();
    }
  }
});

test("on a desktop the dock floats at the foot, centred, and stays there", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto("/home");
  const dock = page.getByRole("navigation", { name: "Pawket" });
  const box = await dock.boundingBox();
  expect(box && Math.abs(box.x + box.width / 2 - 640) <= 1).toBe(true);
  expect(box && 720 - (box.y + box.height)).toBeGreaterThanOrEqual(14);
  expect(box && 720 - (box.y + box.height)).toBeLessThan(24);
  await page.mouse.wheel(0, 2000);
  await expect(dock).toBeInViewport();
  await expect(dock.getByText("Playground")).toBeVisible();
});

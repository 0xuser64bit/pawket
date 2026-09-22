import { expect, test, type Page } from "@playwright/test";

/** Every screen, including the ones that only exist as a preview state. */
const SCREENS = [
  "/",
  "/adopt",
  "/home",
  "/market",
  "/market?tab=cosmetics",
  "/market/sesame",
  "/market/sesame/adopt",
  "/market/sesame/done",
  "/pet/pepper",
  "/pet/pepper/ownership",
  "/playground",
  "/playground/meadow-dash",
  "/playground/meadow-dash?state=finding",
  "/inventory",
  "/inventory?tab=cosmetics",
  "/guilds",
  "/guilds/boundary",
  "/guilds/clover",
  "/guilds/clover?tab=treasury",
  "/guilds/clover?tab=policy",
  "/guilds/clover/risks",
  "/guilds/clover/swap",
  "/guilds/clover/swap?state=failed",
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
  for (const path of ["/home", "/playground", "/inventory"]) {
    await page.goto(path);
    const dock = page.getByRole("navigation", { name: "Pawket" });
    const box = await dock.boundingBox();
    expect(box && box.x >= 0 && box.x + box.width <= 320, path).toBe(true);
    for (const place of ["Home", "Market", "Playground", "Inventory", "Guilds"]) {
      await expect(dock.getByRole("link", { name: place })).toBeInViewport();
    }
  }
});

test("on a desktop the dock sits at the top and stays there", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto("/market");
  const dock = page.getByRole("navigation", { name: "Pawket" });
  expect((await dock.boundingBox())?.y).toBeLessThan(80);
  await page.mouse.wheel(0, 2000);
  await expect(dock).toBeInViewport();
});

test("the adopt sheet is a modal that Escape leaves by Cancel's door", async ({ page }) => {
  await page.goto("/market/sesame/adopt");
  const sheet = page.getByRole("dialog", { name: /adopting sesame/i });
  await expect(sheet).toBeFocused();
  // The page behind it cannot be reached while it is open.
  await expect(page.locator("main")).toHaveAttribute("inert", "");
  await page.keyboard.press("Escape");
  await expect(page).toHaveURL(/\/market\/sesame$/);
  await expect(page.getByRole("heading", { name: "Sesame" })).toBeVisible();
});

test("the market's search and filters narrow the fixtures they show", async ({ page }) => {
  await page.goto("/market");
  await page.getByRole("searchbox", { name: "Search the market" }).fill("floppy");
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/q=floppy/);
  await expect(page.getByRole("heading", { name: "Biscuit" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Sesame" })).toHaveCount(0);

  await page.getByRole("link", { name: "Luna cat" }).click();
  await expect(page.getByText("Nothing matches")).toBeVisible();
});

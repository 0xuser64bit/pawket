import { expect, test } from "@playwright/test";

test("profile tabs switch locally, preserve history and support the keyboard", async ({ page }) => {
  await page.goto("/profile#shelf");
  await expect(page.getByRole("tab", { name: "Pets", exact: true })).toHaveAttribute("aria-selected", "true");
  const requests: string[] = [];
  page.on("request", (request) => {
    const headers = request.headers();
    // Visible dock links prefetch independently of tab changes and browser history.
    if (new URL(request.url()).pathname === "/profile" && headers["rsc"] && !headers["next-router-prefetch"]) requests.push(request.url());
  });
  await page.getByRole("tab", { name: "Settings", exact: true }).click();
  await expect(page.getByRole("tabpanel", { name: "Settings" })).toBeVisible();
  await expect(page).toHaveURL(/tab=settings#shelf/);
  await page.getByRole("tab", { name: "Settings", exact: true }).press("ArrowLeft");
  await expect(page.getByRole("tabpanel", { name: "Stickers" })).toBeVisible();
  await page.goBack();
  await expect(page.getByRole("tabpanel", { name: "Settings" })).toBeVisible();
  await page.goBack();
  await expect(page.getByRole("tabpanel", { name: "Pets" })).toBeVisible();
  expect(requests).toEqual([]);
});

test("a place that is slow to arrive says so at the top, and leaves the link as it was", async ({ page }) => {
  let release = () => {};
  const held = new Promise<void>((resolve) => { release = resolve; });
  await page.route((url) => url.pathname === "/guilds" && url.searchParams.has("_rsc"), async (route) => { await held; await route.continue(); });
  await page.goto("/guilds/new");
  const back = page.getByRole("link", { name: "Guilds", exact: true }).filter({ has: page.locator(".pk-btn__label") });
  const bar = page.locator(".pk-nav-progress[data-on]");
  try {
    await back.click();
    await expect(bar).toHaveCount(1);
    // Nothing is painted over the link: its arrow and its word are still there.
    await expect(back).toHaveText("Guilds");
    await expect(back.locator(".pk-spinner")).toHaveCount(0);
  } finally { release(); }
  await expect(page).toHaveURL(/\/guilds$/);
  await expect(bar).toHaveCount(0);
});

test("a guild's whole card is its link, not only its name", async ({ page }) => {
  await page.goto("/guilds");
  const card = page.locator(".pk-guild").first();
  test.skip(!(await card.count()), "Solana did not answer with any guild");
  const href = await card.locator(".pk-guild__name").getAttribute("href");
  // What a finger on the crest presses, once the page has arrived: the guild's own link.
  await expect
    .poll(() =>
      card.evaluate((el) => {
        const crest = el.querySelector(".pk-crest")!.getBoundingClientRect();
        return document.elementFromPoint(crest.x + crest.width / 2, crest.y + crest.height / 2)?.closest("a")?.getAttribute("href");
      }),
    )
    .toBe(href);
});

test("founding shares the normal page rails, and its form keeps a reading measure", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto("/guilds");
  const directory = (await page.getByRole("heading", { name: "Guilds", level: 1 }).boundingBox())!;
  await page.goto("/guilds/new");
  const found = (await page.getByRole("heading", { name: "Found a guild", level: 1 }).boundingBox())!;
  expect(found.x).toBe(directory.x);
  // Beside the guild as it will look, not stretched across the whole place.
  const field = (await page.getByRole("textbox", { name: "Guild name" }).boundingBox())!;
  expect(field.width).toBeLessThan(640);
  expect(field.x).toBeGreaterThan(found.x + 300);
});

test("Home's sound is on until it is muted, and Profile's switch is the same one", async ({ page }) => {
  await page.goto("/home");
  const sound = page.getByRole("button", { name: "Room sound" });
  await expect(sound).toHaveAttribute("aria-pressed", "true");
  await sound.click();
  await expect(sound).toHaveAttribute("aria-pressed", "false");
  await page.goto("/profile?tab=settings#shelf");
  await page.getByRole("button", { name: "Pawket sound off" }).click();
  await page.goto("/home");
  await expect(page.getByRole("button", { name: "Room sound" })).toHaveAttribute("aria-pressed", "true");
});

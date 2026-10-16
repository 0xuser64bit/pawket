import { expect, test } from "@playwright/test";

test("profile tabs switch locally, preserve history and support the keyboard", async ({ page }) => {
  await page.goto("/profile#shelf");
  await expect(page.getByRole("tab", { name: "Pets", exact: true })).toHaveAttribute("aria-selected", "true");
  const requests: string[] = [];
  page.on("request", (request) => { if (new URL(request.url()).pathname === "/profile" && request.headers()["rsc"]) requests.push(request.url()); });
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

test("a delayed back link acknowledges navigation before the destination arrives", async ({ page }) => {
  let release = () => {};
  const held = new Promise<void>((resolve) => { release = resolve; });
  await page.route((url) => url.pathname === "/guilds" && url.searchParams.has("_rsc"), async (route) => { await held; await route.continue(); });
  await page.goto("/guilds/new");
  const back = page.getByRole("link", { name: "Guilds", exact: true }).filter({ has: page.locator(".pk-btn__label") });
  try {
    await back.click();
    await expect(back.getByRole("status")).toContainText("Opening page");
  } finally { release(); }
  await expect(page).toHaveURL(/\/guilds$/);
});

test("founding shares the normal page rails", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto("/home");
  const home = await page.getByRole("main").boundingBox();
  await page.goto("/guilds/new");
  const found = await page.getByRole("main").boundingBox();
  expect(found?.x).toBe(home?.x);
  expect(found?.width).toBe(home?.width);
});

test("Home sound is optional and shares its device setting with Profile", async ({ page }) => {
  await page.goto("/home");
  await page.getByRole("button", { name: "Sound off", exact: true }).click();
  await expect(page.getByRole("button", { name: "Sound on", exact: true })).toHaveAttribute("aria-pressed", "true");
  await page.goto("/profile?tab=settings#shelf");
  await page.getByRole("button", { name: "Pawket sound on" }).click();
  await page.goto("/home");
  await expect(page.getByRole("button", { name: "Sound off", exact: true })).toHaveAttribute("aria-pressed", "false");
});

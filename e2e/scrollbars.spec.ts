import { expect, test } from "@playwright/test";

test.use({
  launchOptions: {
    args: ["--disable-features=OverlayScrollbar"],
    ignoreDefaultArgs: ["--hide-scrollbars"],
  },
  reducedMotion: "reduce",
});

test("classic scrollbars preserve touch targets and dock centring", async ({ page }) => {
  await page.addInitScript(() => {
    document.addEventListener("DOMContentLoaded", () => {
      const style = document.createElement("style");
      style.textContent = "html { overflow-y: scroll; } ::-webkit-scrollbar { width: 15px; height: 15px; }";
      document.head.append(style);
    });
  });
  await page.setViewportSize({ width: 320, height: 700 });
  await page.goto("/adopt");
  await page.getByRole("button", { name: /choose the luna cat/i }).click();
  await page.getByRole("textbox", { name: "Pet name" }).fill("Pepper");
  await page.getByRole("button", { name: /that’s the one/i }).click();
  await page.getByRole("button", { name: /take them home/i }).click();
  await expect(page.getByRole("heading", { name: "Pepper's room" })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.clientWidth)).toBe(305);
  const dock = page.getByRole("navigation", { name: "Pawket" });
  await expect(dock.getByRole("link")).toHaveCount(6);
  for (const link of await dock.getByRole("link").all()) {
    expect.soft((await link.boundingBox())!.width).toBeGreaterThanOrEqual(44);
  }

  await page.goto("/profile#look");
  const tabs = page.getByRole("tablist", { name: "Parts of your look" });
  await expect(tabs).toBeVisible();
  await expect(tabs.getByRole("tab")).toHaveCount(5);
  for (const tab of await tabs.getByRole("tab").all()) {
    expect.soft((await tab.boundingBox())!.width).toBeGreaterThanOrEqual(44);
  }
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(305);

  await page.setViewportSize({ width: 1280, height: 720 });
  expect(await page.evaluate(() => document.documentElement.clientWidth)).toBe(1265);
  for (const overflow of ["scroll", "hidden"]) {
    await page.evaluate((value) => { document.documentElement.style.overflowY = value; }, overflow);
    const box = (await dock.boundingBox())!;
    const frame = (await page.locator("html").boundingBox())!;
    expect(Math.abs(box.x + box.width / 2 - (frame.x + frame.width / 2)), overflow).toBeLessThanOrEqual(1);
  }
});

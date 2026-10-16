import { expect, test, type Page } from "@playwright/test";

/**
 * The pages as the Android app runs them: with `window.PawketAndroid`, which
 * the app injects into Pawket's origin (android/…/PawketBridge.kt). Here a
 * stand-in records what the page asks and answers yes, so the web's half of
 * the bridge is checked in a real browser; the app's half has its own tests
 * and a device procedure (docs/ANDROID.md).
 */
async function inTheApp(page: Page) {
  await page.addInitScript(() => {
    const posted: unknown[] = [];
    const listeners: Array<(event: { data: string }) => void> = [];
    Object.assign(window, {
      posted,
      PawketAndroid: {
        postMessage(message: string) {
          const request = JSON.parse(message);
          posted.push(request);
          if (request.id) setTimeout(() => listeners.forEach((listener) => listener({ data: JSON.stringify({ id: request.id, ok: true }) })));
        },
        addEventListener(_type: string, listener: (event: { data: string }) => void) {
          listeners.push(listener);
        },
      },
    });
  });
}

const asked = (page: Page) => page.evaluate(() => (window as unknown as { posted: Array<{ op: string; kind?: string }> }).posted);

test("the phone Back gesture returns from naming without losing the draft", async ({ page }) => {
  await inTheApp(page);
  await page.goto("/adopt");
  await page.getByRole("button", { name: /choose the luna cat/i }).click();
  await page.getByRole("textbox", { name: "Pet name" }).fill("Pepper");
  await expect.poll(() => page.evaluate(() => typeof window.pawketBack)).toBe("function");
  expect(await page.evaluate(() => window.pawketBack?.())).toBe(true);
  await expect(page.getByRole("heading", { name: "Who is coming home with you?" })).toBeVisible();
  await page.getByRole("button", { name: /choose the luna cat/i }).click();
  await expect(page.getByRole("textbox", { name: "Pet name" })).toHaveValue("Pepper");
});

test("in the app a pet lives in this app, a care is felt, and the bars follow the room", async ({ page }) => {
  const problems: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") problems.push(message.text());
  });
  page.on("pageerror", (error) => problems.push(error.message));
  await inTheApp(page);

  await page.goto("/adopt");
  await page.getByRole("button", { name: /choose the luna cat/i }).click();
  await page.getByRole("textbox", { name: "Pet name" }).fill("Pepper");
  await page.getByRole("button", { name: /that’s the one/i }).click();
  await expect(page.getByText(/Pepper lives in this app\./)).toBeVisible();
  await page.getByRole("button", { name: /take them home/i }).click();

  await expect(page.getByRole("heading", { name: "Pepper's room" })).toBeVisible();
  await expect(page.getByText(/In this app/)).toBeVisible();
  await expect(page.getByText(/In this browser/)).toHaveCount(0);

  await page.getByRole("button", { name: "Feed" }).click();
  await expect(page.getByText(/Fed\. \+10 XP/)).toBeVisible();
  const requests = await asked(page);
  expect(requests).toContainEqual({ op: "haptic", kind: "done" });
  expect(requests.some((request) => request.op === "room")).toBe(true);

  await page.goto("/profile?tab=settings");
  await expect(page.getByRole("button", { name: "Haptics on" })).toBeVisible();
  expect(problems.filter((text) => /hydrat|did not match/i.test(text))).toEqual([]);
});

test("in a browser nothing is asked of a phone, and the words say this browser", async ({ page }) => {
  await page.goto("/adopt");
  await page.getByRole("button", { name: /choose the luna cat/i }).click();
  await page.getByRole("textbox", { name: "Pet name" }).fill("Pepper");
  await page.getByRole("button", { name: /that’s the one/i }).click();
  await page.getByRole("button", { name: /take them home/i }).click();
  await expect(page.getByText(/In this browser/)).toBeVisible();
  await page.goto("/profile?tab=settings");
  await expect(page.getByRole("button", { name: /Pawket sound/ })).toBeVisible();
  await expect(page.getByRole("button", { name: /Haptics/ })).toHaveCount(0);
});

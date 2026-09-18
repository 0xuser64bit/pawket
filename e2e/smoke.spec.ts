import { expect, test } from "@playwright/test";

test("homepage renders the web-first shell", async ({ page }) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: /living companion/i }),
  ).toBeVisible();
  await expect(page.getByText(/devnet by default/i)).toBeVisible();
});

test("health endpoint reports ok", async ({ request }) => {
  const res = await request.get("/api/health");
  expect(res.ok()).toBe(true);
  const body = await res.json();
  expect(body.status).toBe("ok");
  expect(body.service).toBe("pawket-web");
});

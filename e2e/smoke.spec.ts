import { expect, test } from "@playwright/test";

test("homepage renders the web-first shell", async ({ page }) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: /living companion/i }),
  ).toBeVisible();
  await expect(page.getByText(/devnet by default/i)).toBeVisible();
});

test("wallet section offers connection without a wallet installed", async ({
  page,
}) => {
  await page.goto("/");
  // No wallet extension in the test browser: discovery is empty, so the
  // control invites installation instead of failing.
  await expect(
    page.getByRole("button", { name: /connect wallet/i }),
  ).toBeVisible({ timeout: 15_000 });
  await expect(
    page.getByText(/keys never leave the wallet/i),
  ).toBeVisible();
});

test("health endpoint reports ok", async ({ request }) => {
  const res = await request.get("/api/health");
  expect(res.ok()).toBe(true);
  const body = await res.json();
  expect(body.status).toBe("ok");
  expect(body.service).toBe("pawket-web");
});

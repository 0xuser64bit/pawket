import { expect, test } from "@playwright/test";

test("landing renders the hero", async ({ page }) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: /a companion that lives on solana/i }),
  ).toBeVisible();
  await expect(page.getByText(/no wallet needed/i)).toBeVisible();
  await expect(
    page.getByRole("link", { name: /see the daily ritual/i }),
  ).toBeVisible();
});

test("landing shows real product art and the ritual", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByLabel("Three Pawket companions")).toBeVisible();
  for (const act of ["Feed", "Play", "Groom", "Rest"]) {
    await expect(
      page.getByLabel("The daily ritual").getByText(act, { exact: true }),
    ).toBeVisible();
  }
  await expect(page.getByText(/cluster/i)).toBeVisible();
});

test("health endpoint reports ok", async ({ request }) => {
  const res = await request.get("/api/health");
  expect(res.ok()).toBe(true);
  const body = await res.json();
  expect(body.status).toBe("ok");
  expect(body.service).toBe("pawket-web");
});

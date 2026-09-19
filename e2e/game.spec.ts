import { expect, test } from "@playwright/test";

/**
 * M1 game loop, wallet-free: adopt → care → cooldown → persistence.
 * No wallet extension in the test browser, so everything here must work
 * with zero signing. On-chain sends are asserted for presence + gating only.
 */
test("guest loop works end to end without a wallet", async ({ page }) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: /adopt your first companion/i }),
  ).toBeVisible();

  // Invalid names never leave the form: the button stays disabled and an
  // alert explains the rule.
  await page.getByLabel(/name your companion/i).fill("x");
  await page.getByLabel(/name your companion/i).press("Tab");
  await expect(page.getByText(/must be 2–24/)).toBeVisible();
  await expect(
    page.getByRole("button", { name: /^adopt companion$/i }),
  ).toBeDisabled();
  await expect(
    page.getByRole("heading", { name: /adopt your first companion/i }),
  ).toBeVisible();

  // Valid adoption opens the chamber.
  const adoptForm = page.getByRole("form", { name: "Adopt a guest companion" });
  await adoptForm.getByLabel(/name your companion/i).fill("Mochi");
  await adoptForm.getByText("Moss pup").click();
  await adoptForm.getByText("Brave", { exact: true }).click();
  await adoptForm.getByRole("button", { name: /^adopt companion$/i }).click();
  await expect(
    page.getByRole("heading", { name: "Mochi" }),
  ).toBeVisible();
  await expect(page.getByText(/feeling/i)).toBeVisible();

  // Care applies the locked deltas: Feed 72 → 95 fullness.
  await expect(page.getByLabel("Fullness")).toHaveAttribute(
    "aria-valuenow",
    "72",
  );
  await page.getByRole("button", { name: /feed/i }).click();
  await expect(page.getByLabel("Fullness")).toHaveAttribute(
    "aria-valuenow",
    "95",
  );

  // The same action cools down with an honest countdown…
  await expect(page.getByRole("button", { name: /feed/i })).toContainText(
    /ready in \d+:\d\d/i,
  );
  // …while other actions stay available.
  await expect(page.getByRole("button", { name: /^play/i })).toContainText(
    /a good romp/i,
  );

  // The companion survives a reload (localStorage persistence).
  await page.reload();
  await expect(page.getByRole("heading", { name: "Mochi" })).toBeVisible();
  await expect(page.getByLabel("Fullness")).toHaveAttribute(
    "aria-valuenow",
    "95",
  );

  // Start over returns to the adopt form.
  await page.getByRole("button", { name: /start over/i }).click();
  await page.getByRole("button", { name: /say goodbye/i }).click();
  await expect(
    page.getByRole("heading", { name: /adopt your first companion/i }),
  ).toBeVisible();
});

test("on-chain adoption is present but gated without a wallet", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.getByLabel("On-chain adoption")).toBeVisible();
  await expect(
    page.getByRole("button", { name: /adopt on-chain/i }),
  ).toBeDisabled();
});

test("home is honest about scope", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText(/no wallet needed/i).first()).toBeVisible();
  await expect(
    page.getByText(/nothing here spends without your explicit signature/i),
  ).toBeVisible();
  // No ownership or mainnet language anywhere on the page.
  const body = await page.textContent("body");
  expect(body).not.toMatch(/owned/i);
  expect(body).not.toMatch(/mainnet/i);
  expect(body).not.toMatch(/NFT/i);
});

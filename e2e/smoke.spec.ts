import { expect, test } from "@playwright/test";

test("landing leads with the pet and closes with the ledger", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "A pet in your pocket." })).toBeVisible();
  await expect(page.getByText(/no wallet, no token, no solana knowledge needed/i)).toBeVisible();
  await expect(page.getByRole("link", { name: /adopt a pet/i }).first()).toBeVisible();

  // The asset model is on the front page, not a page nobody reads.
  await expect(page.getByRole("heading", { name: "What you actually own" })).toBeVisible();
  await expect(page.getByRole("cell", { name: "Guild token" })).toBeVisible();

  // Optional is stated in the sentence, every time.
  await expect(page.getByText(/joining one adds people to your game/i)).toBeVisible();
});

test("the dock reaches all five places", async ({ page }) => {
  await page.goto("/home");
  const dock = page.getByRole("navigation", { name: "Pawket" });
  for (const place of ["Home", "Market", "Playground", "Inventory", "Guilds"]) {
    await expect(dock.getByRole("link", { name: place })).toBeVisible();
  }
});

test("every product screen says it is a preview", async ({ page }) => {
  for (const path of ["/home", "/market", "/playground", "/inventory", "/guilds"]) {
    await page.goto(path);
    await expect(page.getByText("This is a design preview")).toBeVisible();
  }
});

test("a decision that costs money arrives on Paper", async ({ page }) => {
  await page.goto("/market/sesame");
  await expect(page.getByRole("heading", { name: "Sesame" })).toBeVisible();
  await page.getByRole("link", { name: /adopt sesame/i }).click();

  const sheet = page.getByRole("dialog", { name: /adopting sesame/i });
  await expect(sheet).toBeVisible();
  // Cancel and Pay look alike on purpose — both are Paper buttons.
  await expect(sheet.getByRole("link", { name: "Cancel" })).toHaveClass(/pk-btn--paper/);
  await expect(sheet.getByRole("link", { name: /pay 2.40 sol/i })).toHaveClass(/pk-btn--paper/);
  await expect(sheet.getByText("2.40016 SOL")).toBeVisible();
});

test("the token is never one tap from a guild's front page", async ({ page }) => {
  await page.goto("/guilds/clover");
  await expect(page.getByRole("link", { name: /join the guild/i })).toBeVisible();
  await expect(page.getByText(/free\. no token needed to join/i)).toBeVisible();

  // The only token control reads "Read the risks first".
  await expect(page.getByRole("link", { name: /read the risks first/i })).toBeVisible();
  await expect(page.getByRole("link", { name: /^buy/i })).toHaveCount(0);
});

test("the disclosure gates the swap until it is acknowledged", async ({ page }) => {
  await page.goto("/guilds/clover/risks");
  await expect(page.getByText(/this is not an investment/i)).toBeVisible();
  await expect(page.getByRole("button", { name: "Continue" })).toBeDisabled();

  await page.getByRole("checkbox").check();
  await page.getByRole("link", { name: "Continue" }).click();
  await expect(page.getByRole("heading", { name: "Swap" })).toBeVisible();
});

test("a failed swap names the reason and what did not move", async ({ page }) => {
  await page.goto("/guilds/clover/swap?state=failed");
  await expect(page.getByRole("heading", { name: "It did not go through" })).toBeVisible();
  await expect(page.getByText("Your balance is unchanged.")).toBeVisible();
  await expect(page.getByText("None")).toBeVisible();
});

test("a client timeout is never called a failure", async ({ page }) => {
  await page.goto("/guilds/clover/swap?state=slow");
  await expect(page.getByRole("heading", { name: "Still waiting" })).toBeVisible();
  await expect(page.getByText(/we have not seen it confirm yet/i)).toBeVisible();
});

test("adopting a pet needs no wallet and makes Home real", async ({ page }) => {
  await page.goto("/adopt");
  // Onboarding never mentions a chain, a token or a connect step.
  await expect(page.getByText(/wallet|connect|solana|token/i)).toHaveCount(0);

  await page.getByRole("button", { name: /choose the luna cat/i }).click();
  await page.getByRole("textbox", { name: "Pet name" }).fill("Pepper");
  await page.getByRole("button", { name: /that’s the one/i }).click();
  await expect(page.getByRole("heading", { name: "Pepper is yours." })).toBeVisible();

  await page.getByRole("button", { name: /take them home/i }).click();
  await expect(page.getByText("Today with Pepper")).toBeVisible();
  await expect(page.getByText("Pepper is a guest pet")).toBeVisible();
  // Progress is countable, never a percentage.
  await expect(page.getByText("72 / 100").first()).toBeVisible();
});

test("a short name is refused in words, not in bytes", async ({ page }) => {
  await page.goto("/adopt");
  await page.getByRole("button", { name: /choose the luna cat/i }).click();
  await page.getByRole("button", { name: /that’s the one/i }).click();
  await expect(page.getByText(/a name needs at least two characters/i)).toBeVisible();
});

test("health endpoint reports ok", async ({ request }) => {
  const res = await request.get("/api/health");
  expect(res.ok()).toBe(true);
  const body = await res.json();
  expect(body.status).toBe("ok");
  expect(body.service).toBe("pawket-web");
});

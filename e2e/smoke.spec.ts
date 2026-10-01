import { expect, test } from "@playwright/test";

test("landing leads with the pet and closes with the rules", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "A pet in your pocket." })).toBeVisible();
  await expect(page.getByText(/no wallet, no token, no solana knowledge needed/i)).toBeVisible();
  await expect(page.getByRole("link", { name: /adopt a pet/i }).first()).toBeVisible();

  await expect(page.getByRole("heading", { name: "What you actually own" })).toBeVisible();
  await expect(page.getByRole("cell", { name: "Guild token" })).toBeVisible();
  await expect(page.getByText(/add nothing to a pet/i).first()).toBeVisible();
  await expect(page.getByText(/design preview|demo data/i)).toHaveCount(0);
});

test("the dock reaches the places that exist", async ({ page }) => {
  await page.goto("/home");
  const dock = page.getByRole("navigation", { name: "Pawket" });
  for (const place of ["Home", "Park", "Playground", "Inventory", "Guilds"]) {
    await expect(dock.getByRole("link", { name: place })).toBeVisible();
  }
  await expect(dock.getByRole("link", { name: "Market" })).toHaveCount(0);
});

test("the park is read from Solana, or says plainly that it could not be", async ({ page }) => {
  await page.goto("/park");
  await expect(page.getByRole("heading", { name: "Park" })).toBeVisible();
  await expect(
    page.getByText(/every pet kept on solana, read live|solana did not answer/i).first(),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: /buy|swap|pay/i })).toHaveCount(0);
});

test("an address with no pet is a plain miss, not an error", async ({ page }) => {
  await page.goto("/pet/11111111111111111111111111111111");
  await expect(
    page.getByText(/no pet lives at that address|solana did not answer/i),
  ).toBeVisible();
});

test("a wallet is offered where it does something, and never asked for up front", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("button", { name: /connect/i })).toHaveCount(0);
  await page.goto("/home");
  await expect(page.getByRole("heading", { name: "Already keep a pet on Solana?" })).toBeVisible();
  await page.getByRole("button", { name: "Connect a wallet" }).click();
  const sheet = page.getByRole("dialog", { name: "Connect a wallet" });
  await expect(sheet).toBeVisible();
  await expect(sheet.getByText(/devnet/i).first()).toBeVisible();
  await sheet.getByRole("button", { name: "Not now" }).click();
  await expect(sheet).toHaveCount(0);
});

test("an empty room asks you to adopt and does not pretend to care", async ({ page }) => {
  await page.goto("/home");
  await expect(page.getByRole("heading", { name: "The window is open" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Feed" })).toHaveCount(0);
});

test("guilds are a boundary, not a club you can join", async ({ page }) => {
  await page.goto("/guilds");
  await expect(page.getByRole("heading", { name: "Guilds" })).toBeVisible();
  await expect(page.getByText("Not open")).toBeVisible();
  await expect(page.getByText(/raise a pet/i)).toBeVisible();
  await expect(page.getByRole("link", { name: /join/i })).toHaveCount(0);
  await expect(page.getByRole("button", { name: /buy|swap|pay/i })).toHaveCount(0);
});

test("adopting a pet needs no wallet and makes Home real", async ({ page }) => {
  await page.goto("/adopt");
  await expect(page.getByText(/wallet|connect|solana|token/i)).toHaveCount(0);

  await page.getByRole("button", { name: /choose the luna cat/i }).click();
  await page.getByRole("textbox", { name: "Pet name" }).fill("Pepper");
  await page.getByRole("button", { name: /that’s the one/i }).click();
  await expect(page.getByRole("heading", { name: "Pepper is yours." })).toBeVisible();

  await page.getByRole("button", { name: /take them home/i }).click();
  await expect(page.getByText("Today with Pepper")).toBeVisible();
  await expect(page.getByText("Pepper lives in this browser")).toBeVisible();
  await expect(page.getByText("72 / 100").first()).toBeVisible();

  await page.getByRole("button", { name: "Feed" }).click();
  await expect(page.getByText(/Fed\. \+10 XP/)).toBeVisible();
  await expect(page.getByText("95 / 100")).toBeVisible();
  await expect(page.getByRole("button", { name: /Feed/ })).toBeDisabled();
});

test("a second adoption does not overwrite the pet you have", async ({ page }) => {
  await page.goto("/adopt");
  await page.getByRole("button", { name: /choose the luna cat/i }).click();
  await page.getByRole("textbox", { name: "Pet name" }).fill("Pepper");
  await page.getByRole("button", { name: /that’s the one/i }).click();
  await page.getByRole("button", { name: /take them home/i }).click();
  await expect(page.getByText("Today with Pepper")).toBeVisible();

  await page.goto("/adopt");
  await expect(page.getByRole("heading", { name: "Pepper already lives here." })).toBeVisible();
  await page.getByRole("link", { name: "Keep Pepper" }).click();
  await expect(page.getByText("Today with Pepper")).toBeVisible();
});

test("the wardrobe is worn on the pet, and the record keeps the care", async ({ page }) => {
  await page.goto("/adopt");
  await page.getByRole("button", { name: "Moss pup", exact: true }).click();
  await page.getByRole("button", { name: /choose the moss pup/i }).click();
  await page.getByRole("textbox", { name: "Pet name" }).fill("Nib");
  await page.getByRole("button", { name: /that’s the one/i }).click();
  await page.getByRole("button", { name: /take them home/i }).click();
  await page.getByRole("button", { name: "Brush" }).click();
  await expect(page.getByText(/Brushed\. \+10 XP/)).toBeVisible();

  await page.getByRole("link", { name: "Their record" }).click();
  await expect(page.getByRole("heading", { name: "Nib", exact: true })).toBeVisible();
  await expect(page.getByText("Brushed").first()).toBeVisible();

  await page.goto("/inventory?tab=wardrobe");
  await page.getByRole("button", { name: /Wool scarf/ }).click();
  await expect(page.getByRole("button", { name: /Wool scarf/ })).toHaveAttribute("aria-pressed", "true");

  await page.goto("/home");
  await expect(page.getByText("Wool scarf", { exact: true })).toBeVisible();
});

test("a playground round finishes and keeps a daily bonus", async ({ page }) => {
  await page.goto("/adopt");
  await page.getByRole("button", { name: "Cloud bun", exact: true }).click();
  await page.getByRole("button", { name: /choose the cloud bun/i }).click();
  await page.getByRole("textbox", { name: "Pet name" }).fill("Tuesday");
  await page.getByRole("button", { name: /that’s the one/i }).click();
  await page.getByRole("button", { name: /take them home/i }).click();

  await page.goto("/playground");
  await page.getByRole("button", { name: "Start the round" }).click();
  for (let gate = 0; gate < 4; gate++) {
    await page.getByRole("button", { name: "Next gate" }).click();
  }
  await page.getByRole("button", { name: "Run them" }).click();
  for (let gate = 0; gate < 5; gate++) {
    await page.getByRole("button", { name: "Left" }).click();
  }
  await expect(page.getByText(/Matched \d of 5/)).toBeVisible();
  await expect(page.getByText(/\+25 XP for playing today/)).toBeVisible();
});

test("adoption shows the pet you are making: its name on its blanket, its temperament on its first page", async ({ page }) => {
  await page.goto("/adopt");
  await page.getByRole("button", { name: "Cloud bun", exact: true }).click();
  await expect(page.getByRole("button", { name: "Cloud bun", exact: true })).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: /choose the cloud bun/i }).click();

  await page.getByRole("button", { name: "Mochi" }).click();
  await expect(page.getByRole("textbox", { name: "Pet name" })).toHaveValue("Mochi");
  await expect(page.locator(".pk-adopt__tag")).toHaveText("Mochi");
  await page.getByRole("button", { name: /Mischief/ }).click();
  await expect(page.getByRole("button", { name: /Mischief/ })).toHaveAttribute("aria-pressed", "true");

  await page.getByRole("button", { name: /that’s the one/i }).click();
  await expect(page.getByRole("heading", { name: "Mochi is yours." })).toBeVisible();
  await expect(page.getByText("Their first page")).toBeVisible();
  await expect(page.getByText("Mischief", { exact: true })).toBeVisible();
  await expect(page.getByText("Cloud bun", { exact: true })).toBeVisible();
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

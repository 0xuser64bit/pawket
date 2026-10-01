import { expect, test } from "@playwright/test";
import { createTestWallet } from "./test-wallet";

/**
 * The on-chain path through the real screens, against devnet: a pet adopted
 * in the browser is carried onto Solana by a wallet holding no SOL, fed
 * there, and shows up on its public record. Opt-in, because it spends the
 * sponsor's devnet float and waits on the network:
 *   PAWKET_DEVNET=1 pnpm e2e e2e/chain.spec.ts
 */
test.skip(process.env.PAWKET_DEVNET !== "1", "Set PAWKET_DEVNET=1 to run against devnet.");

const NAMES = ["Biscuit", "Mochi", "Clover", "Juniper", "Waffles", "Pickle", "Noodle", "Sprout"];

test("a browser pet moves onto Solana, is fed there, and has a public record", async ({ page }) => {
  test.setTimeout(240_000);
  const wallet = createTestWallet();
  await page.addInitScript(wallet.script);
  const name = NAMES[Math.floor(Math.random() * NAMES.length)];

  await page.goto("/adopt");
  await page.getByRole("button", { name: "Moss pup", exact: true }).click();
  await page.getByRole("button", { name: /choose the moss pup/i }).click();
  await page.getByRole("textbox", { name: "Pet name" }).fill(name);
  await page.getByRole("button", { name: /that’s the one/i }).click();
  await page.getByRole("button", { name: /take them home/i }).click();
  await expect(page.getByText("In this browser", { exact: true })).toBeVisible();

  await page.getByRole("button", { name: "Connect a wallet" }).click();
  await page.getByRole("dialog", { name: "Connect a wallet" }).getByRole("button", { name: "Pawket Test Wallet" }).click();
  await expect(page.getByRole("button", { name: /wallet .+…/i })).toBeVisible();

  await page.getByRole("button", { name: `Record ${name}` }).click();
  await expect(page.getByText("On Solana", { exact: true })).toBeVisible({ timeout: 120_000 });
  await expect(page.getByText(`${name} lives on Solana`)).toBeVisible();
  // The carry's receipt outlives the card that asked for it.
  await expect(page.getByText(`Record ${name} on Solana`)).toBeVisible();

  await page.getByRole("button", { name: "Feed" }).click();
  await expect(page.getByText(`Feed ${name}`)).toBeVisible({ timeout: 120_000 });
  await expect(page.getByText("Recorded on Solana")).toBeVisible({ timeout: 120_000 });
  await expect(page.getByText("Paid by Pawket")).toBeVisible();
  await expect(page.getByRole("button", { name: /Feed/ })).toBeDisabled();

  await page.getByRole("link", { name: "Their record" }).click();
  await page.waitForURL(/\/pet\/[1-9A-HJ-NP-Za-km-z]{32,44}$/);
  await expect(page.getByRole("heading", { name, exact: true })).toBeVisible({ timeout: 30_000 });
  await expect(page.getByText("On the record")).toBeVisible();
  await expect(page.getByText("Fed", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: `Care for ${name}` })).toBeVisible();
});

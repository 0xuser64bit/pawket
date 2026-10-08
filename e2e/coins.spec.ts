import { expect, test, type Locator, type Page } from "@playwright/test";
import { fund } from "./devnet";
import { createTestWallet } from "./test-wallet";

/**
 * A guild coin's whole trading life through its page, against devnet: a
 * wallet with a little devnet SOL reads what can go wrong, gets a quote,
 * buys on the bonding curve and sells some back, then buys a graduated coin
 * in its DAMM v2 pool — each a signed transaction the player pays for, each
 * said by a toast once Solana has it, the balances read again after.
 * Opt-in, like every devnet spec:
 *   PAWKET_DEVNET=1 pnpm e2e e2e/coins.spec.ts
 */
test.skip(process.env.PAWKET_DEVNET !== "1", "Set PAWKET_DEVNET=1 to run against devnet.");

const toast = (page: Page, title: string) => page.locator(".pk-toast", { hasText: title });

/** Reading what can go wrong: once ticked, the warning folds into a line, and the box is gone. */
async function agree(ticket: Locator) {
  await ticket.getByRole("checkbox", { name: /I have read what can go wrong/ }).click();
  await expect(ticket.getByRole("checkbox")).toHaveCount(0);
}

/** One trade on the open coin page: quote, sign, and wait for Solana. */
async function trade(page: Page, ticket: Locator, side: "Buy" | "Sell", symbol: string, amount: string, route: RegExp) {
  await ticket.getByRole("radio", { name: `${side} ${symbol}` }).click();
  await ticket.getByRole("textbox").fill(amount);
  await ticket.getByRole("button", { name: "See the quote" }).click();
  await expect(ticket.getByText(/^Quoted \d+s ago$/)).toBeVisible({ timeout: 30_000 });
  await expect(ticket.getByText(route)).toBeVisible();
  await ticket.getByRole("button", { name: `Sign: ${side.toLowerCase()} ${symbol}` }).click();
  await expect(toast(page, `${side} ${symbol}`).getByText(/Recorded on Solana, you paid the fee/)).toBeVisible({ timeout: 120_000 });
}

test("a coin on its curve is bought and sold from its page, and a graduated one is bought in its pool", async ({ page }) => {
  test.setTimeout(420_000);
  const wallet = createTestWallet();
  await fund(wallet.address, 150_000_000n);
  await page.addInitScript(wallet.script);

  await page.goto("/guilds/sunbeam-club/coin");
  await page.getByRole("banner").getByRole("button", { name: "Connect", exact: true }).click();
  await page.getByRole("dialog", { name: "Connect a wallet" }).getByRole("button", { name: "Pawket Test Wallet" }).click();
  await page.goto("/wallet");
  await expect(page.getByRole("heading", { name: "Set up your Pawket Wallet" })).toBeVisible({ timeout: 60_000 });
  await page.getByRole("radio", { name: "0.1 SOL", exact: true }).click();
  await page.getByRole("button", { name: "Link this browser" }).click();
  await expect(page.getByText("This browser is linked")).toBeVisible({ timeout: 120_000 });
  await page.goto("/guilds/sunbeam-club/coin");
  const ticket = page.locator(".pk-ticket");
  await expect(ticket.getByText(/^Pawket Wallet: 0\.099 SOL · Your tokens: 0 SUNBEAM$/)).toBeVisible({ timeout: 60_000 });

  // Nothing signs before what can go wrong is read, once for this coin.
  await expect(ticket.getByRole("button", { name: /^Sign:/ })).toHaveCount(0);
  await agree(ticket);

  await trade(page, ticket, "Buy", "SUNBEAM", "0.01", /^Meteora bonding curve$/);
  // The coin is in the wallet now, read again from Solana.
  await expect(ticket.getByText(/^Pawket Wallet: .+ SOL · Your tokens: [1-9][\d,.]* SUNBEAM$/)).toBeVisible({ timeout: 60_000 });
  await trade(page, ticket, "Sell", "SUNBEAM", "1000", /^Meteora bonding curve$/);

  // A graduated coin trades in its pool, after its own warning.
  await page.goto("/guilds/cloud-nine/coin");
  await expect(page.getByText("Active liquidity · DAMM v2").first()).toBeVisible();
  await agree(page.locator(".pk-ticket"));
  await trade(page, page.locator(".pk-ticket"), "Buy", "CLOUD", "0.005", /^Meteora DAMM v2 pool$/);
  await expect(page.locator(".pk-ticket").getByText(/Your tokens: [1-9][\d,.]* CLOUD$/)).toBeVisible({ timeout: 60_000 });
});

import { expect, test, type Page } from "@playwright/test";
import { fund } from "./devnet";
import { createTestWallet } from "./test-wallet";
import { createSolanaRpc, type Address } from "@solana/kit";

/**
 * The on-chain path through the real screens, against devnet: a pet adopted
 * in the browser is carried onto Solana through a funded Pawket Wallet, fed
 * there, shows up on its public record, and its card goes to the wallet. Opt-in, because it spends the
 * sponsor's devnet float and waits on the network:
 *   PAWKET_DEVNET=1 pnpm e2e e2e/chain.spec.ts
 */
test.skip(process.env.PAWKET_DEVNET !== "1", "Set PAWKET_DEVNET=1 to run against devnet.");

const NAMES = ["Biscuit", "Mochi", "Clover", "Juniper", "Waffles", "Pickle", "Noodle", "Sprout"];

test("a browser pet moves onto Solana, is fed there, and has a public record", async ({ page }) => {
  test.setTimeout(240_000);
  const wallet = createTestWallet();
  await fund(wallet.address, 150_000_000n);
  await page.addInitScript(wallet.script);
  const name = NAMES[Math.floor(Math.random() * NAMES.length)];

  await page.goto("/adopt");
  await page.getByRole("button", { name: "Moss pup", exact: true }).click();
  await page.getByRole("button", { name: /choose the moss pup/i }).click();
  await page.getByRole("textbox", { name: "Pet name" }).fill(name);
  await page.getByRole("button", { name: /that’s the one/i }).click();
  await page.getByRole("button", { name: /take them home/i }).click();
  await expect(page.getByText(/In this browser/)).toBeVisible();

  await page.getByRole("banner").getByRole("button", { name: "Connect", exact: true }).click();
  await page.getByRole("dialog", { name: "Connect a wallet" }).getByRole("button", { name: "Pawket Test Wallet" }).click();
  await expect(page.getByRole("button", { name: /^Your wallet, .+…/ })).toBeVisible();

  await page.goto("/wallet");
  await expect(page.getByRole("heading", { name: "Stop the pop-ups" })).toBeVisible({ timeout: 60_000 });
  await page.getByRole("button", { name: "Link this browser" }).click();
  await expect(page.getByText("This browser is linked")).toBeVisible({ timeout: 120_000 });
  await page.goto("/home");
  await page.getByRole("button", { name: `Keep ${name} on Solana` }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Keep on Solana", exact: true }).click();
  await expect(page.getByText("On Solana", { exact: true })).toBeVisible({ timeout: 120_000 });
  // The toast outlives the sheet that asked for it.
  await expect(page.getByText(`Keep ${name} on Solana`).first()).toBeVisible();

  await page.getByRole("button", { name: "Feed" }).click();
  await expect(page.getByText(`Feed ${name}`)).toBeVisible({ timeout: 120_000 });
  await expect(page.getByText(/^Recorded on Solana/).first()).toBeVisible({ timeout: 120_000 });
  await expect(page.getByText(/Recorded on Solana, no pop-up/).first()).toBeVisible();
  await expect(page.getByRole("button", { name: /Feed/ })).toBeDisabled();

  await page.getByRole("link", { name: `${name}'s record` }).click();
  await page.waitForURL(/\/pet\/[1-9A-HJ-NP-Za-km-z]{32,44}$/);
  await expect(page.getByRole("heading", { name, exact: true })).toBeVisible({ timeout: 30_000 });
  // The record's own fold, not the sticker of the same name.
  await expect(page.locator("summary", { hasText: "On the record" })).toBeVisible();
  // The page is read on the server, whose node may be a slot behind the one that confirmed the care.
  await expect(async () => {
    await page.reload();
    await expect(page.getByText("Fed", { exact: true })).toBeVisible({ timeout: 3_000 });
  }).toPass({ timeout: 45_000 });
  await expect(page.getByRole("button", { name: `Care for ${name}` })).toBeVisible();

  // The keepsake: a card in the owner's wallet, made by the server, signed here.
  await page.getByRole("button", { name: "Keep the card" }).click();
  await expect(page.getByText(/^Recorded on Solana/).first()).toBeVisible({ timeout: 120_000 });
  await expect(page.getByText(/Pawket paid the fee/).first()).toBeVisible();
  // Read again from chain, the record now lists it.
  // Read again from the server's node until it has the card; each reload closes the fold, so open it each time.
  await expect(async () => {
    await page.reload();
    await page.locator("summary", { hasText: "On the record" }).click();
    await expect(page.getByText("Keepsake", { exact: true })).toBeVisible({ timeout: 3_000 });
  }).toPass({ timeout: 45_000 });
  await expect(page.getByRole("button", { name: "Keep the card" })).toHaveCount(0);
});

test("a pet on Solana founds a guild, and the guild shows it", async ({ page }) => {
  test.setTimeout(300_000);
  const wallet = createTestWallet();
  await fund(wallet.address, 150_000_000n);
  await page.addInitScript(wallet.script);
  const name = NAMES[Math.floor(Math.random() * NAMES.length)];
  // Test guilds are named so discovery leaves them out (src/lib/guilds/delisted.ts).
  const guild = `Devnet Check ${Date.now().toString(36)}`;

  await page.goto("/adopt");
  await page.getByRole("button", { name: /choose the luna cat/i }).click();
  await page.getByRole("textbox", { name: "Pet name" }).fill(name);
  await page.getByRole("button", { name: /that’s the one/i }).click();
  await page.getByRole("button", { name: /take them home/i }).click();
  await page.getByRole("banner").getByRole("button", { name: "Connect", exact: true }).click();
  await page.getByRole("dialog", { name: "Connect a wallet" }).getByRole("button", { name: "Pawket Test Wallet" }).click();
  await page.goto("/wallet");
  await expect(page.getByRole("heading", { name: "Stop the pop-ups" })).toBeVisible({ timeout: 60_000 });
  await page.getByRole("button", { name: "Link this browser" }).click();
  await expect(page.getByText("This browser is linked")).toBeVisible({ timeout: 120_000 });
  await page.goto("/home");
  await page.getByRole("button", { name: `Keep ${name} on Solana` }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Keep on Solana", exact: true }).click();
  await expect(page.getByText("On Solana", { exact: true })).toBeVisible({ timeout: 120_000 });

  await page.goto("/guilds/new");
  await page.getByRole("textbox", { name: "Guild name" }).fill(guild);
  await page.getByRole("textbox", { name: "Motto" }).fill("Made by the screens test.");
  await page.getByRole("button", { name: new RegExp(`^Found ${guild}`) }).click();
  await page.waitForURL(/\/guilds\/devnet-check-/, { timeout: 120_000 });
  await expect(page.getByRole("heading", { name: guild, exact: true })).toBeVisible({ timeout: 30_000 });
  await expect(page.getByText("1 pet", { exact: true })).toBeVisible();
  // The founder's pet is in the guild's list, and the guild's head says it is in.
  const row = page.getByRole("link", { name: new RegExp(`^${name}`) });
  await expect(row).toBeVisible();
  await expect(page.getByText(`${name} is in`)).toBeVisible();

  // The pet's own record names its guild.
  await row.click();
  await expect(page.getByRole("link", { name: new RegExp(`^In a guild ${guild}`) })).toBeVisible({ timeout: 30_000 });
});

const signedByWallet = (page: Page) => page.evaluate(() => (window as unknown as { __testWalletSigned?: number }).__testWalletSigned ?? 0);

test("Market purchases spend Pawket Wallet and unlock a room and photo frame", async ({ page }) => {
  test.setTimeout(300_000);
  const wallet = createTestWallet();
  await fund(wallet.address, 350_000_000n);
  await page.addInitScript(wallet.script);
  await page.goto("/adopt");
  await page.getByRole("button", { name: /choose the luna cat/i }).click();
  await page.getByRole("textbox", { name: "Pet name" }).fill("Pepper");
  await page.getByRole("button", { name: /that’s the one/i }).click();
  await page.getByRole("button", { name: /take them home/i }).click();
  await page.getByRole("banner").getByRole("button", { name: "Connect", exact: true }).click();
  await page.getByRole("dialog", { name: "Connect a wallet" }).getByRole("button", { name: "Pawket Test Wallet" }).click();
  await page.goto("/wallet");
  await expect(page.getByRole("heading", { name: "Stop the pop-ups" })).toBeVisible({ timeout: 60_000 });
  await page.getByRole("button", { name: "0.25 SOL", exact: true }).click();
  await page.getByRole("button", { name: "Link this browser" }).click();
  await expect(page.getByText("This browser is linked")).toBeVisible({ timeout: 120_000 });
  const rpc = createSolanaRpc(process.env.SOLANA_RPC_URL ?? "https://api.devnet.solana.com");
  const before = (await rpc.getBalance(wallet.address as Address, { commitment: "confirmed" }).send()).value;
  await page.goto("/market");
  for (const [name, price] of [["Starlight", "0.1"], ["Sunshine", "0.025"]]) {
    await page.getByRole("button", { name: new RegExp(`^${name}`) }).click();
    const sheet = page.getByRole("dialog", { name, exact: true });
    await sheet.getByRole("button", { name: `Buy for ${price} SOL` }).click();
    await expect(sheet).toContainText("In your closet", { timeout: 120_000 });
    if (name === "Starlight") {
      await sheet.getByRole("button", { name: "Live in Starlight" }).click();
      await expect(page.locator("html")).toHaveAttribute("data-theme", "starlight");
    }
    await sheet.getByRole("button", { name: "Done", exact: true }).click();
  }
  expect((await rpc.getBalance(wallet.address as Address, { commitment: "confirmed" }).send()).value).toBe(before);
  await page.goto("/home");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "starlight");
  await page.getByRole("button", { name: "Photo", exact: true }).click();
  const photo = page.getByRole("dialog", { name: /A photo:/ });
  await expect(photo.getByRole("combobox", { name: "Photo frame" })).toBeVisible();
  await photo.getByRole("combobox", { name: "Photo frame" }).selectOption("sunshine");
  await expect(photo.getByRole("link", { name: "Save the photo" })).toBeVisible();
  await photo.getByRole("button", { name: "Close", exact: true }).click();
  await page.goto("/wallet");
  await expect(page.getByText("Bought a Market item")).toHaveCount(2, { timeout: 60_000 });
  await expect(page.getByText("0.124 SOL", { exact: true })).toBeVisible();
});

test("a Pawket Wallet links this browser, and a care on Solana asks the wallet nothing", async ({ page }) => {
  test.setTimeout(420_000);
  const wallet = createTestWallet();
  await fund(wallet.address, 150_000_000n);
  await page.addInitScript(wallet.script);
  const name = NAMES[Math.floor(Math.random() * NAMES.length)];

  await page.goto("/adopt");
  await page.getByRole("button", { name: /choose the luna cat/i }).click();
  await page.getByRole("textbox", { name: "Pet name" }).fill(name);
  await page.getByRole("button", { name: /that’s the one/i }).click();
  await page.getByRole("button", { name: /take them home/i }).click();
  await page.getByRole("banner").getByRole("button", { name: "Connect", exact: true }).click();
  await page.getByRole("dialog", { name: "Connect a wallet" }).getByRole("button", { name: "Pawket Test Wallet" }).click();
  await page.goto("/wallet");
  await expect(page.getByRole("heading", { name: "Stop the pop-ups" })).toBeVisible({ timeout: 60_000 });
  await page.getByRole("button", { name: "Link this browser" }).click();
  await expect(page.getByText("This browser is linked")).toBeVisible({ timeout: 120_000 });
  await page.goto("/home");
  await page.getByRole("button", { name: `Keep ${name} on Solana` }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Keep on Solana", exact: true }).click();
  await expect(page.getByText("On Solana", { exact: true })).toBeVisible({ timeout: 120_000 });
  await page.goto("/wallet");
  await expect(page.getByText("0.009 SOL", { exact: true })).toBeVisible();
  await page.goto("/home");
  const before = await signedByWallet(page);
  await page.getByRole("button", { name: "Feed" }).click();
  const careReceipt = page.getByRole("status").filter({ has: page.getByText(`Feed ${name}`, { exact: true }) });
  await expect(careReceipt.getByText(/Recorded on Solana, no pop-up/)).toBeVisible({ timeout: 120_000 });
  expect(await signedByWallet(page)).toBe(before);

  // The history says so, read from Solana.
  await page.goto("/wallet");
  await expect(page.getByText(`Fed ${name}`)).toBeVisible({ timeout: 60_000 });
  await expect(page.getByText(/^Opened · Put in 0\.01 SOL · Linked a device, 0\.001 SOL to it for fees$/)).toBeVisible();

  // Letting go of this browser asks the wallet nothing either; closing gives everything back.
  const beforeUnlink = await signedByWallet(page);
  await page.getByRole("button", { name: "Unlink this browser" }).click();
  await expect(page.getByText("Not linked", { exact: true })).toBeVisible({ timeout: 120_000 });
  expect(await signedByWallet(page)).toBe(beforeUnlink);
  await page.getByRole("button", { name: "Close my Pawket Wallet" }).click();
  await page.getByRole("button", { name: "Close it", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Stop the pop-ups" })).toBeVisible({ timeout: 120_000 });
});

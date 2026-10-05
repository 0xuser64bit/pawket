import { readFileSync } from "node:fs";
import path from "node:path";
import { expect, test, type Page } from "@playwright/test";
import {
  appendTransactionMessageInstruction,
  createKeyPairSignerFromBytes,
  createSolanaRpc,
  createTransactionMessage,
  getBase64EncodedWireTransaction,
  getSignatureFromTransaction,
  pipe,
  setTransactionMessageFeePayerSigner,
  setTransactionMessageLifetimeUsingBlockhash,
  signTransactionMessageWithSigners,
  type Address,
} from "@solana/kit";
import { getTransferSolInstruction } from "@solana-program/system";
import { createTestWallet } from "./test-wallet";

/**
 * The on-chain path through the real screens, against devnet: a pet adopted
 * in the browser is carried onto Solana by a wallet holding no SOL, fed
 * there, shows up on its public record, and its card goes to the wallet. Opt-in, because it spends the
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

  await page.getByRole("banner").getByRole("button", { name: "Connect", exact: true }).click();
  await page.getByRole("dialog", { name: "Connect a wallet" }).getByRole("button", { name: "Pawket Test Wallet" }).click();
  await expect(page.getByRole("button", { name: /wallet .+…/i })).toBeVisible();

  await page.getByRole("button", { name: `Keep ${name} on Solana` }).click();
  await page.getByRole("dialog").getByRole("button", { name: `Keep ${name}`, exact: true }).click();
  await expect(page.getByText("On Solana", { exact: true })).toBeVisible({ timeout: 120_000 });
  // The toast outlives the sheet that asked for it.
  await expect(page.getByText(`Keep ${name} on Solana`).first()).toBeVisible();

  await page.getByRole("button", { name: "Feed" }).click();
  await expect(page.getByText(`Feed ${name}`)).toBeVisible({ timeout: 120_000 });
  await expect(page.getByText(/^Recorded on Solana/).first()).toBeVisible({ timeout: 120_000 });
  await expect(page.getByText(/Pawket paid the fee/).first()).toBeVisible();
  await expect(page.getByRole("button", { name: /Feed/ })).toBeDisabled();

  await page.getByRole("link", { name: `${name}'s record` }).click();
  await page.waitForURL(/\/pet\/[1-9A-HJ-NP-Za-km-z]{32,44}$/);
  await expect(page.getByRole("heading", { name, exact: true })).toBeVisible({ timeout: 30_000 });
  await expect(page.getByText("On the record")).toBeVisible();
  await expect(page.getByText("Fed", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: `Care for ${name}` })).toBeVisible();

  // The keepsake: a card in the owner's wallet, made by the server, signed here.
  await page.getByRole("button", { name: `Keep ${name}'s card` }).click();
  await expect(page.getByText(/^Recorded on Solana/).first()).toBeVisible({ timeout: 120_000 });
  await expect(page.getByText(/Pawket paid the fee/).first()).toBeVisible();
  // Read again from chain, the record now lists it.
  await expect(page.getByText("Keepsake", { exact: true })).toBeVisible({ timeout: 30_000 });
  await expect(page.getByRole("button", { name: `Keep ${name}'s card` })).toHaveCount(0);
});

test("a pet on Solana founds a guild, and the guild shows it", async ({ page }) => {
  test.setTimeout(300_000);
  const wallet = createTestWallet();
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
  await page.getByRole("button", { name: `Keep ${name} on Solana` }).click();
  await page.getByRole("dialog").getByRole("button", { name: `Keep ${name}`, exact: true }).click();
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
  await expect(page.getByText("In a guild")).toBeVisible({ timeout: 30_000 });
  await expect(page.getByRole("link", { name: new RegExp(guild) })).toBeVisible();
});

/** Some devnet SOL for the test wallet, from the sponsor, as a faucet would give it. */
async function fund(address: string, lamports: bigint) {
  const raw = process.env.SPONSOR_KEYPAIR ?? readFileSync(path.join(process.cwd(), ".keys/sponsor.json"), "utf8");
  const sponsor = await createKeyPairSignerFromBytes(Uint8Array.from(JSON.parse(raw) as number[]));
  const rpc = createSolanaRpc(process.env.SOLANA_RPC_URL ?? "https://api.devnet.solana.com");
  const { value: blockhash } = await rpc.getLatestBlockhash({ commitment: "confirmed" }).send();
  const message = pipe(
    createTransactionMessage({ version: "legacy" }),
    (m) => setTransactionMessageFeePayerSigner(sponsor, m),
    (m) => setTransactionMessageLifetimeUsingBlockhash(blockhash, m),
    (m) => appendTransactionMessageInstruction(getTransferSolInstruction({ source: sponsor, destination: address as Address, amount: lamports }), m),
  );
  const signed = await signTransactionMessageWithSigners(message);
  await rpc.sendTransaction(getBase64EncodedWireTransaction(signed), { encoding: "base64" }).send();
  const signature = getSignatureFromTransaction(signed);
  for (let i = 0; i < 60; i++) {
    const { value } = await rpc.getSignatureStatuses([signature]).send();
    if (value[0]?.confirmationStatus === "confirmed" || value[0]?.confirmationStatus === "finalized") return;
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  throw new Error("The test wallet's SOL did not arrive.");
}

const signedByWallet = (page: Page) => page.evaluate(() => (window as unknown as { __testWalletSigned?: number }).__testWalletSigned ?? 0);

test("a Pawket Wallet links this browser, and a care on Solana asks the wallet nothing", async ({ page }) => {
  test.setTimeout(420_000);
  const wallet = createTestWallet();
  await fund(wallet.address, 50_000_000n);
  await page.addInitScript(wallet.script);
  const name = NAMES[Math.floor(Math.random() * NAMES.length)];

  await page.goto("/adopt");
  await page.getByRole("button", { name: /choose the luna cat/i }).click();
  await page.getByRole("textbox", { name: "Pet name" }).fill(name);
  await page.getByRole("button", { name: /that’s the one/i }).click();
  await page.getByRole("button", { name: /take them home/i }).click();
  await page.getByRole("banner").getByRole("button", { name: "Connect", exact: true }).click();
  await page.getByRole("dialog", { name: "Connect a wallet" }).getByRole("button", { name: "Pawket Test Wallet" }).click();
  await page.getByRole("button", { name: `Keep ${name} on Solana` }).click();
  await page.getByRole("dialog").getByRole("button", { name: `Keep ${name}`, exact: true }).click();
  await expect(page.getByText("On Solana", { exact: true })).toBeVisible({ timeout: 120_000 });
  await expect(page.getByText("Each care asks your wallet.")).toBeVisible();

  // One approval opens it, puts a little in and links this browser.
  await page.getByRole("link", { name: "Link this browser" }).click();
  await expect(page.getByRole("heading", { name: "Stop the pop-ups" })).toBeVisible({ timeout: 60_000 });
  await page.getByRole("radio", { name: "0.01 SOL" }).click();
  await page.getByRole("button", { name: "Link this browser" }).click();
  await expect(page.getByText("This browser is linked")).toBeVisible({ timeout: 120_000 });
  await expect(page.getByText("0.009 SOL", { exact: true })).toBeVisible();

  // A care now: signed here, paid from the balance, and the wallet asked nothing.
  await page.getByRole("link", { name: "Home" }).click();
  await expect(page.getByText("Signed by this browser, with no pop-up.")).toBeVisible({ timeout: 60_000 });
  const before = await signedByWallet(page);
  await page.getByRole("button", { name: "Feed" }).click();
  await expect(page.getByText(/^Recorded on Solana/).first()).toBeVisible({ timeout: 120_000 });
  await expect(page.getByText(/Recorded on Solana, no pop-up/)).toBeVisible();
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

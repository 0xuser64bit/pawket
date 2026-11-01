import { expect, test } from "@playwright/test";
import { generateKeyPairSigner, getBase64EncodedWireTransaction, getBase64Encoder, getTransactionDecoder, partiallySignTransaction } from "@solana/kit";
import { dailySeed } from "../src/lib/play/best";
import { dealPairs } from "../src/lib/play/pairs";
import { createTestWallet } from "./test-wallet";

test.use({ reducedMotion: "reduce" });

test("reloading during broadcast recovers the signed receipt without sending again", async ({ page }) => {
  const wallet = createTestWallet();
  const sponsor = await generateKeyPairSigner();
  let broadcasts = 0;
  let recovered = false;
  await page.addInitScript(wallet.script);
  await page.route("**/*", async (route) => {
    const request = route.request();
    if (new URL(request.url()).pathname === "/api/sponsor") {
      if (request.method() === "GET") return route.fulfill({ json: { available: true, address: sponsor.address } });
      const { transaction } = request.postDataJSON() as { transaction: string };
      const signed = await partiallySignTransaction([sponsor.keyPair], getTransactionDecoder().decode(getBase64Encoder().encode(transaction)));
      return route.fulfill({ json: { transaction: getBase64EncodedWireTransaction(signed) } });
    }
    if (request.method() !== "POST" || !request.headers()["content-type"]?.includes("application/json")) return route.continue();
    const rpc = request.postDataJSON() as { id: string; method: string; params: unknown[] };
    const envelope = { jsonrpc: "2.0", id: rpc.id };
    const result = (value: unknown) => route.fulfill({ json: { ...envelope, result: value } });
    const contextual = (value: unknown) => result({ context: { slot: 1 }, value });
    switch (rpc.method) {
      case "getMultipleAccounts": return contextual((rpc.params[0] as string[]).map(() => null));
      case "getBalance": return contextual(0);
      case "getMinimumBalanceForRentExemption": return result(1_000_000);
      case "getProgramAccounts":
      case "getSignaturesForAddress": return result([]);
      case "getLatestBlockhash": return contextual({ blockhash: "11111111111111111111111111111111", lastValidBlockHeight: 1 });
      case "sendTransaction": broadcasts += 1; return;
      case "getSignatureStatuses":
        recovered = true;
        return contextual([{ slot: 1, confirmations: null, confirmationStatus: "finalized", err: null }]);
      default: return route.fulfill({ status: 503, json: { ...envelope, error: { code: -32601, message: `Unexpected local test RPC: ${rpc.method}` } } });
    }
  });
  await page.goto("/wallet");
  await page.getByRole("button", { name: "Connect a wallet", exact: true }).click();
  await page.getByRole("dialog", { name: "Connect a wallet" }).getByRole("button", { name: "Pawket Test Wallet", exact: true }).click();
  await page.getByRole("button", { name: "Link this browser", exact: true }).click();
  await expect.poll(() => broadcasts).toBe(1);
  await expect(page.getByRole("link", { name: "See it on Explorer" })).toBeVisible();
  const receipts = await page.evaluate(() => JSON.parse(sessionStorage.getItem("pawket.pending-sends") ?? "[]") as Array<{ signature: string; sponsored: boolean }>);
  expect(receipts).toHaveLength(1);
  expect(receipts[0].sponsored).toBe(true);
  await page.reload();
  await expect(page.getByText("Recorded on Solana, Pawket paid the fee.", { exact: false })).toBeVisible();
  await expect(page.getByRole("link", { name: "See it on Explorer" })).toHaveAttribute("href", new RegExp(receipts[0].signature));
  expect(await page.evaluate(() => sessionStorage.getItem("pawket.pending-sends"))).toBeNull();
  expect(recovered).toBe(true);
  expect(broadcasts).toBe(1);
});

test("a slow pet-copy file cannot overwrite a newer paste", async ({ page }, testInfo) => {
  await page.goto("/profile");
  await expect(page.getByLabel("Paste a copy")).toBeVisible();
  await page.evaluate(() => {
    const read = File.prototype.text;
    File.prototype.text = async function () {
      await new Promise<void>((resolve) => window.addEventListener("release-copy", () => resolve(), { once: true }));
      return read.call(this);
    };
  });
  await page.locator('input[type="file"]').setInputFiles({ name: "slow.json", mimeType: "application/json", buffer: Buffer.from("older file") });
  const paste = page.getByLabel("Paste a copy");
  await paste.fill("newer paste");
  await page.evaluate(() => window.dispatchEvent(new Event("release-copy")));
  await expect(paste).toHaveValue("newer paste");
  await page.screenshot({ path: testInfo.outputPath("copy-newer-paste.png"), fullPage: true });
});

test("an unreadable copy explains recovery instead of throwing", async ({ page }, testInfo) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/profile");
  await expect(page.getByLabel("Paste a copy")).toBeVisible();
  await page.evaluate(() => {
    File.prototype.text = async () => { throw new Error("File no longer available"); };
  });
  await page.locator('input[type="file"]').setInputFiles({ name: "broken.json", mimeType: "application/json", buffer: Buffer.from("broken") });
  await expect(page.getByRole("alert").filter({ hasText: /could not read that file/i })).toBeVisible();
  await page.getByLabel("Paste a copy").fill("not a copy");
  await page.getByRole("button", { name: "Bring them back" }).click();
  await expect(page.getByRole("alert").filter({ hasText: /not a copy Pawket made/i })).toBeVisible();
  expect(errors).toEqual([]);
  await page.screenshot({ path: testInfo.outputPath("copy-error-recovery.png"), fullPage: true });
});

test("an unresolved receipt survives a reload and keeps its Explorer link", async ({ page }) => {
  const signature = "2".repeat(88);
  let unavailable = true;
  await page.route("**/*", async (route) => {
    if (route.request().method() !== "POST" || !route.request().headers()["content-type"]?.includes("application/json")) return route.continue();
    const request = route.request().postDataJSON() as { id: string; method: string };
    if (request.method === "isBlockhashValid") {
      await route.fulfill({ json: { jsonrpc: "2.0", id: request.id, result: { context: { slot: 1 }, value: false } } });
    } else if (request.method === "getSignatureStatuses") {
      await route.fulfill({ json: unavailable
        ? { jsonrpc: "2.0", id: request.id, error: { code: -32603, message: "Local test RPC outage" } }
        : { jsonrpc: "2.0", id: request.id, result: { context: { slot: 1 }, value: [{ slot: 1, confirmations: null, confirmationStatus: "finalized", err: null }] } } });
    } else await route.continue();
  });
  await page.addInitScript(({ signature }) => {
    if (!sessionStorage.getItem("audit-receipt-seeded")) {
      sessionStorage.setItem("audit-receipt-seeded", "yes");
      sessionStorage.setItem("pawket.pending-sends", JSON.stringify([{ signature, blockhash: "11111111111111111111111111111111", label: "Local test receipt", owner: null }]));
    }
  }, { signature });
  await page.goto("/home");
  await expect(page.getByText("Still waiting", { exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: "See it on Explorer" })).toHaveAttribute("href", new RegExp(signature));
  expect(await page.evaluate(() => JSON.parse(sessionStorage.getItem("pawket.pending-sends") ?? "[]").length)).toBe(1);
  unavailable = false;
  await page.reload();
  await expect(page.getByText(/Recorded on Solana/)).toBeVisible();
  expect(await page.evaluate(() => sessionStorage.getItem("pawket.pending-sends"))).toBeNull();
});

test("a copy restores a finished round even when no care happened", async ({ page }) => {
  await page.goto("/adopt");
  await page.getByRole("button", { name: /choose the luna cat/i }).click();
  await page.getByRole("textbox", { name: "Pet name" }).fill("Pepper");
  await page.getByRole("button", { name: /that’s the one/i }).click();
  await page.getByRole("button", { name: /take them home/i }).click();
  const original = await page.evaluate(() => localStorage.getItem("pawket.pets.v1")!);
  await page.goto("/playground");
  await page.getByRole("button", { name: /^Play Pairs/ }).click();
  const { cards } = dealPairs(dailySeed("pairs", new Date().toISOString().slice(0, 10)));
  const board = page.getByRole("group", { name: /^Pairs\./ });
  for (let face = 0; face < 6; face++) {
    await board.getByRole("button").nth(cards.indexOf(face)).click();
    await board.getByRole("button").nth(cards.lastIndexOf(face)).click();
  }
  await expect(page.getByText(/\+25 XP for playing today/)).toBeVisible();
  const copy = await page.evaluate(() => localStorage.getItem("pawket.pets.v1")!);
  await page.evaluate((original) => localStorage.setItem("pawket.pets.v1", original), original);
  await page.goto("/profile");
  await page.getByText("Bring pets back", { exact: true }).click();
  await page.getByLabel("Paste a copy").fill(copy);
  await page.getByRole("button", { name: "Bring them back" }).click();
  await expect(page.getByRole("status").filter({ hasText: "Pepper came back with a newer record." })).toBeVisible();
  const restored = await page.evaluate(() => JSON.parse(localStorage.getItem("pawket.pets.v1")!)[0]);
  expect(restored).toMatchObject({ plays: 1, xp: 25, statsUpdatedAt: JSON.parse(original)[0].statsUpdatedAt });
});

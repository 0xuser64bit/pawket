import { expect, test } from "@playwright/test";

test.use({ reducedMotion: "reduce" });

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

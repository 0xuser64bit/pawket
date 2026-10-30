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

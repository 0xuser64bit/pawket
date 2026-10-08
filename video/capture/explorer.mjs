// A real Solana Explorer page for one of Mango's care transactions (devnet), captured at phone size.
// Read-only public page; it is shown as Explorer, not as part of the app.
import { chromium, devices } from "../../node_modules/@playwright/test/index.mjs";
const [sig, out] = process.argv.slice(2);
const browser = await chromium.launch();
const ctx = await browser.newContext({ ...devices["Pixel 7"], deviceScaleFactor: 3 });
const page = await ctx.newPage();
await page.goto(`https://explorer.solana.com/tx/${sig}?cluster=devnet`, { waitUntil: "domcontentloaded" });
await page.getByText(/Success|Finalized|Confirmed/i).first().waitFor({ timeout: 60_000 }).catch(() => {});
await page.waitForTimeout(5000);
await page.screenshot({ path: out, fullPage: true });
console.log((await page.locator("body").innerText()).replace(/\n+/g, " | ").slice(0, 1200));
await browser.close();

// Dresses the player in the high-quality capture browser: a beanie and round glasses.
import { chromium } from "../../node_modules/@playwright/test/index.mjs";
import path from "node:path";
const root = path.resolve(new URL("..", import.meta.url).pathname);
const ctx = await chromium.launchPersistentContext(path.join(root, "footage/hq/browser-profile"), { args: ["--use-angle=metal", "--enable-gpu", "--ignore-gpu-blocklist"], viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1.75 });
const page = ctx.pages()[0] ?? (await ctx.newPage());
await page.goto("http://localhost:3000/profile", { waitUntil: "domcontentloaded" });
await page.waitForTimeout(7000);
const summary = page.locator("summary", { hasText: "How you look" });
if (!(await summary.evaluate((s) => s.parentElement.open))) await summary.click();
await page.getByRole("tab", { name: "Extras" }).click();
await page.getByRole("radio", { name: "Beanie" }).click();
await page.getByRole("radiogroup").filter({ hasText: "Shades" }).first().getByRole("radio", { name: "Round glasses" }).click();
await page.waitForTimeout(1500);
console.log(await page.evaluate(() => localStorage.getItem("pawket.player-look.v1")));
await ctx.close();

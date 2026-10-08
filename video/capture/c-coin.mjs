// Take C1: an optional guild coin, glimpsed: Cloud Nine's guild, then its coin page (devnet test
// tokens, no value; what can go wrong). Nothing is traded.
import * as L from "./lib.mjs";
L.demoBar();
const { browser, page } = await L.connect();
await page.goto("http://localhost:3000/guilds");
await L.sleep(1000);
await L.sleep(5000);
const rec = L.recorder("c1-coin");
await L.sleep(1500);
await L.tap(page.getByRole("link", { name: /Cloud Nine/ }).first(), { after: 5000 });
const coinLink = page.locator('a[href="/guilds/cloud-nine/coin"]').first();
await L.scrollTo(page, coinLink, 0.5, 900);
await L.sleep(2000);
await L.tap(coinLink, { after: 5500 });
await L.sleep(1500);
await L.scrollTo(page, page.getByText("Before your first trade"), 0.2, 1000);
await L.sleep(3500);
await L.scrollTo(page, page.locator("summary", { hasText: "What it does, and never does" }), 0.5, 1000);
await L.sleep(2500);
console.log(await rec.stop());
console.log(page.url());
await browser.close().catch(() => {});

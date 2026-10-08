// Take M1: the Market. Looks only, fixed prices; the Halo bought from the Pawket Wallet with the
// owner's approval in the wallet app, into the closet on Solana, then worn by Mango (this app signs).
import * as L from "./lib.mjs";
import { appendFileSync } from "node:fs";
L.demoBar();
let { browser, page } = await L.connect();
const notNow = page.getByRole("button", { name: "Not now" });
if (await notNow.isVisible().catch(() => false)) await L.tap(notNow, { after: 1200 });
await page.evaluate(() => scrollTo(0, 0));
await L.sleep(1200);
const statusText = () => page.evaluate(() => [...document.querySelectorAll("[role=status]")].map((s) => s.innerText).join(" ").replace(/\s+/g, " "));

const rec = L.recorder("m1-market");
await L.sleep(2600);
for (let i = 0; i < 3; i++) await L.swipe([720, 2500], [720, 1300], 900, 900);
await L.scrollTo(page, page.getByRole("button", { name: /^Halo Foil/ }), 0.45, 900);
await L.sleep(1400);
await L.scrollTo(page, page.getByRole("button", { name: /^Starlight Glass/ }), 0.45, 900);
await L.sleep(1800);
await L.scrollTo(page, page.getByRole("button", { name: /^Sunshine Copper/ }), 0.45, 900);
await L.sleep(1800);
const halo = page.getByRole("button", { name: /^Halo Foil/ });
await L.scrollTo(page, halo, 0.45, 900);
await L.sleep(800);
await L.tap(halo, { after: 4200 });
await L.tap(page.getByRole("dialog").getByRole("button", { name: "Buy for 0.05 SOL" }), { after: 300 });
console.log("wallet:", await L.approveInWallet({ hold: 2200 }));
await browser.close().catch(() => {});
({ browser, page } = await L.connect());
for (let i = 0; i < 240 && !(await page.evaluate(() => document.querySelector("[role=dialog]")?.innerText.includes("In your closet"))); i++) await L.sleep(500);
const links = await page.evaluate(() => [...document.querySelectorAll("[role=status] a[href*='explorer']")].map((a) => a.href));
appendFileSync(new URL("../footage/receipts.txt", import.meta.url), `Buy halo: ${links.join(" ")}\n`);
console.log("bought:", await statusText());
await L.sleep(2500);
const buttons = await page.getByRole("dialog").getByRole("button").allInnerTexts();
console.log("sheet buttons:", buttons);
const wear = page.getByRole("dialog").getByRole("button", { name: /put|wear|dress|on mango/i }).first();
if (await wear.isVisible().catch(() => false)) {
  await L.tap(wear, { after: 400 });
  for (let i = 0; i < 240; i++) {
    const t = await statusText();
    if (/Recorded on Solana/.test(t) && /Mango|halo|Halo|Dress|Put/.test(t)) break;
    await L.sleep(500);
  }
  console.log("worn:", await statusText());
  await L.sleep(4000);
}
console.log(await rec.stop());
await browser.close().catch(() => {});

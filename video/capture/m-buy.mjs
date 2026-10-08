// Take M3: the Halo bought in the Market. The price comes from the Pawket Wallet, and the wallet app
// approves it (spending always asks the owner); then it is in the closet on Solana.
import * as L from "./lib.mjs";
import { appendFileSync } from "node:fs";
L.demoBar();
let { browser, page } = await L.connect();
await L.tap(page.getByRole("navigation").getByRole("link", { name: "Market" }), { after: 4500 });
const halo = page.getByRole("button", { name: /^Halo Foil/ });
await L.scrollTo(page, halo, 0.45, 900);
await L.sleep(800);
const rec = L.recorder("m3-buy");
await L.sleep(1800);
await L.tap(halo, { after: 4200 });
await L.tap(page.getByRole("dialog").getByRole("button", { name: "Buy for 0.05 SOL" }), { after: 300 });
console.log("wallet:", await L.approveInWallet({ hold: 2400 }));
await browser.close().catch(() => {});
({ browser, page } = await L.connect());
for (let i = 0; i < 240 && !(await page.evaluate(() => document.querySelector("[role=dialog]")?.innerText.includes("In your closet"))); i++) await L.sleep(500);
const links = await page.evaluate(() => [...document.querySelectorAll("[role=status] a[href*='explorer']")].map((a) => a.href));
appendFileSync(new URL("../footage/receipts.txt", import.meta.url), `Buy halo (m3): ${links.join(" ")}\n`);
await L.sleep(4500);
console.log(await rec.stop());
console.log(await page.evaluate(() => document.querySelector("[role=dialog]")?.innerText.replace(/\s+/g, " ").slice(0, 300)));
await browser.close().catch(() => {});

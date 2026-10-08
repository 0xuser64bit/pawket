// Take K4: Mango's public Passport, read from chain; then the keepsake card, which the wallet app
// approves (it goes into that wallet), Pawket paying the fee and the rent.
import * as L from "./lib.mjs";
import { appendFileSync } from "node:fs";
L.demoBar();
let { browser, page } = await L.connect();
await page.evaluate(() => scrollTo(0, 0));
await L.sleep(800);
const rec = L.recorder("k4-passport");
await L.sleep(2500);
for (const heading of ["Last cares", "Guestbook", "Stickers", "Mango's card, in your wallet"]) {
  await L.scrollTo(page, page.getByRole("heading", { name: heading }), 0.3, 900);
  await L.sleep(1800);
}
const keep = page.getByRole("button", { name: "Keep the card" });
await L.scrollTo(page, keep, 0.6, 700);
await L.sleep(1200);
await L.tap(keep, { after: 300 });
console.log("wallet:", await L.approveInWallet({ hold: 2000 }));
await browser.close().catch(() => {});
({ browser, page } = await L.connect());
for (let i = 0; i < 240; i++) {
  const t = await page.evaluate(() => [...document.querySelectorAll("[role=status]")].map((s) => s.innerText).join(" "));
  if (t.includes("Keep Mango's card") && t.includes("Recorded on Solana")) { console.log(t.replace(/\s+/g, " ")); break; }
  await L.sleep(500);
}
const links = await page.evaluate(() => [...document.querySelectorAll("[role=status] a[href*='explorer']")].map((a) => a.href));
appendFileSync(new URL("../footage/receipts.txt", import.meta.url), `Keepsake: ${links.join(" ")}\n`);
await L.sleep(6000);
console.log(await rec.stop());
console.log((await page.evaluate(() => document.querySelector("main").innerText)).split("Mango's card")[1]?.slice(0, 500));
await browser.close().catch(() => {});

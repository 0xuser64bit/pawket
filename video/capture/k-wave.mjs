// Take K5: from the Park, Mango's owner waves at another pet; this app signs, Pawket pays the fee.
import * as L from "./lib.mjs";
import { appendFileSync } from "node:fs";
L.demoBar();
const { browser, page } = await L.connect();
await page.evaluate(() => scrollTo(0, 0));
const rec = L.recorder("k5-wave");
await L.sleep(2500);
await L.tap(page.getByRole("link", { name: "Marmalade", exact: true }).first(), { after: 5500 });
const wave = page.getByRole("button", { name: "Wave at Marmalade" });
await L.scrollTo(page, page.getByRole("heading", { name: "Guestbook" }), 0.3, 900);
await L.sleep(1500);
await L.tap(wave, { after: 400 });
for (let i = 0; i < 240; i++) {
  const t = await page.evaluate(() => [...document.querySelectorAll("[role=status]")].map((s) => s.innerText).join(" "));
  if (t.includes("Wave at Marmalade") && t.includes("Recorded on Solana")) { console.log(t.replace(/\s+/g, " ")); break; }
  await L.sleep(400);
}
const links = await page.evaluate(() => [...document.querySelectorAll("[role=status] a[href*='explorer']")].map((a) => a.href));
appendFileSync(new URL("../footage/receipts.txt", import.meta.url), `Wave: ${links.join(" ")}\n`);
await L.sleep(6000);
console.log(await rec.stop());
console.log((await page.evaluate(() => document.querySelector("main").innerText)).split("Guestbook")[1]?.slice(0, 300));
await browser.close().catch(() => {});

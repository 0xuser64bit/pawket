// Take K6: cares on Solana with the room at full quality: each signed by this phone (no pop-up),
// confirmed, and only then its moment.
import * as L from "./lib.mjs";
import { appendFileSync } from "node:fs";
L.demoBar();
const { browser, page } = await L.connect();
await page.evaluate(() => scrollTo(0, 0));
const statusText = () => page.evaluate(() => [...document.querySelectorAll("[role=status]")].map((s) => s.innerText).join(" ").replace(/\s+/g, " "));
const rec = L.recorder("k6-care");
await L.sleep(2500);
for (const care of ["Play", "Rest"]) {
  await L.tap(page.getByRole("button", { name: care, exact: true }), { after: 400 });
  // This care's own toast, recorded — not an earlier one still on screen.
  const mine = () => page.evaluate((label) => [...document.querySelectorAll("[role=status]")].some((s) => s.innerText.includes(label) && s.innerText.includes("Recorded on Solana")), `${care} Mango`);
  for (let i = 0; i < 300 && !(await mine()); i++) await L.sleep(300);
  const links = await page.evaluate(() => [...document.querySelectorAll("[role=status] a[href*='explorer']")].map((a) => a.href));
  appendFileSync(new URL("../footage/receipts.txt", import.meta.url), `${care} (k6): ${links.join(" ")}\n`);
  await L.sleep(8500);
}
console.log(await rec.stop());
console.log(await page.evaluate(() => [...document.querySelectorAll("canvas")].map((c) => c.width + "x" + c.height).join(",")), await statusText());
await browser.close().catch(() => {});

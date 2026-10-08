// Take K3: cares on Solana, one after another, each confirmed before its moment, no wallet pop-up.
import * as L from "./lib.mjs";
import { appendFileSync } from "node:fs";
L.demoBar();
const { browser, page } = await L.connect();
await page.evaluate(() => scrollTo(0, 0));
const receipts = () => page.evaluate(() => [...document.querySelectorAll("[role=status] a[href*='explorer']")].map((a) => a.href));
const rec = L.recorder("k3-care");
await L.sleep(1500);
for (const care of ["Play", "Brush"]) {
  await L.tap(page.getByRole("button", { name: care, exact: true }), { after: 400 });
  for (let i = 0; i < 240; i++) {
    const t = await page.evaluate(() => [...document.querySelectorAll("[role=status]")].map((s) => s.innerText).join(" "));
    if (t.includes("Recorded on Solana")) break;
    await L.sleep(400);
  }
  const links = await receipts();
  appendFileSync(new URL("../footage/receipts.txt", import.meta.url), `${care}: ${links.join(" ")}\n`);
  await L.sleep(7500);
}
console.log(await rec.stop());
console.log(await receipts());
await browser.close().catch(() => {});

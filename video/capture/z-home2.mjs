// Take Z2: Home at the top of the page — Mango on Solana in the Halo, the player in the new look —
// the room living on its own, at full quality.
import * as L from "./lib.mjs";
L.demoBar();
const { browser, page } = await L.connect();
await page.evaluate(() => scrollTo(0, 0));
await L.sleep(1500);
const rec = L.recorder("z2-home");
await L.sleep(12000);
console.log(await rec.stop());
console.log(await page.evaluate(() => [...document.querySelectorAll("canvas")].map((c) => c.width + "x" + c.height).join(",")));
await browser.close().catch(() => {});

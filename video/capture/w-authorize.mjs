// Take W2: the wallet app authorizes Pawket (no signature), and the app reads the connected wallet.
import * as L from "./lib.mjs";
L.demoBar();
const rec = L.recorder("w2-authorize");
await L.sleep(1500);
L.sh("input tap 278 1306");
await L.sleep(5000);
const { browser, page } = await L.connect();
await L.sleep(1500);
console.log(await rec.stop());
console.log(await page.evaluate(() => [...document.querySelectorAll("button")].map((b) => b.getAttribute("aria-label") || b.innerText).filter((t) => /wallet|…/i.test(t)).join(" | ")));
await browser.close().catch(() => {});

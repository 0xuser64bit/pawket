// Take W3: the Pawket Wallet, and its history read from Solana: what this app signed with no
// pop-up, and what the wallet app approved.
import * as L from "./lib.mjs";
L.demoBar();
const { browser, page } = await L.connect();
await page.goto("http://localhost:3000/wallet");
await L.sleep(7000);
const rec = L.recorder("w3-history");
await L.sleep(2500);
await L.scrollTo(page, page.getByText("This app", { exact: true }).first(), 0.2, 900);
await L.sleep(2500);
await L.scrollTo(page, page.getByText("Where it went", { exact: true }), 0.12, 1000);
await L.sleep(2000);
for (let i = 0; i < 3; i++) await L.swipe([720, 2500], [720, 1500], 1100, 1600);
console.log(await rec.stop());
console.log((await page.evaluate(() => document.querySelector("main").innerText)).split("HISTORY")[1]?.slice(0, 1600));
await browser.close().catch(() => {});

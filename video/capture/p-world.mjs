// Take P1: the wider world. The Park (every pet on Solana, read live; Mango out today), what just
// happened, then Pulse: everything the program holds, counted live.
import * as L from "./lib.mjs";
L.demoBar();
const { browser, page } = await L.connect();
await page.evaluate(() => scrollTo(0, 0));
await L.sleep(1500);
const rec = L.recorder("p1-world");
await L.sleep(3500);
await L.scrollTo(page, page.getByText("Lately", { exact: true }), 0.15, 1000);
await L.sleep(3000);
await L.scrollTo(page, page.getByText("Everyone", { exact: true }), 0.12, 1000);
await L.sleep(2500);
await page.evaluate(() => scrollTo({ top: 0, behavior: "smooth" }));
await L.sleep(1800);
await L.tap(page.getByRole("link", { name: "Pawket's pulse" }), { after: 5000 });
for (let i = 0; i < 4; i++) await L.swipe([720, 2500], [720, 1500], 1000, 1700);
await L.sleep(1500);
console.log(await rec.stop());
console.log((await page.evaluate(() => document.querySelector("main").innerText)).slice(0, 1500));
await browser.close().catch(() => {});

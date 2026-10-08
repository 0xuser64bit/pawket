// Take K2: Mango is kept on Solana. This app's linked key signs (no wallet pop-up), Pawket pays the
// fee, and the room says "On Solana" only once it is read from chain. Then a care, confirmed first.
import * as L from "./lib.mjs";
L.demoBar();
const { browser, page } = await L.connect();
const toasts = () => page.evaluate(() => [...document.querySelectorAll("[role=status]")].map((t) => t.innerText.replace(/\s+/g, " ")).join(" | "));

const rec = L.recorder("k2-keep");
await L.sleep(1500);
await L.tap(page.getByRole("link", { name: /back to your pets/i }).or(page.getByRole("button", { name: /back to your pets/i })).first(), { after: 4000 });
await page.evaluate(() => scrollTo(0, 0));
await L.sleep(1200);
await L.tap(page.getByRole("button", { name: "Keep Mango on Solana" }), { after: 3800 });
await L.tap(page.getByRole("dialog").getByRole("button", { name: "Keep on Solana", exact: true }), { after: 500 });
const t0 = Date.now();
for (let i = 0; i < 240; i++) {
  if ((await page.evaluate(() => document.body.innerText.includes("On Solana"))) && (await toasts()).includes("Recorded on Solana")) break;
  await L.sleep(500);
}
console.log("kept after", (Date.now() - t0) / 1000, "s:", await toasts());
await L.sleep(5000);
const feed = page.getByRole("button", { name: "Feed", exact: true });
console.log("feed enabled:", await feed.isEnabled().catch(() => "?"));
if (await feed.isEnabled().catch(() => false)) {
  await L.tap(feed, { after: 500 });
  for (let i = 0; i < 240 && !(await toasts()).includes("Recorded on Solana"); i++) await L.sleep(500);
  console.log("fed:", await toasts());
  await L.sleep(7000);
}
console.log(await rec.stop());
console.log((await page.evaluate(() => document.querySelector("main").innerText)).slice(0, 700));
await browser.close().catch(() => {});

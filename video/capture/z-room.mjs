// Take Z1: Mango at home on Solana, wearing the Halo, in 3D; the room's own life, then emotes.
import * as L from "./lib.mjs";
L.demoBar();
const { browser, page } = await L.connect();
await page.reload();
await L.sleep(6000);
if (!(await page.getByRole("heading", { name: "Say something" }).isVisible().catch(() => false))) {
  await L.scrollTo(page, page.getByRole("button", { name: "Say", exact: true }), 0.5);
  await L.tap(page.getByRole("button", { name: "Say", exact: true }), { after: 1200 });
}
await L.scrollTo(page, page.getByRole("radio", { name: "3D room" }), 0.06, 600);
await L.sleep(1500);
const rec = L.recorder("z1-room");
await L.sleep(5000);
for (const [emote, wait] of [["Wave", 4500], ["Dance", 7000], ["Cheer", 5000], ["Pet", 5500], ["Treat", 5500]]) {
  await L.tap(page.getByRole("button", { name: emote, exact: true }), { after: wait });
}
await L.sleep(3000);
console.log(await rec.stop());
await browser.close().catch(() => {});

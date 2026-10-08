// Take C: Say (emotes play in the room and change nothing on the record), then Today.
import * as L from "./lib.mjs";
L.demoBar();
const { browser, page } = await L.connect();
if (!(await page.getByRole("heading", { name: "Say something" }).isVisible().catch(() => false))) {
  await L.scrollTo(page, page.getByRole("button", { name: "Say", exact: true }), 0.5);
  await L.tap(page.getByRole("button", { name: "Say", exact: true }), { after: 1200 });
}
const room = page.getByRole("radio", { name: "3D room" });
await L.scrollTo(page, room, 0.06, 600);
const rec = L.recorder("c-say");
await L.sleep(1500);
for (const [emote, wait] of [["Wave", 4200], ["Dance", 6500], ["Treat", 5500], ["Cheer", 4500]]) {
  await L.tap(page.getByRole("button", { name: emote, exact: true }), { after: wait });
}
await L.tap(page.getByRole("button", { name: "Today", exact: true }), { after: 4000 });
console.log(await rec.stop());
await browser.close().catch(() => {});

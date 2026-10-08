// Take D: a photo snapped mid-dance, printed on the room's paper, then the phone's own share sheet.
import * as L from "./lib.mjs";
L.demoBar();
const { browser, page } = await L.connect();
if (!(await page.getByRole("heading", { name: "Say something" }).isVisible().catch(() => false))) {
  await L.scrollTo(page, page.getByRole("button", { name: "Say", exact: true }), 0.5);
  await L.tap(page.getByRole("button", { name: "Say", exact: true }), { after: 1200 });
}
await L.scrollTo(page, page.getByRole("radio", { name: "3D room" }), 0.06, 600);
const rec = L.recorder("d-photo");
await L.sleep(1200);
await L.tap(page.getByRole("button", { name: "Dance", exact: true }), { after: 1900 });
await L.tap(page.getByRole("button", { name: "Photo", exact: true }), { after: 3800 });
await L.tap(page.getByRole("button", { name: "Share", exact: true }), { after: 4200 });
L.sh("input keyevent KEYCODE_BACK");
await L.sleep(1500);
await L.tap(page.getByRole("link", { name: "Save the photo" }).or(page.getByRole("button", { name: "Save the photo" })), { after: 2500 });
await L.tap(page.getByRole("button", { name: "Close", exact: true }), { after: 1500 });
console.log(await rec.stop());
await browser.close().catch(() => {});

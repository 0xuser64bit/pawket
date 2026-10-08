// Take B: the four cares, each saved and then shown as a moment in the room; today's round fills.
import * as L from "./lib.mjs";
L.demoBar();
const { browser, page } = await L.connect();
const rec = L.recorder("b-care");
await L.sleep(2500);
for (const [care, wait] of [["Feed", 6500], ["Play", 7500], ["Brush", 7000], ["Rest", 7500]]) {
  await L.tap(page.getByRole("button", { name: care, exact: true }), { after: wait });
}
await L.scrollTo(page, page.getByRole("heading", { name: "Today's round" }), 0.62, 700);
await L.sleep(3000);
console.log(await rec.stop());
await browser.close().catch(() => {});

// Take F: a household of three; choosing who is at home, on Home.
import * as L from "./lib.mjs";
L.demoBar();
const { browser, page } = await L.connect();
const rec = L.recorder("f-switch");
await L.sleep(2500);
await L.tap(page.getByRole("button", { name: "Bring Pretzel home" }), { after: 4500 });
await L.tap(page.getByRole("button", { name: "Bring Mango home" }), { after: 4500 });
console.log(await rec.stop());
await browser.close().catch(() => {});

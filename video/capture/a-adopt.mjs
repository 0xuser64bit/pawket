// Take A: a fresh install opens, the boot splash draws the paw, and Mango is adopted with no wallet.
import * as L from "./lib.mjs";

L.sh("pm clear app.pawket.android.debug");
L.demoBar();
L.adb("reverse", "tcp:3000", "tcp:3000");
await L.sleep(1500);
L.sh("am start -n app.pawket.android.debug/app.pawket.android.MainActivity");
await L.sleep(9000);
const { browser, page } = await L.connect();
await page.getByRole("link", { name: "Adopt a pet" }).waitFor();
await L.sleep(3000);
const rec = L.recorder("a-adopt");
await L.sleep(2500);
await L.tap(page.getByRole("link", { name: "Adopt a pet" }), { after: 2200 });

// Browse the three, then land back on the Luna cat.
const luna = page.getByRole("button", { name: "Luna cat", exact: true });
const [lx, ly] = await L.at(luna);
await L.swipe([1150, ly], [350, ly], 320, 1500);
await L.swipe([1150, ly], [350, ly], 320, 1500);
await L.swipe([350, ly], [1150, ly], 320, 900);
await L.swipe([350, ly], [1150, ly], 320, 1400);
await L.tap(page.getByRole("button", { name: /choose the luna cat/i }), { after: 1800 });

await L.tap(page.getByRole("textbox", { name: "Pet name" }), { after: 900 });
await L.type("Mango", 260);
await L.sleep(1400);
await L.tap(page.getByRole("button", { name: /^Curious/ }), { after: 1200 });
await L.tap(page.getByRole("button", { name: /that’s the one/i }), { after: 3200 });
await L.tap(page.getByRole("button", { name: /take them home/i }), { after: 7000 });
console.log(await rec.stop());
await browser.close().catch(() => {});

// Take M2: the bought Halo goes on from the wardrobe (this app signs dress_owned, no pop-up),
// then Mango wears it at home, in 3D.
import * as L from "./lib.mjs";
import { appendFileSync } from "node:fs";
L.demoBar();
const { browser, page } = await L.connect();
const done = page.getByRole("button", { name: "Done", exact: true });
if (await done.isVisible().catch(() => false)) await L.tap(done, { after: 1500 });
const statusText = () => page.evaluate(() => [...document.querySelectorAll("[role=status]")].map((s) => s.innerText).join(" ").replace(/\s+/g, " "));

const rec = L.recorder("m2-wear");
await L.sleep(1500);
await L.tap(page.getByRole("navigation").getByRole("link", { name: "Profile" }), { after: 3500 });
await L.scrollTo(page, page.getByRole("heading", { name: "What you keep" }), 0.12, 800);
await L.tap(page.getByRole("link", { name: "Wardrobe" }), { after: 2500 });
const halo = page.getByRole("button", { name: /^Halo/ }).first();
await L.scrollTo(page, halo, 0.62, 800);
await L.sleep(1200);
await L.tap(halo, { after: 400 });
for (let i = 0; i < 240 && !/Put the halo on Mango[^|]*Recorded on Solana/.test(await statusText()); i++) await L.sleep(500);
console.log("worn:", await statusText());
const links = await page.evaluate(() => [...document.querySelectorAll("[role=status] a[href*='explorer']")].map((a) => a.href));
appendFileSync(new URL("../footage/receipts.txt", import.meta.url), `Wear halo: ${links.join(" ")}\n`);
await L.scrollTo(page, page.getByRole("heading", { name: "What you keep" }), 0.12, 800);
await L.sleep(3000);
await L.tap(page.getByRole("navigation").getByRole("link", { name: "Home" }), { after: 9000 });
console.log(await rec.stop());
await browser.close().catch(() => {});

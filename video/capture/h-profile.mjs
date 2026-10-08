// Take H: the profile. A name, a new look on the 3D player, an outfit kept, then the shelf:
// every pet, the wardrobe's mirror and the sticker book read from each record.
import * as L from "./lib.mjs";
L.demoBar();
const { browser, page } = await L.connect();
if (!page.url().includes("/profile")) await page.goto("http://localhost:3000/profile");
await L.sleep(2500);
const fold = page.locator("details", { has: page.locator("summary", { hasText: "How you look" }) });
if (await fold.evaluate((d) => d.open)) await L.tap(page.locator("summary", { hasText: "How you look" }), { after: 800 });
await page.evaluate(() => scrollTo(0, 0));
await L.sleep(1500);

const rec = L.recorder("h-profile");
await L.sleep(2000);
await L.tap(page.getByRole("textbox", { name: "Your name" }), { after: 600 });
await L.type("Ari", 230);
L.sh("input keyevent KEYCODE_ENTER");
await L.sleep(1400);

const summary = page.locator("summary", { hasText: "How you look" });
await L.scrollTo(page, summary, 0.25, 600);
await L.tap(summary, { after: 1200 });
await L.tap(page.getByRole("tab", { name: "Extras" }), { after: 1200 });
await L.tap(page.getByRole("radio", { name: "Beanie" }), { after: 1300 });
const eyes = page.getByRole("radiogroup").filter({ hasText: "Shades" }).first();
await L.scrollTo(page, eyes, 0.5, 600);
await L.tap(eyes.getByRole("radio", { name: "Round glasses" }), { after: 1300 });
await page.evaluate(() => scrollTo({ top: 0, behavior: "smooth" })); // up to the stage, to see the new look
await L.sleep(3200);
await L.scrollTo(page, page.getByRole("button", { name: "Keep this look" }).first(), 0.55, 600);
await L.tap(page.getByRole("button", { name: "Keep this look" }).first(), { after: 1800 });

const shelf = page.getByRole("heading", { name: "What you keep" });
await L.scrollTo(page, shelf, 0.12, 600);
await L.sleep(2200);
await L.tap(page.getByRole("link", { name: "Wardrobe" }), { after: 2200 });
const scarf = page.getByRole("button", { name: /wool scarf/i }).first();
await L.scrollTo(page, scarf, 0.6, 600);
await L.tap(scarf, { after: 2400 });
await L.scrollTo(page, shelf, 0.12, 600);
await L.tap(page.getByRole("link", { name: "Stickers" }), { after: 3200 });
console.log(await rec.stop());
await browser.close().catch(() => {});

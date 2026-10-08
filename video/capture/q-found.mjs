// Take Q1: guild discovery, then Mango founds a guild. This app signs found_guild (no pop-up); the
// sponsor pays the fee and the rent.
import * as L from "./lib.mjs";
L.demoBar();
const { browser, page } = await L.connect();
const statusText = () => page.evaluate(() => [...document.querySelectorAll("[role=status]")].map((s) => s.innerText).join(" ").replace(/\s+/g, " "));

const rec = L.recorder("q1-found");
await L.sleep(1200);
await L.tap(page.getByRole("navigation").getByRole("link", { name: "Guilds" }), { after: 4500 });
await L.swipe([720, 2400], [720, 1500], 900, 1800);
await L.swipe([720, 1500], [720, 2400], 900, 1200);
await L.tap(page.getByRole("link", { name: /found a guild/i }).or(page.getByRole("button", { name: /found a guild/i })).first(), { after: 3000 });
await L.tap(page.getByRole("textbox", { name: "Guild name" }), { after: 500 });
await L.type("Window Seat", 120);
await L.sleep(500);
await L.tap(page.getByRole("textbox", { name: "Motto" }), { after: 500 });
await L.type("Sunbeams are better shared.", 70);
await L.sleep(700);
const star = page.locator(".pk-crest-pick", { hasText: "star" });
await L.scrollTo(page, star, 0.4, 700);
await L.tap(star, { after: 1400 });
const found = page.getByRole("button", { name: /^Found Window Seat/ });
await L.scrollTo(page, found, 0.6, 700);
await L.sleep(1500);
await L.tap(found, { after: 400 });
for (let i = 0; i < 300 && !page.url().includes("/guilds/window-seat"); i++) await L.sleep(500);
console.log("at", page.url(), await statusText());
await L.sleep(6000);
console.log(await rec.stop());
console.log((await page.evaluate(() => document.querySelector("main").innerText)).slice(0, 1500));
await browser.close().catch(() => {});

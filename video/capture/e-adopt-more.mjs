// Take E: two more pets join the household (Profile shows several pets, one at home).
import * as L from "./lib.mjs";
L.demoBar();
const { browser, page } = await L.connect();
if (!page.url().endsWith("/home")) { await page.goto("http://localhost:3000/home"); await L.sleep(5000); }
const have = await page.evaluate(() => localStorage.getItem("pawket.pets.v1") ?? "");
console.log("have:", have.match(/"name":"[^"]+"/g));
const rec = L.recorder("e-adopt-more");
for (const [species, swipes, name, temper] of [["moss pup", 1, "Pretzel", "Brave"], ["cloud bun", 2, "Pebble", "Cozy"]]) {
  if (have.includes(`"${name}"`)) continue;
  await L.scrollTo(page, page.getByRole("link", { name: "Adopt another pet" }), 0.3);
  await L.tap(page.getByRole("link", { name: "Adopt another pet" }), { after: 2400 });
  const row = await page.getByRole("button", { name: "Moss pup", exact: true }).boundingBox();
  const ly = Math.round(136 + (row.y + row.height / 2) * 3.5);
  const choose = page.getByRole("button", { name: new RegExp(`choose the ${species}`, "i") });
  for (let i = 0; i < 5 && !(await choose.isVisible()); i++) await L.swipe([1000, ly], [500, ly], 700, 1400);
  await L.tap(page.getByRole("button", { name: new RegExp(`choose the ${species}`, "i") }), { after: 1600 });
  await L.tap(page.getByRole("textbox", { name: "Pet name" }), { after: 600 });
  await L.type(name, 200);
  await L.sleep(700);
  await L.tap(page.getByRole("button", { name: new RegExp(`^${temper}`) }), { after: 900 });
  await L.tap(page.getByRole("button", { name: /that’s the one/i }), { after: 2600 });
  await L.tap(page.getByRole("button", { name: /take them home/i }), { after: 5000 });
}
console.log(await rec.stop());
console.log((await page.evaluate(() => localStorage.getItem("pawket.pets.v1") ?? "")).match(/"name":"[^"]+"/g));
await browser.close().catch(() => {});

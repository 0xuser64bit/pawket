// Take Q3: the guild as it stands (Mango came to Sunset nap; Kitchen has a vote), then a second
// poll asked and answered on camera. One vote per wallet; this app signs, no pop-up.
import * as L from "./lib.mjs";
L.demoBar();
const { browser, page } = await L.connect();
await page.reload();
await L.sleep(5000);
const statusText = () => page.evaluate(() => [...document.querySelectorAll("[role=status]")].map((s) => s.innerText).join(" ").replace(/\s+/g, " "));
async function confirmed(label) {
  for (let i = 0; i < 300; i++) {
    const t = await statusText();
    if (t.includes(label) && t.includes("Recorded on Solana")) return t;
    await L.sleep(400);
  }
  throw new Error(`not confirmed: ${label}`);
}
await page.evaluate(() => scrollTo(0, 0));
await L.sleep(1000);

const rec = L.recorder("q3-poll");
await L.sleep(2500);
await L.scrollTo(page, page.getByRole("heading", { name: "What's on" }), 0.12, 900);
await L.sleep(3500);
const summary = page.locator("summary", { hasText: "Ask Window Seat something" }).first();
await L.scrollTo(page, summary, 0.25, 800);
if (!(await summary.evaluate((s) => s.parentElement.open))) await L.tap(summary, { after: 1200 });
await L.tap(page.getByRole("textbox", { name: "The question" }), { after: 400 });
await L.type("Snack after the nap?", 80);
for (const [i, option] of ["Fish", "Biscuits"].entries()) {
  const box = page.getByRole("textbox", { name: `Option ${i + 1}` });
  await L.scrollTo(page, box, 0.5, 600);
  await L.tap(box, { after: 300 });
  await L.type(option, 90);
}
const askIt = page.getByRole("button", { name: "Ask it" });
await L.scrollTo(page, askIt, 0.6, 700);
await L.tap(askIt, { after: 400 });
console.log(await confirmed("Snack after the nap?").catch((e) => e.message));
await L.sleep(2500);
const vote = page.getByRole("button", { name: /^Vote Fish/ });
await L.scrollTo(page, vote, 0.45, 800);
await L.sleep(1200);
await L.tap(vote, { after: 400 });
console.log(await confirmed("Fish").catch((e) => e.message));
await L.sleep(4500);
console.log(await rec.stop());
console.log((await page.evaluate(() => document.querySelector("main").innerText)).split("What's on")[1]?.slice(0, 1000));
await browser.close().catch(() => {});

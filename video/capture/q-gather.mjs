// Take Q2: the founder plans an event that starts in a few minutes, Mango RSVPs and checks in, then
// a poll is asked and answered (one vote per wallet). Every one is signed by this app, no pop-up.
import * as L from "./lib.mjs";
L.demoBar();
const { browser, page } = await L.connect();
const statusText = () => page.evaluate(() => [...document.querySelectorAll("[role=status]")].map((s) => s.innerText).join(" ").replace(/\s+/g, " "));
async function confirmed(label) {
  // A fresh "Recorded on Solana" after the press: wait for the waiting toast to go, then the record.
  for (let i = 0; i < 300; i++) {
    const t = await statusText();
    if (t.includes(label) && t.includes("Recorded on Solana")) return t;
    await L.sleep(400);
  }
  throw new Error(`not confirmed: ${label}`);
}
async function openFold(text) {
  const summary = page.locator("summary", { hasText: text }).first();
  await L.scrollTo(page, summary, 0.25, 800);
  const open = await summary.evaluate((s) => s.parentElement.open);
  if (!open) await L.tap(summary, { after: 1200 });
}

const rec = L.recorder("q2-gather");
await L.sleep(1500);
await openFold("Plan an event");
await L.tap(page.getByRole("textbox", { name: "What it is" }), { after: 400 });
await L.type("Sunset nap", 110);
await L.tap(page.getByRole("textbox", { name: "A line about it" }), { after: 400 });
await L.type("The big window, one slow hour.", 60);
const start = await page.evaluate(() => {
  const d = new Date(Date.now() + 8 * 60_000);
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
});
const when = page.locator("input[type=datetime-local]");
await L.scrollTo(page, when, 0.45, 700);
await when.fill(start);
await L.sleep(1200);
const planIt = page.getByRole("button", { name: "Plan it" });
await L.scrollTo(page, planIt, 0.6, 700);
await L.tap(planIt, { after: 400 });
console.log(await confirmed("Sunset nap").catch((e) => e.message));
await L.sleep(2500);

const going = page.getByRole("button", { name: "Going with Mango" });
await L.scrollTo(page, going, 0.45, 800);
await L.sleep(1000);
await L.tap(going, { after: 400 });
console.log(await confirmed("Mango").catch((e) => e.message));
await L.sleep(3000);
const checkIn = page.getByRole("button", { name: "Check in Mango" });
await L.scrollTo(page, checkIn, 0.45, 800);
await L.sleep(800);
await L.tap(checkIn, { after: 400 });
for (let i = 0; i < 300 && !(await page.getByText("Mango came").isVisible().catch(() => false)); i++) await L.sleep(400);
console.log("came:", await statusText());
await L.sleep(3000);

await openFold("Ask Window Seat something");
await L.tap(page.getByRole("textbox", { name: "The question" }), { after: 400 });
await L.type("Which window next?", 90);
for (const [i, option] of ["Kitchen", "Bedroom", "Front door"].entries()) {
  const box = page.getByRole("textbox", { name: `Option ${i + 1}` });
  await L.scrollTo(page, box, 0.5, 600);
  await L.tap(box, { after: 300 });
  await L.type(option, 90);
}
const askIt = page.getByRole("button", { name: "Ask it" });
await L.scrollTo(page, askIt, 0.6, 700);
await L.tap(askIt, { after: 400 });
console.log(await confirmed("Which window next?").catch((e) => e.message));
await L.sleep(2500);
const vote = page.getByRole("button", { name: /^Vote Kitchen/ });
await L.scrollTo(page, vote, 0.45, 800);
await L.sleep(800);
await L.tap(vote, { after: 400 });
for (let i = 0; i < 300 && !(await page.getByRole("button", { name: /^Vote Kitchen, 1 so far/ }).isVisible().catch(() => false)) && !(await page.getByText(/1 vote/).isVisible().catch(() => false)); i++) await L.sleep(400);
console.log("voted:", await statusText());
await L.sleep(4000);
console.log(await rec.stop());
console.log((await page.evaluate(() => document.querySelector("main").innerText)).split("What's on")[1]?.slice(0, 900));
await browser.close().catch(() => {});

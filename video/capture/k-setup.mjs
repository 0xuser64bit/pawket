// Take K1: "Keep Mango on Solana" asks for a Pawket Wallet first; one approval in the wallet app
// opens it, puts 0.25 devnet SOL in, and links this app (its key made here, non-extractable).
import * as L from "./lib.mjs";
L.demoBar();
const { browser, page } = await L.connect();
if (!page.url().endsWith("/home")) { await page.goto("http://localhost:3000/home"); await L.sleep(5000); }
await page.evaluate(() => scrollTo(0, 0));
await L.sleep(1000);

const rec = L.recorder("k1-setup");
await L.sleep(1800);
await L.tap(page.getByRole("button", { name: "Keep Mango on Solana" }), { after: 4200 });
await L.tap(page.getByRole("link", { name: "Set up Pawket Wallet" }), { after: 3800 });
await L.scrollTo(page, page.getByRole("radio", { name: "0.25 SOL" }), 0.35, 700);
await L.tap(page.getByRole("radio", { name: "30 days" }), { after: 900 });
await L.tap(page.getByRole("radio", { name: "0.25 SOL" }), { after: 1500 });
const link = page.getByRole("button", { name: "Link this app" }).first();
await L.scrollTo(page, link, 0.62, 700);
await L.sleep(2200);
await L.tap(link, { after: 300 });
console.log("wallet:", await L.approveInWallet({ hold: 2200 }));
const linked = page.getByText("Linked", { exact: true }).first();
await linked.waitFor({ timeout: 120_000 });
await L.sleep(1200);
await L.scrollTo(page, linked, 0.42, 900);
await L.sleep(4500);
console.log(await rec.stop());
console.log(await page.locator("main").innerText().then((t) => t.slice(0, 900)));
await browser.close().catch(() => {});

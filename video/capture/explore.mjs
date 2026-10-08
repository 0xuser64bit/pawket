// Prints what the current screen offers: headings, buttons, links, inputs, with their device-pixel centres.
import { connect } from "./lib.mjs";
const { browser, page } = await connect();
console.log(page.url());
const items = await page.evaluate(() => {
  const out = [];
  const dpr = devicePixelRatio;
  for (const el of document.querySelectorAll("h1,h2,h3,button,a,input,textarea,select,[role=radio],[role=tab],[role=dialog],[role=status]")) {
    const r = el.getBoundingClientRect();
    if (!r.width || !r.height) continue;
    const label = (el.getAttribute("aria-label") || el.innerText || el.value || el.placeholder || "").replace(/\s+/g, " ").trim().slice(0, 70);
    out.push(`${el.tagName.toLowerCase()}${el.getAttribute("role") ? "[" + el.getAttribute("role") + "]" : ""} "${label}" @${Math.round((r.x + r.width / 2) * dpr)},${Math.round(136 + (r.y + r.height / 2) * dpr)}${r.y > innerHeight || r.bottom < 0 ? " (off)" : ""}${el.disabled ? " (disabled)" : ""}`);
  }
  return out;
});
console.log(items.join("\n"));
await browser.close().catch(() => {});

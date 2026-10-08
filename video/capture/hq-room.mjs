// The 3D room at full quality for the opening and the close: the web build's own Room3D, drawn by a
// desktop-size browser on this Mac's GPU at the app's 1.75× (1953×850 px), shown on Mango's public
// visit page (the real Mango, read from Solana, wearing the Halo) with the player as dressed in this
// browser's profile (capture/hq-look.mjs).
//
// Device-pixel screenshots of the canvas come at ~20 a second, so the page's clock runs three times
// slower while it is filmed (performance.now, Date.now, animation frames and timers alike, so the app
// behaves exactly as it does at full speed), every frame is stamped with page time, and the frames are
// laid back onto that time at 30 fps.
// Usage: node capture/hq-room.mjs <name> <Emote@seconds,...> <length-seconds>
import { chromium } from "../../node_modules/@playwright/test/index.mjs";
import { execFileSync } from "node:child_process";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";

const SLOW = 3;
const [name, plan = "", length = "12"] = process.argv.slice(2);
const MANGO = "Byafa9FMvFCxATP98EDeiVsw77ktK9y2qZSb3uGKX5kY";
const root = path.resolve(new URL("..", import.meta.url).pathname);
const frames = path.join(root, "footage/hq", name);
rmSync(frames, { recursive: true, force: true });
mkdirSync(frames, { recursive: true });

const ctx = await chromium.launchPersistentContext(path.join(root, "footage/hq/browser-profile"), {
  args: ["--use-angle=metal", "--enable-gpu", "--ignore-gpu-blocklist"],
  viewport: { width: 1440, height: 900 },
  deviceScaleFactor: 1.75,
});
await ctx.addInitScript((F) => {
  const realNow = performance.now.bind(performance);
  const t0 = realNow();
  performance.now = () => t0 + (realNow() - t0) / F;
  const realDate = Date.now;
  const d0 = realDate();
  Date.now = () => d0 + (realDate() - d0) / F;
  const raf = window.requestAnimationFrame.bind(window);
  window.requestAnimationFrame = (cb) => raf((ts) => cb(t0 + (ts - t0) / F));
  const st = window.setTimeout.bind(window);
  window.setTimeout = (fn, ms, ...a) => st(fn, (ms || 0) * F, ...a);
  const si = window.setInterval.bind(window);
  window.setInterval = (fn, ms, ...a) => si(fn, (ms || 0) * F, ...a);
}, SLOW);
const page = ctx.pages()[0] ?? (await ctx.newPage());
await page.goto(`http://localhost:3000/pet/${MANGO}/visit`, { waitUntil: "domcontentloaded" });
const canvas = page.locator("canvas").first();
await canvas.waitFor({ timeout: 90_000 });
await page.waitForTimeout(9000 * SLOW);
await page.evaluate(() => {
  const c = document.querySelector("canvas");
  window.scrollTo(0, window.scrollY + c.getBoundingClientRect().top - 24);
});
await page.waitForTimeout(1500);
const box = await canvas.boundingBox();
// Screenshot clips are in page coordinates; the box is in the viewport's.
const scroll = await page.evaluate(() => ({ x: window.scrollX, y: window.scrollY }));
const b = { ...box, x: box.x + scroll.x, y: box.y + scroll.y };
const size = await page.evaluate(() => { const c = document.querySelector("canvas"); return `${c.width}x${c.height}`; });

const cdp = await ctx.newCDPSession(page);
const now = () => page.evaluate(() => performance.now() / 1000);
const shots = [];
const start = await now();
const steps = plan.split(",").filter(Boolean).map((s) => { const [emote, at] = s.split("@"); return { emote, at: Number(at), done: false }; });
for (;;) {
  const t = (await now()) - start;
  if (t > Number(length)) break;
  for (const s of steps) {
    if (!s.done && t >= s.at) {
      s.done = true;
      await page.getByRole("button", { name: s.emote, exact: true }).click({ noWaitAfter: true });
    }
  }
  const { data } = await cdp.send("Page.captureScreenshot", { format: "jpeg", quality: 95, clip: { x: b.x, y: b.y, width: b.width, height: b.height, scale: 1.75 } });
  const file = path.join(frames, `${String(shots.length).padStart(5, "0")}.jpg`);
  writeFileSync(file, Buffer.from(data, "base64"));
  shots.push({ file, t });
}
await ctx.close();

const lines = ["ffconcat version 1.0"];
shots.forEach((s, i) => lines.push(`file '${s.file}'`, `duration ${((shots[i + 1]?.t ?? s.t + 1 / 30) - s.t).toFixed(4)}`));
writeFileSync(path.join(frames, "list.ffconcat"), lines.join("\n"));
const out = path.join(root, "footage/raw", `${name}.mp4`);
execFileSync("ffmpeg", ["-loglevel", "error", "-y", "-f", "concat", "-safe", "0", "-i", path.join(frames, "list.ffconcat"), "-vf", "crop=trunc(iw/2)*2:trunc(ih/2)*2,fps=30,format=yuv420p", "-c:v", "libx264", "-preset", "slow", "-crf", "14", out]);
console.log(JSON.stringify({ out, canvas: size, frames: shots.length, perSecond: (shots.length / Number(length)).toFixed(1) }));

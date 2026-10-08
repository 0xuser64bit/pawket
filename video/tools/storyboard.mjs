// script/storyboard.png: one frame per beat of the finished cut, labelled, in Pawket's type.
// Usage: node tools/storyboard.mjs out/Pawket-Demo-1080p.mp4
import { chromium } from "../../node_modules/@playwright/test/index.mjs";
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

const video = process.argv[2];
const root = path.resolve(new URL("..", import.meta.url).pathname);
const BEATS = [
  [0.6, "The paw draws itself"], [4.6, "Meet Mango"], [10.6, "Pawket, a living companion"],
  [14.0, "Adopt in three taps"], [20.6, "No wallet, no sign-up"], [27.0, "The two of you, at home"],
  [31.0, "Feed, play, brush, rest"], [36.8, "Needs show on their face"], [42.5, "Today's round"],
  [45.0, "Say hello"], [49.0, "Android share sheet"], [54.5, "Four quick games"],
  [58.0, "+25 XP, once a day"], [66.5, "Your household"], [72.8, "Stickers, earned by care"],
  [78.5, "Keep it on Solana"], [84.5, "One approval, in the wallet app"], [87.5, "This phone, linked"],
  [94.0, "Recorded, then the moment"], [97.5, "A public Passport"], [102.5, "A keepsake card"],
  [106.0, "Every action, on the record"], [116.0, "Looks, never power"], [125.0, "Spending asks your wallet"],
  [134.5, "A meetup: RSVP, check in"], [138.0, "A poll, one vote per wallet"], [145.5, "The Park, read live"],
  [150.5, "Pulse"], [158.0, "Back home: a wave, a cheer"], [167.6, "A dance, and the name"],
];
const dir = mkdtempSync(path.join(tmpdir(), "pawket-board-"));
const cells = BEATS.map(([t, label], i) => {
  const file = path.join(dir, `${i}.jpg`);
  execFileSync("ffmpeg", ["-loglevel", "error", "-y", "-ss", String(t), "-i", video, "-frames:v", "1", "-vf", "scale=480:-1", "-q:v", "3", file]);
  const src = `data:image/jpeg;base64,${readFileSync(file).toString("base64")}`;
  const mm = `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, "0")}`;
  return `<figure><img src="${src}"><figcaption><b>${mm}</b> ${label}</figcaption></figure>`;
});
const font = (f) => `url(data:font/woff2;base64,${readFileSync(path.join(root, "public/fonts", f)).toString("base64")})`;
const html = `<!doctype html><html><head><style>
@font-face{font-family:Fraunces;src:${font("Fraunces-Variable.woff2")};font-weight:100 900}
@font-face{font-family:Hanken;src:${font("HankenGrotesk-Variable.woff2")};font-weight:100 900}
@font-face{font-family:Mono;src:${font("DMMono-Regular.woff2")}}
body{margin:0;padding:48px;background:#f6efe2;color:#2a1e14;font-family:Hanken,sans-serif;width:2496px}
h1{font-family:Fraunces;font-weight:600;font-size:56px;margin:0 0 6px}
p{margin:0 0 32px;color:#61513f;font-size:22px}
main{display:grid;grid-template-columns:repeat(5,480px);gap:24px}
figure{margin:0}img{width:480px;border:3px solid #2a1e14;border-radius:14px;display:block}
figcaption{margin-top:8px;font-size:20px}b{font-family:Mono;font-weight:400;margin-right:8px;color:#b8500f}
</style></head><body><h1>Pawket — storyboard of the final cut</h1><p>2:50 · your companion → your daily life together → the world around you → a story you can keep</p><main>${cells.join("")}</main></body></html>`;
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 2592, height: 1000 } });
await page.setContent(html, { waitUntil: "load" });
await page.screenshot({ path: path.join(root, "script/storyboard.png"), fullPage: true });
await browser.close();
console.log("script/storyboard.png");

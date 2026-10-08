// Capture helpers: real touch input through adb, placed from the WebView's DOM over CDP,
// and screen recording on the device. Nothing here changes the app; it only presses it.
import { chromium } from "../../node_modules/@playwright/test/index.mjs";
import { execFileSync, spawn } from "node:child_process";
import { mkdirSync } from "node:fs";

export const ADB = `${process.env.HOME}/Library/Android/sdk/platform-tools/adb`;
export const FOOTAGE = new URL("../footage/raw", import.meta.url).pathname;
// The WebView's place on screen, read at connect(): device px per CSS px, and its top-left corner.
let DPR = 3.5;
let LEFT = 0;
let TOP = 136;

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
export const adb = (...args) => execFileSync(ADB, args, { encoding: "utf8" });
export const sh = (cmd) => adb("shell", cmd);

export async function connect() {
  const sock = sh("cat /proc/net/unix").match(/webview_devtools_remote_\d+/g);
  if (!sock) throw new Error("no WebView devtools socket");
  adb("forward", "tcp:9223", `localabstract:${[...new Set(sock)].pop()}`);
  const browser = await chromium.connectOverCDP("http://localhost:9223");
  const page = browser.contexts()[0].pages().find((p) => p.url().startsWith("http://localhost:3000")) ?? browser.contexts()[0].pages()[0];
  page.setDefaultTimeout(30_000);
  // Filming only: the room draws at the app's own non-phone resolution (1.75×) instead of 1× — the
  // same Room3D path larger screens take (src/components/home/room.tsx asks this exact query). The
  // app's slow-device fallback still applies. Nothing else on the page changes.
  await page.addInitScript(() => {
    window.__pawketHQ = true;
    const media = window.matchMedia.bind(window);
    window.matchMedia = (q) => media(q === "(max-width: 719px), (pointer: coarse)" ? "(max-width: 0px)" : q);
  });
  if (!(await page.evaluate(() => window.__pawketHQ === true).catch(() => false))) {
    await page.reload({ waitUntil: "domcontentloaded" });
    await sleep(7000);
  }
  DPR = await page.evaluate(() => devicePixelRatio);
  sh("uiautomator dump /sdcard/ui.xml");
  const m = sh("cat /sdcard/ui.xml").match(/class="android\.webkit\.WebView"[^>]*bounds="\[(\d+),(\d+)\]/);
  if (m) [LEFT, TOP] = [Number(m[1]), Number(m[2])];
  return { browser, page };
}

/** Device pixels for the centre (or a fraction) of a locator's box. */
export async function at(locator, fx = 0.5, fy = 0.5) {
  await locator.waitFor({ state: "visible" });
  const b = await locator.boundingBox();
  if (!b) throw new Error("no box");
  return [Math.round(LEFT + (b.x + b.width * fx) * DPR), Math.round(TOP + (b.y + b.height * fy) * DPR)];
}

export async function tap(target, opts = {}) {
  const [x, y] = Array.isArray(target) ? target : await at(target, opts.fx, opts.fy);
  sh(`input tap ${x} ${y}`);
  await sleep(opts.after ?? 600);
}

export async function swipe(from, to, ms = 300, after = 500) {
  sh(`input swipe ${from[0]} ${from[1]} ${to[0]} ${to[1]} ${ms}`);
  await sleep(after);
}

/** Types with the hardware keyboard path, one key at a time so it reads as typing. */
export async function type(text, perKey = 90) {
  for (const ch of text) {
    sh(`input text ${ch === " " ? "%s" : `'${ch.replace(/'/g, "'\\''")}'`}`);
    await sleep(perKey);
  }
}

/** Scrolls the page so a locator sits at a fraction of the viewport, with a real finger drag. */
export async function scrollTo(page, locator, frac = 0.45, ms = 450) {
  await locator.waitFor({ state: "attached" });
  for (let i = 0; i < 6; i++) {
    const b = await locator.boundingBox();
    const ih = await page.evaluate(() => innerHeight);
    if (!b) break;
    const delta = b.y + b.height / 2 - ih * frac;
    if (Math.abs(delta) < 24) break;
    const step = Math.max(-560, Math.min(560, delta));
    const x = Math.round(LEFT + 205 * DPR), y0 = Math.round(TOP + (ih * 0.6) * DPR);
    await swipe([x, y0], [x, Math.round(y0 - step * DPR)], ms, 700);
  }
}

export function recorder(name) {
  // screenrecord stops itself at 3 minutes; a long take runs on in numbered segments (name-2, name-3…).
  mkdirSync(FOOTAGE, { recursive: true });
  const parts = [];
  let current = null;
  let stopping = false;
  const segment = () => {
    const remote = `/sdcard/${name}${parts.length ? `-${parts.length + 1}` : ""}.mp4`;
    parts.push(remote);
    const p = spawn(ADB, ["shell", "screenrecord", "--size", "1080x2400", "--bit-rate", "40000000", remote], { stdio: "ignore" });
    p.done = new Promise((r) => p.on("exit", () => { r(); if (!stopping) segment(); }));
    current = p;
  };
  segment();
  return {
    started: Date.now(),
    async stop() {
      stopping = true;
      await sleep(400);
      try { sh("pkill -INT screenrecord"); } catch {}
      await current.done;
      await sleep(800);
      return parts.map((remote, i) => {
        const local = `${FOOTAGE}/${name}${i ? `-${i + 1}` : ""}.mp4`;
        adb("pull", remote, local);
        sh(`rm ${remote}`);
        return local;
      }).join(" ");
    },
  };
}

export async function screenshot(path) {
  const buf = execFileSync(ADB, ["exec-out", "screencap", "-p"], { maxBuffer: 64 * 1024 * 1024 });
  const { writeFileSync } = await import("node:fs");
  writeFileSync(path, buf);
}

/** A clean, fixed status bar for every take: 9:41, full battery, wifi, no notifications. */
export function demoBar() {
  sh("settings put global sysui_demo_allowed 1");
  for (const c of ["-e command enter", "-e command clock -e hhmm 0941", "-e command battery -e level 100 -e plugged false",
    "-e command network -e wifi show -e level 4 -e mobile hide", "-e command notifications -e visible false"]) {
    sh(`am broadcast -a com.android.systemui.demo ${c}`);
  }
}

/** Which app has the screen: "wallet" (the MWA test wallet), "pawket", or something else. */
export function focused() {
  const line = sh("dumpsys window").split("\n").find((l) => l.includes("mCurrentFocus")) ?? "";
  return line.includes("fakewallet") ? "wallet" : line.includes("app.pawket") ? "pawket" : line.trim();
}

/** The wallet app's buttons on screen now: [{ text, x, y }] from uiautomator. */
export function walletButtons() {
  sh("uiautomator dump /sdcard/ui.xml");
  const xml = sh("cat /sdcard/ui.xml");
  return [...xml.matchAll(/text="([^"]+)"[^>]*class="android\.widget\.Button"[^>]*bounds="\[(\d+),(\d+)\]\[(\d+),(\d+)\]"/g)].map((m) => ({
    text: m[1], x: (Number(m[2]) + Number(m[4])) >> 1, y: (Number(m[3]) + Number(m[5])) >> 1,
  }));
}

/**
 * Waits for the wallet app, lets the viewer read it, then approves what it asks (authorize, sign)
 * until Pawket has the screen again. Returns what was pressed.
 */
export async function approveInWallet({ hold = 1800, timeout = 45_000 } = {}) {
  const pressed = [];
  const end = Date.now() + timeout;
  while (focused() !== "wallet") { if (Date.now() > end) throw new Error("wallet never opened"); await sleep(300); }
  let back = 0;
  while (Date.now() < end) {
    const state = focused();
    // Pawket again, and for a while: a wallet that asks twice (authorize, then sign) comes back quickly.
    if (state === "pawket") { if ((back += 400) >= 4000) return pressed; await sleep(400); continue; }
    back = 0;
    if (state === "wallet") {
      const ok = walletButtons().find((b) => /^(AUTHORIZE|SIGN|APPROVE|SEND)/i.test(b.text) && !/X3|DECLINE|REJECT|SIMULATE/i.test(b.text));
      if (ok) { await sleep(hold); sh(`input tap ${ok.x} ${ok.y}`); pressed.push(ok.text); await sleep(1500); continue; }
    }
    await sleep(400);
  }
  throw new Error(`wallet still open after ${pressed.join(", ")}`);
}

// Take G: the playground. The list, then each game played for real: Catch and Hop through
// DevTools touch input (they need quick reactions), Copy and Pairs through adb taps.
// Hop is played as today's round, so its finish shows the daily bonus.
import * as L from "./lib.mjs";

const only = process.argv[2]; // run one part: list | catch | hop | copy | pairs
L.demoBar();
const { browser, page } = await L.connect();
const cdp = await page.context().newCDPSession(page);
const touch = (type, x, y) => cdp.send("Input.dispatchTouchEvent", { type, touchPoints: type === "touchEnd" ? [] : [{ x, y }] });
const tapCss = async (x, y) => { await touch("touchStart", x, y); await L.sleep(40); await touch("touchEnd"); };

async function toList() {
  const back = page.getByRole("button", { name: "All games" });
  if (await back.isVisible().catch(() => false)) await L.tap(back, { after: 1500 });
  await page.evaluate(() => scrollTo(0, 0));
  await L.sleep(800);
}

async function open(game, daily) {
  const button = page.getByRole("button", { name: daily ? `Play ${game}, today's round` : `Practise ${game}, a new round` });
  await L.scrollTo(page, button, 0.55);
  await L.tap(button, { after: 2200 });
}

async function catchBot(ms) {
  const box = await page.locator(".pk-game--catch").boundingBox();
  const y = box.y + box.height * 0.86;
  let x = box.x + box.width / 2;
  await touch("touchStart", x, y);
  const end = Date.now() + ms;
  while (Date.now() < end) {
    const s = await page.evaluate(() => {
      const f = document.querySelector(".pk-game--catch")?.getBoundingClientRect();
      if (!f) return null;
      const drops = [...document.querySelectorAll(".pk-game__drop")].map((d) => {
        const r = d.getBoundingClientRect();
        const h = d.innerHTML;
        return { x: (r.left + r.width / 2 - f.left) / f.width, y: (r.top + r.height / 2 - f.top) / f.height, kind: h.includes("fill=\"var(--pool-edge)\"") ? "cloud" : h.includes("--trim-foil") ? "star" : "treat" };
      });
      return drops;
    });
    if (!s) break;
    const good = s.filter((d) => d.kind !== "cloud" && d.y < 0.92).sort((a, b) => (b.kind === "star") - (a.kind === "star") || b.y - a.y);
    let tx = good.length ? good[0].x : 0.5;
    for (const c of s.filter((d) => d.kind === "cloud" && d.y > 0.45)) if (Math.abs(c.x - tx) < 0.13) tx += tx > c.x ? 0.16 : -0.16;
    tx = Math.min(0.92, Math.max(0.08, tx));
    x += (box.x + box.width * tx - x) * 0.45;
    await touch("touchMove", x, y);
    await L.sleep(28);
  }
  await touch("touchEnd");
}

async function hopBot(jumps) {
  const box = await page.locator(".pk-game--hop").boundingBox();
  const tx = box.x + box.width * 0.5, ty = box.y + box.height * 0.45;
  await tapCss(tx, ty);
  let done = 0, last = Date.now();
  while (done < jumps) {
    const s = await page.evaluate(() => {
      const f = document.querySelector(".pk-game--hop");
      if (!f) return null;
      const fr = f.getBoundingClientRect();
      const things = [...f.querySelectorAll(".pk-game__thing")].map((t) => {
        const r = t.getBoundingClientRect();
        return { x: (r.left - fr.left) / fr.width, w: r.width / fr.width };
      });
      return { things, speed: parseFloat(f.querySelector(".pk-game__time")?.textContent ?? "1") * 0.42 };
    });
    if (!s) return;
    const next = s.things.filter((t) => t.x + t.w > 0.155).sort((a, b) => a.x - b.x)[0];
    if (next) {
      const dt = (next.x - 0.245) / s.speed;
      if (dt < 0.23 && dt > -0.04 && Date.now() - last > 650) {
        await tapCss(tx, ty);
        last = Date.now();
        done++;
      }
    }
    await L.sleep(12);
  }
}

async function copyBot(rounds) {
  await page.evaluate(() => {
    const w = window;
    w.__seq = [];
    w.__last = null;
    const paw = document.querySelector(".pk-paws__paw");
    new MutationObserver(() => {
      if (document.querySelector(".pk-paws")?.dataset.phase !== "show") return;
      const beans = [...paw.querySelectorAll(".pk-paws__bean")];
      const lit = beans.findIndex((b) => b.classList.contains("pk-paws__bean--lit"));
      const idx = lit < 0 ? null : lit;
      if (idx !== null && w.__last === null) w.__seq.push(idx);
      w.__last = idx;
    }).observe(paw, { subtree: true, attributes: true, attributeFilter: ["class"] });
  });
  await L.tap(page.getByRole("button", { name: "Start copying" }), { after: 200 });
  const beans = page.locator(".pk-paws__bean");
  for (let r = 1; r <= rounds; r++) {
    await page.waitForFunction(() => document.querySelector(".pk-paws")?.dataset.phase === "turn", null, { timeout: 30_000 });
    const seq = await page.evaluate(() => { const w = window; const s = w.__seq; w.__seq = []; w.__last = null; return s; });
    for (const b of seq) await L.tap(beans.nth(b), { after: 330 });
    await page.waitForFunction(() => document.querySelector(".pk-paws")?.dataset.phase !== "turn", null, { timeout: 10_000 });
  }
}

async function pairsBot() {
  const cards = page.locator(".pk-pair");
  const n = await cards.count();
  const known = new Map();
  const found = new Set();
  const face = async (i) => cards.nth(i).getAttribute("aria-label");
  while (found.size < n) {
    const open = [...known].filter(([i]) => !found.has(i));
    const pair = open.find(([i, f]) => open.some(([j, g]) => j !== i && g === f));
    if (pair) {
      const mate = open.find(([j, g]) => j !== pair[0] && g === pair[1]);
      await L.tap(cards.nth(pair[0]), { after: 420 });
      await L.tap(cards.nth(mate[0]), { after: 950 });
      found.add(pair[0]).add(mate[0]);
      continue;
    }
    const unknown = [...Array(n).keys()].filter((i) => !known.has(i) && !found.has(i));
    const a = unknown[0];
    await L.tap(cards.nth(a), { after: 480 });
    known.set(a, await face(a));
    const match = [...known].find(([i, f]) => i !== a && !found.has(i) && f === known.get(a));
    if (match) {
      await L.tap(cards.nth(match[0]), { after: 950 });
      found.add(a).add(match[0]);
      continue;
    }
    const b = unknown[1];
    await L.tap(cards.nth(b), { after: 480 });
    known.set(b, await face(b));
    if (known.get(b) === known.get(a)) found.add(a).add(b);
    await L.sleep(1000);
  }
}

const parts = {
  async list() {
    await toList();
    const rec = L.recorder("g1-list");
    await L.sleep(2500);
    for (let i = 0; i < 4; i++) await L.swipe([720, 2500], [720, 1250], 900, 1200);
    await L.sleep(800);
    return rec.stop();
  },
  async catch() {
    await toList();
    await open("Catch", false);
    const rec = L.recorder("g2-catch");
    await L.sleep(1200);
    await catchBot(9000);
    await L.sleep(800);
    return rec.stop();
  },
  async hop() {
    await toList();
    await open("Hop", true);
    const rec = L.recorder("g3-hop");
    await L.sleep(1200);
    await hopBot(6);
    await page.getByText("Round finished").waitFor({ timeout: 30_000 });
    await L.sleep(1200);
    await L.scrollTo(page, page.getByText("Round finished"), 0.35);
    await L.sleep(3500);
    return rec.stop();
  },
  async copy() {
    await toList();
    await open("Copy", false);
    const rec = L.recorder("g4-copy");
    await L.sleep(1000);
    await copyBot(4);
    await L.sleep(1200);
    return rec.stop();
  },
  async pairs() {
    await toList();
    await open("Pairs", false);
    const rec = L.recorder("g5-pairs");
    await L.sleep(1000);
    await pairsBot();
    await L.sleep(3000);
    return rec.stop();
  },
};

for (const [name, run] of Object.entries(parts)) {
  if (only && only !== name) continue;
  console.log(name, await run());
}
await browser.close().catch(() => {});

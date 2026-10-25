import { nextRandom } from "./random";

export const HOP = {
  petX: 0.2,
  petHalf: 0.045,
  petHeight: 0.15,
  jump: 1.7,
  gravity: 4.2,
  startSpeed: 0.42,
  topSpeed: 1.05,
  speedUp: 0.011,
};

type Obstacle = { id: number; kind: "pot" | "puddle" | "log"; x: number; w: number; h: number };
type Heart = { id: number; x: number; y: number };
type HopEvent = "jump" | "heart" | "bump";

const KINDS: Record<Obstacle["kind"], { w: number; h: number }> = {
  pot: { w: 0.06, h: 0.13 },
  puddle: { w: 0.11, h: 0.025 },
  log: { w: 0.1, h: 0.085 },
};

export interface HopState {
  t: number;
  speed: number;
  run: number;
  y: number;
  vy: number;
  obstacles: Obstacle[];
  hearts: Heart[];
  collected: number;
  nextAt: number;
  nextId: number;
  seed: number;
  over: boolean;
  events: HopEvent[];
}

export const metres = (run: number) => Math.floor(run * 10);
export const hopScore = (state: Pick<HopState, "run" | "collected">) => metres(state.run) + state.collected * 5;

export const AIRTIME = (2 * HOP.jump) / HOP.gravity;

export function startHop(seed: number): HopState {
  return { t: 0, speed: HOP.startSpeed, run: 0, y: 0, vy: 0, obstacles: [], hearts: [], collected: 0, nextAt: 1.1, nextId: 1, seed, over: false, events: [] };
}

export function stepHop(state: HopState, dt: number, jump: boolean): HopState {
  if (state.over) return { ...state, events: [] };
  const events: HopEvent[] = [];
  const t = state.t + dt;
  const speed = Math.min(HOP.topSpeed, HOP.startSpeed + HOP.speedUp * t);
  const shift = speed * dt;
  let { y, vy, collected, nextAt, nextId, seed } = state;

  if (jump && y === 0) {
    vy = HOP.jump;
    events.push("jump");
  }
  vy -= HOP.gravity * dt;
  y = Math.max(0, y + vy * dt);
  if (y === 0) vy = 0;

  const obstacles = state.obstacles.map((o) => ({ ...o, x: o.x - shift })).filter((o) => o.x + o.w > -0.05);
  const hearts: Heart[] = [];
  for (const heart of state.hearts) {
    const x = heart.x - shift;
    const near = Math.abs(x - HOP.petX) < 0.05 && heart.y >= y - 0.02 && heart.y <= y + HOP.petHeight + 0.04;
    if (near) {
      collected += 1;
      events.push("heart");
    } else if (x > -0.05) hearts.push({ ...heart, x });
  }

  nextAt -= shift;
  if (nextAt <= 0) {
    let r: number;
    [r, seed] = nextRandom(seed);
    const kind: Obstacle["kind"] = r < 0.4 ? "pot" : r < 0.7 ? "log" : "puddle";
    obstacles.push({ id: nextId++, kind, x: 1.05, ...KINDS[kind] });
    let g: number;
    [g, seed] = nextRandom(seed);
    const clearance = AIRTIME * speed + KINDS[kind].w + 2 * HOP.petHalf + 0.08;
    nextAt = clearance + g * 0.55;
    let h: number;
    [h, seed] = nextRandom(seed);
    if (h < 0.35) hearts.push({ id: nextId++, x: 1.05 + KINDS[kind].w / 2, y: 0.2 + h * 0.2 });
  }

  const left = HOP.petX - HOP.petHalf;
  const right = HOP.petX + HOP.petHalf;
  const bumped = obstacles.some((o) => o.x < right && o.x + o.w > left && y < o.h * 0.85);
  if (bumped) events.push("bump");

  return { t, speed, run: state.run + shift, y, vy, obstacles, hearts, collected, nextAt, nextId, seed, over: bumped, events };
}

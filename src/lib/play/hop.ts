import { nextRandom } from "./random";

/**
 * Hop: the pet runs along the path and the player makes it jump over flower
 * pots, puddles and logs. The path speeds up the longer it lasts; hearts
 * float above it for anyone who jumps at the right moment. One bump and the
 * run is over.
 *
 * The field is 1 wide; heights are in field heights above the path. Every
 * gap between two things is wider than a jump at the speed it is met, so a
 * run is always clearable — the round tests timing, not luck. No vital,
 * level or wearable is read here.
 */
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
  /** Field widths run so far. */
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

/** Ten metres to a field width: what the scoreboard reads. */
export const metres = (run: number) => Math.floor(run * 10);
export const hopScore = (state: Pick<HopState, "run" | "collected">) => metres(state.run) + state.collected * 5;

/** How long a jump stays off the ground. */
export const AIRTIME = (2 * HOP.jump) / HOP.gravity;

export function startHop(seed: number): HopState {
  return { t: 0, speed: HOP.startSpeed, run: 0, y: 0, vy: 0, obstacles: [], hearts: [], collected: 0, nextAt: 1.1, nextId: 1, seed, over: false, events: [] };
}

/** Advance by `dt` seconds. `jump` is true on the step a jump was asked for. */
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

  // The next thing on the path, a jump-and-a-bit further on than the last.
  nextAt -= shift;
  if (nextAt <= 0) {
    let r: number;
    [r, seed] = nextRandom(seed);
    const kind: Obstacle["kind"] = r < 0.4 ? "pot" : r < 0.7 ? "log" : "puddle";
    obstacles.push({ id: nextId++, kind, x: 1.05, ...KINDS[kind] });
    let g: number;
    [g, seed] = nextRandom(seed);
    // Land from the last jump, with room to take off again before the next.
    const clearance = AIRTIME * speed + KINDS[kind].w + 2 * HOP.petHalf + 0.08;
    nextAt = clearance + g * 0.55;
    let h: number;
    [h, seed] = nextRandom(seed);
    if (h < 0.35) hearts.push({ id: nextId++, x: 1.05 + KINDS[kind].w / 2, y: 0.2 + h * 0.2 });
  }

  // A bump: the pet's feet are below the top of something it overlaps. The
  // pet's box is a little smaller than its drawing, so a near miss is a miss.
  const left = HOP.petX - HOP.petHalf;
  const right = HOP.petX + HOP.petHalf;
  const bumped = obstacles.some((o) => o.x < right && o.x + o.w > left && y < o.h * 0.85);
  if (bumped) events.push("bump");

  return { t, speed, run: state.run + shift, y, vy, obstacles, hearts, collected, nextAt, nextId, seed, over: bumped, events };
}

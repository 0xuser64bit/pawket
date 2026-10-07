import { seedFrom } from "./random";

/**
 * A player's best score in each game, on this device — overall, and in
 * today's daily round. A personal record, not a leaderboard: it is never
 * sent anywhere and it changes nothing on the pet.
 */
export type GameId = "catch" | "hop" | "copy" | "pairs";
export const GAME_IDS: readonly GameId[] = ["catch", "hop", "copy", "pairs"];

const KEY = "pawket.best.v1";
const DAILY_KEY = "pawket.daily.v1"; // gitleaks:allow (a localStorage key name)

function readJson(key: string): Record<string, unknown> {
  try {
    const parsed: unknown = JSON.parse(window.localStorage.getItem(key) ?? "{}");
    return parsed && typeof parsed === "object" ? (parsed as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

const score = (value: unknown): number | undefined =>
  typeof value === "number" && Number.isFinite(value) && value >= 0 ? Math.floor(value) : undefined;

export function readBest(): Partial<Record<GameId, number>> {
  const stored = readJson(KEY);
  const out: Partial<Record<GameId, number>> = {};
  for (const id of GAME_IDS) {
    const value = score(stored[id]);
    if (value !== undefined) out[id] = value;
  }
  return out;
}

/** Keep a score if it beats the best. True when it did. */
export function keepBest(game: GameId, value: number): boolean {
  const best = readBest();
  if (value <= (best[game] ?? 0)) return false;
  try {
    window.localStorage.setItem(KEY, JSON.stringify({ ...best, [game]: value }));
  } catch {
    // Blocked storage: the best is shown for this round and not kept.
  }
  return true;
}

/**
 * Today's round of a game: the same seed for everyone on the same UTC day,
 * so two players can compare one round without any server comparing it for
 * them.
 */
export function dailySeed(game: GameId, day: string): number {
  return seedFrom(`pawket:${day}:${game}`);
}

/** Today's best in each game's daily round, on this device. Yesterday's is gone. */
export function readDaily(day: string): Partial<Record<GameId, number>> {
  const stored = readJson(DAILY_KEY);
  if (stored.day !== day) return {};
  const out: Partial<Record<GameId, number>> = {};
  for (const id of GAME_IDS) {
    const value = score(stored[id]);
    if (value !== undefined) out[id] = value;
  }
  return out;
}

/** Keep a daily-round score if it beats today's. True when it did. */
export function keepDaily(game: GameId, day: string, value: number): boolean {
  const today = readDaily(day);
  if (value <= (today[game] ?? -1)) return false;
  try {
    window.localStorage.setItem(DAILY_KEY, JSON.stringify({ ...today, day, [game]: value }));
  } catch {
    // Blocked storage: shown for this round, not kept.
  }
  return true;
}

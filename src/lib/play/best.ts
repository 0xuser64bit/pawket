import { seedFrom } from "./random";

export type GameId = "catch" | "hop" | "copy" | "pairs";
const GAME_IDS: readonly GameId[] = ["catch", "hop", "copy", "pairs"];

const KEY = "pawket.best.v1";
const DAILY_KEY = "pawket.daily.v1";

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

export function keepBest(game: GameId, value: number): boolean {
  const best = readBest();
  if (value <= (best[game] ?? 0)) return false;
  try {
    window.localStorage.setItem(KEY, JSON.stringify({ ...best, [game]: value }));
  } catch {}
  return true;
}

export function dailySeed(game: GameId, day: string): number {
  return seedFrom(`pawket:${day}:${game}`);
}

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

export function keepDaily(game: GameId, day: string, value: number): boolean {
  const today = readDaily(day);
  if (value <= (today[game] ?? -1)) return false;
  try {
    window.localStorage.setItem(DAILY_KEY, JSON.stringify({ ...today, day, [game]: value }));
  } catch {}
  return true;
}

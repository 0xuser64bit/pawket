/**
 * A player's best score in each game, on this device. A personal record,
 * not a leaderboard: it is never sent anywhere and it changes nothing on
 * the pet.
 */
export type GameId = "catch" | "hop" | "copy";

const KEY = "pawket.best.v1";

export function readBest(): Partial<Record<GameId, number>> {
  try {
    const parsed: unknown = JSON.parse(window.localStorage.getItem(KEY) ?? "{}");
    if (!parsed || typeof parsed !== "object") return {};
    const out: Partial<Record<GameId, number>> = {};
    for (const id of ["catch", "hop", "copy"] as const) {
      const value = (parsed as Record<string, unknown>)[id];
      if (typeof value === "number" && Number.isFinite(value) && value >= 0) out[id] = Math.floor(value);
    }
    return out;
  } catch {
    return {};
  }
}

/** Keep a score if it beats the best. True when it did. */
export function keepBest(game: GameId, score: number): boolean {
  const best = readBest();
  if (score <= (best[game] ?? 0)) return false;
  try {
    window.localStorage.setItem(KEY, JSON.stringify({ ...best, [game]: score }));
  } catch {
    // Blocked storage: the best is shown for this round and not kept.
  }
  return true;
}

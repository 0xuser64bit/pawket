/** One curve the keeper may graduate. Amounts are lamports, as decimal strings or bigints. */
export interface GraduationCandidate {
  pool: string;
  config: string;
  raised: bigint;
  threshold: bigint;
  migrated: boolean;
}

export const KEEPER_DEFAULT_LIMIT = 1;
export const KEEPER_HARD_CAP = 10;

/**
 * The pools a keeper may graduate this run: offered configs only, still on the
 * curve, and at or past their threshold. Pool order is stable so two keepers
 * with the same snapshot choose the same pools.
 */
export function graduationPlan(
  candidates: readonly GraduationCandidate[],
  max: number,
  configs: readonly string[],
): GraduationCandidate[] {
  const offered = new Set(configs);
  return candidates
    .filter((candidate) => offered.has(candidate.config) && !candidate.migrated && candidate.threshold > 0n && candidate.raised >= candidate.threshold)
    .sort((a, b) => (a.pool < b.pool ? -1 : a.pool > b.pool ? 1 : 0))
    .slice(0, Math.max(0, Math.floor(max)));
}

/**
 * `MAX_GRADUATIONS` is an operator convenience, never a way to remove the
 * hard cap. A missing or malformed value falls back to one, so a typo cannot
 * turn one keeper run into an unbounded loop.
 */
export function keeperLimit(env: Readonly<Record<string, string | undefined>>): number {
  const raw = env.MAX_GRADUATIONS?.trim();
  if (!raw || !/^\d+$/.test(raw)) return KEEPER_DEFAULT_LIMIT;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed < 1) return KEEPER_DEFAULT_LIMIT;
  return Math.min(Math.floor(parsed), KEEPER_HARD_CAP);
}

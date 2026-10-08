/**
 * Companion game constants.
 *
 * Preserved from the pre-reset shared package and kept in lockstep with the
 * Anchor program (`CARE_COOLDOWN_SECONDS`, `INITIAL_STAT_VALUE`,
 * `XP_PER_CARE_ACTION`). If the on-chain program ever changes these, this
 * file and the program must move together — never one side alone.
 */
export const MAX_STAT = 100;
export const MIN_STAT = 0;
export const INITIAL_STAT_VALUE = 72;
export const CARE_COOLDOWN_SECONDS = 30 * 60;
export const XP_PER_CARE_ACTION = 10;
export const DAILY_GOAL_REWARD_XP = 25;
export const BASE_XP_PER_LEVEL = 100;

/**
 * Vital drain while a companion is left alone, in points per hour.
 * Tuned so a well-cared pet (~72) drifts toward "needs care" over roughly a
 * day — tension for the daily loop without punishing a missed day.
 * Stats floor at 0; there is no death state.
 */
export const STAT_DECAY_PER_HOUR = {
  hunger: 2.5,
  happiness: 1.8,
  energy: 1.5,
  hygiene: 1.2,
} as const;

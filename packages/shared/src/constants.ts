export const APP_NAME = 'Pawket';
export const TAGLINE = 'A living on-chain companion game for Solana Mobile.';

export const MAX_STAT = 100;
export const MIN_STAT = 0;
export const INITIAL_STAT_VALUE = 72;
export const CARE_COOLDOWN_SECONDS = 60 * 30;
export const XP_PER_CARE_ACTION = 10;
export const DAILY_GOAL_REWARD_XP = 25;
export const BASE_XP_PER_LEVEL = 100;

/**
 * How fast each vital drains while a companion is left alone, in points/hour.
 * Tuned so a well-cared pet (72) drifts toward "needs care" over roughly a day —
 * enough tension to make the daily loop matter without ever punishing a player
 * who misses a day. Stats floor at 0; there is no death state.
 */
export const STAT_DECAY_PER_HOUR = {
  hunger: 2.5,
  happiness: 1.8,
  energy: 1.5,
  hygiene: 1.2,
} as const;

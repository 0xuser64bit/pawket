export const MAX_STAT = 100;
export const MIN_STAT = 0;
export const INITIAL_STAT_VALUE = 72;
export const CARE_COOLDOWN_SECONDS = 30 * 60;
export const XP_PER_CARE_ACTION = 10;
export const DAILY_GOAL_REWARD_XP = 25;
export const BASE_XP_PER_LEVEL = 100;

export const STAT_DECAY_PER_HOUR = {
  hunger: 2.5,
  happiness: 1.8,
  energy: 1.5,
  hygiene: 1.2,
} as const;

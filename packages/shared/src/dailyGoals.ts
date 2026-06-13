import { DAILY_GOAL_REWARD_XP } from './constants';
import { CareActionType } from './enums';
import type { DailyGoalsResponse } from './schemas';

export type DailyGoalCareAction = {
  actionType: CareActionType;
  createdAt: Date | string;
};

export type DailyRewardClaimState = {
  date: string;
  bonusXp: number;
  claimedAt: Date | string;
};

export type BuildDailyGoalsInput = {
  walletAddress: string;
  petId: string;
  careActions: DailyGoalCareAction[];
  rewardClaims?: DailyRewardClaimState[];
  now?: Date;
};

export const DAILY_GOAL_ACTIONS = [
  CareActionType.Feed,
  CareActionType.Play,
  CareActionType.Groom,
  CareActionType.Rest,
] as const;

const DAILY_GOAL_TITLES: Record<CareActionType, string> = {
  [CareActionType.Feed]: 'Feed your Pawket',
  [CareActionType.Play]: 'Play together',
  [CareActionType.Groom]: 'Groom your Pawket',
  [CareActionType.Rest]: 'Take a rest',
};

export function getUtcDateKey(date: Date = new Date()) {
  return date.toISOString().slice(0, 10);
}

function parseUtcDateKey(dateKey: string): [number, number, number] {
  const [year = 0, month = 1, day = 1] = dateKey.split('-').map(Number);
  return [year, month, day];
}

export function shiftUtcDateKey(dateKey: string, days: number) {
  const [year, month, day] = parseUtcDateKey(dateKey);
  return getUtcDateKey(new Date(Date.UTC(year, month - 1, day + days)));
}

export function getUtcDayBounds(date: Date = new Date()) {
  const today = getUtcDateKey(date);
  const [year, month, day] = parseUtcDateKey(today);
  const start = new Date(Date.UTC(year, month - 1, day));
  const end = new Date(Date.UTC(year, month - 1, day + 1));
  return { today, start, end };
}

function toIso(value: Date | string) {
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

function groupCompletedActionsByDate(careActions: DailyGoalCareAction[]) {
  const byDate = new Map<string, Set<CareActionType>>();

  for (const action of careActions) {
    const dateKey = getUtcDateKey(
      action.createdAt instanceof Date ? action.createdAt : new Date(action.createdAt),
    );
    const actions = byDate.get(dateKey) ?? new Set<CareActionType>();
    actions.add(action.actionType);
    byDate.set(dateKey, actions);
  }

  return byDate;
}

function hasAllDailyGoals(actions: Set<CareActionType> | undefined) {
  return DAILY_GOAL_ACTIONS.every((actionType) => actions?.has(actionType));
}

export function calculateCurrentDailyGoalStreak(
  careActions: DailyGoalCareAction[],
  now: Date = new Date(),
) {
  const { today } = getUtcDayBounds(now);
  const byDate = groupCompletedActionsByDate(careActions);
  let cursor = hasAllDailyGoals(byDate.get(today)) ? today : shiftUtcDateKey(today, -1);
  let streak = 0;

  while (hasAllDailyGoals(byDate.get(cursor))) {
    streak += 1;
    cursor = shiftUtcDateKey(cursor, -1);
  }

  return streak;
}

export function buildDailyGoalsResponse(input: BuildDailyGoalsInput): DailyGoalsResponse {
  const now = input.now ?? new Date();
  const { today, start, end } = getUtcDayBounds(now);
  const todayClaims = input.rewardClaims?.find((claim) => claim.date === today);
  const todayActions = input.careActions.filter((action) => {
    const createdAt =
      action.createdAt instanceof Date ? action.createdAt : new Date(action.createdAt);
    return createdAt >= start && createdAt < end;
  });

  const goals = DAILY_GOAL_ACTIONS.map((actionType) => {
    const completedAction = todayActions.find((action) => action.actionType === actionType);
    return {
      actionType,
      title: DAILY_GOAL_TITLES[actionType],
      completed: Boolean(completedAction),
      completedAt: completedAction ? toIso(completedAction.createdAt) : null,
    };
  });

  const completedGoals = goals.filter((goal) => goal.completed).length;
  const totalGoals = goals.length;
  const allGoalsCompleted = completedGoals === totalGoals;

  return {
    today,
    walletAddress: input.walletAddress,
    petId: input.petId,
    goals,
    completedGoals,
    totalGoals,
    allGoalsCompleted,
    currentStreakDays: calculateCurrentDailyGoalStreak(input.careActions, now),
    reward: allGoalsCompleted
      ? {
          type: 'bonus_xp',
          xp: todayClaims?.bonusXp ?? DAILY_GOAL_REWARD_XP,
          claimed: Boolean(todayClaims),
          claimedAt: todayClaims ? toIso(todayClaims.claimedAt) : null,
        }
      : undefined,
  };
}

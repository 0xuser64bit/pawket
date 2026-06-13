import { describe, expect, it } from 'vitest';
import { CARE_COOLDOWN_SECONDS, XP_PER_CARE_ACTION } from './constants';
import { CareActionType, PetMood, PetPersonality, PetSpecies } from './enums';
import {
  applyCareAction,
  calculateLevelFromXp,
  calculatePetMood,
  calculateXpForNextLevel,
  generateInitialPetState,
  validateCareCooldown,
} from './game';
import {
  buildDailyGoalsResponse,
  calculateCurrentDailyGoalStreak,
  getUtcDayBounds,
} from './dailyGoals';
import {
  adoptPetRequestSchema,
  carePetRequestSchema,
  dailyGoalsResponseSchema,
  petResponseSchema,
} from './schemas';

describe('core pet lifecycle domain', () => {
  it('generates a deterministic initial pet state from adoption input', () => {
    const pet = generateInitialPetState({
      walletAddress: 'DevnetDemoWallet1111111111111111111111111111',
      name: 'Nova',
      species: PetSpecies.LunaCat,
      personality: PetPersonality.Curious,
    });

    expect(pet).toMatchObject({
      name: 'Nova',
      species: PetSpecies.LunaCat,
      personality: PetPersonality.Curious,
      stats: { hunger: 72, happiness: 72, energy: 72, hygiene: 72 },
      xp: 0,
      level: 1,
      mood: PetMood.Happy,
    });
  });

  it('calculates level and next-level xp from total xp', () => {
    expect(calculateLevelFromXp(0)).toBe(1);
    expect(calculateLevelFromXp(99)).toBe(1);
    expect(calculateLevelFromXp(100)).toBe(2);
    expect(calculateLevelFromXp(250)).toBe(3);
    expect(calculateXpForNextLevel(1)).toBe(100);
    expect(calculateXpForNextLevel(3)).toBe(300);
  });

  it('derives mood from the lowest important stats', () => {
    expect(calculatePetMood({ hunger: 92, happiness: 90, energy: 88, hygiene: 91 })).toBe(
      PetMood.Radiant,
    );
    expect(calculatePetMood({ hunger: 55, happiness: 52, energy: 60, hygiene: 54 })).toBe(
      PetMood.Okay,
    );
    expect(calculatePetMood({ hunger: 15, happiness: 80, energy: 80, hygiene: 80 })).toBe(
      PetMood.Hungry,
    );
    expect(calculatePetMood({ hunger: 80, happiness: 12, energy: 80, hygiene: 80 })).toBe(
      PetMood.Lonely,
    );
    expect(calculatePetMood({ hunger: 80, happiness: 80, energy: 12, hygiene: 80 })).toBe(
      PetMood.Tired,
    );
    expect(calculatePetMood({ hunger: 80, happiness: 80, energy: 80, hygiene: 12 })).toBe(
      PetMood.Scruffy,
    );
  });

  it('applies care actions with bounded stats and xp rewards', () => {
    const base = { hunger: 65, happiness: 65, energy: 65, hygiene: 65 };

    expect(applyCareAction(base, CareActionType.Feed)).toEqual({
      stats: { hunger: 88, happiness: 67, energy: 65, hygiene: 65 },
      xpGained: XP_PER_CARE_ACTION,
    });
    expect(applyCareAction(base, CareActionType.Play)).toEqual({
      stats: { hunger: 59, happiness: 88, energy: 53, hygiene: 65 },
      xpGained: XP_PER_CARE_ACTION,
    });
    expect(applyCareAction(base, CareActionType.Groom)).toEqual({
      stats: { hunger: 65, happiness: 68, energy: 65, hygiene: 90 },
      xpGained: XP_PER_CARE_ACTION,
    });
    expect(applyCareAction({ ...base, energy: 92 }, CareActionType.Rest)).toEqual({
      stats: { hunger: 65, happiness: 65, energy: 100, hygiene: 65 },
      xpGained: XP_PER_CARE_ACTION,
    });
  });

  it('validates per-action cooldowns with remaining seconds', () => {
    const now = new Date('2026-06-14T12:00:00.000Z');
    expect(validateCareCooldown(null, CareActionType.Feed, now)).toEqual({ allowed: true });
    expect(
      validateCareCooldown(new Date(now.getTime() - 5 * 60 * 1000), CareActionType.Feed, now),
    ).toEqual({
      allowed: false,
      remainingSeconds: CARE_COOLDOWN_SECONDS - 5 * 60,
      message: 'Feed is cooling down. Try again in 25m.',
    });
    expect(
      validateCareCooldown(
        new Date(now.getTime() - CARE_COOLDOWN_SECONDS * 1000),
        CareActionType.Feed,
        now,
      ),
    ).toEqual({ allowed: true });
  });

  it('validates API payload schemas and response shapes', () => {
    const input = adoptPetRequestSchema.parse({
      walletAddress: 'DevnetDemoWallet1111111111111111111111111111',
      name: 'Nova',
      species: PetSpecies.LunaCat,
      personality: PetPersonality.Curious,
    });
    expect(input.name).toBe('Nova');
    expect(
      carePetRequestSchema.parse({ walletAddress: input.walletAddress, actionType: 'feed' }),
    ).toEqual({
      walletAddress: input.walletAddress,
      actionType: CareActionType.Feed,
    });
    const response = petResponseSchema.parse({
      pet: {
        id: 'pet_1',
        ownerWalletAddress: input.walletAddress,
        name: 'Nova',
        species: PetSpecies.LunaCat,
        personality: PetPersonality.Curious,
        stats: { hunger: 72, happiness: 72, energy: 72, hygiene: 72 },
        xp: 0,
        level: 1,
        mood: PetMood.Happy,
        createdAt: '2026-06-14T12:00:00.000Z',
        updatedAt: '2026-06-14T12:00:00.000Z',
        lastCaredAt: null,
        lastCareActionType: null,
      },
    });
    expect(response.pet?.name).toBe('Nova');
  });

  it('builds deterministic UTC daily goals from care actions', () => {
    const response = buildDailyGoalsResponse({
      walletAddress: 'DevnetDemoWallet1111111111111111111111111111',
      petId: 'pet_1',
      now: new Date('2026-06-14T23:30:00.000Z'),
      careActions: [
        { actionType: CareActionType.Feed, createdAt: '2026-06-13T23:59:59.000Z' },
        { actionType: CareActionType.Feed, createdAt: '2026-06-14T00:00:00.000Z' },
        { actionType: CareActionType.Play, createdAt: '2026-06-14T09:00:00.000Z' },
      ],
    });

    expect(response.today).toBe('2026-06-14');
    expect(response.goals.map((goal) => goal.actionType)).toEqual([
      CareActionType.Feed,
      CareActionType.Play,
      CareActionType.Groom,
      CareActionType.Rest,
    ]);
    expect(response.completedGoals).toBe(2);
    expect(response.totalGoals).toBe(4);
    expect(response.allGoalsCompleted).toBe(false);
    expect(response.reward).toBeUndefined();
    expect(dailyGoalsResponseSchema.parse(response)).toEqual(response);
  });

  it('exposes a claimable reward once all daily goals are complete', () => {
    const response = buildDailyGoalsResponse({
      walletAddress: 'DevnetDemoWallet1111111111111111111111111111',
      petId: 'pet_1',
      now: new Date('2026-06-14T12:00:00.000Z'),
      careActions: [
        { actionType: CareActionType.Feed, createdAt: '2026-06-14T01:00:00.000Z' },
        { actionType: CareActionType.Play, createdAt: '2026-06-14T02:00:00.000Z' },
        { actionType: CareActionType.Groom, createdAt: '2026-06-14T03:00:00.000Z' },
        { actionType: CareActionType.Rest, createdAt: '2026-06-14T04:00:00.000Z' },
      ],
    });

    expect(response.completedGoals).toBe(4);
    expect(response.allGoalsCompleted).toBe(true);
    expect(response.currentStreakDays).toBe(1);
    expect(response.reward).toEqual({
      type: 'bonus_xp',
      xp: 25,
      claimed: false,
      claimedAt: null,
    });
  });

  it('counts the current streak from today or yesterday in UTC', () => {
    const fullDay = (date: string) =>
      [CareActionType.Feed, CareActionType.Play, CareActionType.Groom, CareActionType.Rest].map(
        (actionType, index) => ({
          actionType,
          createdAt: `${date}T0${index}:00:00.000Z`,
        }),
      );

    expect(
      calculateCurrentDailyGoalStreak(
        [...fullDay('2026-06-12'), ...fullDay('2026-06-13')],
        new Date('2026-06-14T12:00:00.000Z'),
      ),
    ).toBe(2);
    expect(
      calculateCurrentDailyGoalStreak(
        [...fullDay('2026-06-12'), ...fullDay('2026-06-13'), ...fullDay('2026-06-14').slice(0, 3)],
        new Date('2026-06-14T12:00:00.000Z'),
      ),
    ).toBe(2);
    expect(
      calculateCurrentDailyGoalStreak(
        [...fullDay('2026-06-13'), ...fullDay('2026-06-14')],
        new Date('2026-06-14T12:00:00.000Z'),
      ),
    ).toBe(2);
    expect(getUtcDayBounds(new Date('2026-06-14T23:59:00.000Z')).today).toBe('2026-06-14');
  });
});

import { describe, expect, it } from 'vitest';
import { CareActionType, PetMood } from './enums';
import { applyCareAction, calculateLevel, calculateMood } from './game';

describe('game utilities', () => {
  it('calculates mood from balanced stats', () =>
    expect(calculateMood({ hunger: 90, happiness: 88, energy: 80, hygiene: 86 })).toBe(
      PetMood.Radiant,
    ));
  it('levels from xp monotonically', () =>
    expect(calculateLevel(200)).toBeGreaterThan(calculateLevel(0)));
  it('applies care actions within bounds', () => {
    const next = applyCareAction(
      { hunger: 95, happiness: 50, energy: 50, hygiene: 50, xp: 0, level: 1 },
      CareActionType.Feed,
    );
    expect(next.hunger).toBe(100);
    expect(next.xp).toBe(10);
  });
});

import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  CareActionType,
  PassportEventType,
  PetMood,
  PetPersonality,
  PetSpecies,
} from '@pawket/shared';
import { PawketApiClient } from './apiClient';

const walletAddress = 'DevnetDemoWallet1111111111111111111111111111';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('PawketApiClient daily goals', () => {
  it('fetches daily goals with an encoded wallet query', async () => {
    const fetchMock = vi.fn(async () => {
      return new Response(
        JSON.stringify({
          today: '2026-06-14',
          walletAddress,
          petId: 'pet_1',
          goals: [
            {
              actionType: CareActionType.Feed,
              title: 'Feed your Pawket',
              completed: false,
              completedAt: null,
            },
          ],
          completedGoals: 0,
          totalGoals: 4,
          allGoalsCompleted: false,
          currentStreakDays: 0,
        }),
        { status: 200, headers: { 'content-type': 'application/json' } },
      );
    });
    vi.stubGlobal('fetch', fetchMock);

    const client = new PawketApiClient('http://localhost:8787');
    const response = await client.getDailyGoals({ petId: 'pet_1', walletAddress });

    expect(response.completedGoals).toBe(0);
    expect(fetchMock).toHaveBeenCalledWith(
      `http://localhost:8787/pets/pet_1/daily-goals?walletAddress=${walletAddress}`,
      expect.objectContaining({
        headers: expect.objectContaining({ 'content-type': 'application/json' }),
      }),
    );
  });

  it('claims daily rewards with a validated JSON body', async () => {
    const fetchMock = vi.fn(async () => {
      return new Response(
        JSON.stringify({
          pet: {
            id: 'pet_1',
            ownerWalletAddress: walletAddress,
            name: 'Nova',
            species: PetSpecies.LunaCat,
            personality: PetPersonality.Curious,
            stats: { hunger: 95, happiness: 95, energy: 95, hygiene: 95 },
            xp: 65,
            level: 1,
            mood: PetMood.Radiant,
            createdAt: '2026-06-14T00:00:00.000Z',
            updatedAt: '2026-06-14T12:00:00.000Z',
            lastCaredAt: '2026-06-14T11:00:00.000Z',
            lastCareActionType: CareActionType.Rest,
          },
          dailyGoals: {
            today: '2026-06-14',
            walletAddress,
            petId: 'pet_1',
            goals: [],
            completedGoals: 4,
            totalGoals: 4,
            allGoalsCompleted: true,
            currentStreakDays: 1,
            reward: {
              type: 'bonus_xp',
              xp: 25,
              claimed: true,
              claimedAt: '2026-06-14T12:00:00.000Z',
            },
          },
          passportEvent: {
            id: 'evt_1',
            petId: 'pet_1',
            type: PassportEventType.DailyReward,
            title: 'Claimed daily goals reward for 2026-06-14',
            description: '+25 bonus XP for completing every daily care goal.',
            metadata: { bonusXp: 25 },
            createdAt: '2026-06-14T12:00:00.000Z',
          },
        }),
        { status: 200, headers: { 'content-type': 'application/json' } },
      );
    });
    vi.stubGlobal('fetch', fetchMock);

    const client = new PawketApiClient('http://localhost:8787');
    const response = await client.claimDailyReward({ petId: 'pet_1', walletAddress });
    const firstCall = (fetchMock.mock.calls as unknown as [string, RequestInit][])[0];
    if (!firstCall) throw new Error('Expected fetch to be called.');
    const [, init] = firstCall;

    expect(response.dailyGoals.reward?.claimed).toBe(true);
    expect(init.method).toBe('POST');
    expect(init.body).toBe(JSON.stringify({ walletAddress }));
  });
});

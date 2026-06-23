import { describe, expect, it } from 'vitest';
import { CareActionType, PetPersonality, PetSpecies } from '@pawket/shared';
import { createApp } from './app';
import { InMemoryPetRepository, PetService } from './services/pet.service';

const walletAddress = 'DevnetDemoWallet1111111111111111111111111111';
const otherWalletAddress = 'OtherDevnetDemoWallet111111111111111111111111';

function testApp() {
  return createApp({ petService: new PetService(new InMemoryPetRepository()) });
}

function clockedApp(now: () => Date) {
  return createApp({ petService: new PetService(new InMemoryPetRepository(now), now) });
}

async function adoptTestPet(app: ReturnType<typeof testApp>) {
  const adopt = await app.request('/pets/adopt', {
    method: 'POST',
    body: JSON.stringify({
      walletAddress,
      name: 'Nova',
      species: PetSpecies.LunaCat,
      personality: PetPersonality.Curious,
    }),
    headers: { 'content-type': 'application/json' },
  });
  expect(adopt.status).toBe(201);
  return (await adopt.json()) as { pet: { id: string; xp: number } };
}

async function care(app: ReturnType<typeof testApp>, petId: string, actionType: CareActionType) {
  const response = await app.request(`/pets/${petId}/care`, {
    method: 'POST',
    body: JSON.stringify({ walletAddress, actionType }),
    headers: { 'content-type': 'application/json' },
  });
  expect(response.status).toBe(200);
  return response;
}

describe('api', () => {
  it('responds to health', async () => {
    const app = testApp();
    const res = await app.request('/health');
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ ok: true, service: 'pawket-api' });
  });

  it('validates adopt input', async () => {
    const app = testApp();
    const res = await app.request('/pets/adopt', {
      method: 'POST',
      body: JSON.stringify({}),
      headers: { 'content-type': 'application/json' },
    });
    expect(res.status).toBe(400);
    expect(await res.json()).toHaveProperty('error.message');
  });

  it('runs the adopt -> get -> care -> passport lifecycle', async () => {
    const app = testApp();

    const missing = await app.request(`/pets/${walletAddress}`);
    expect(missing.status).toBe(200);
    expect(await missing.json()).toEqual({ pet: null });

    const adopt = await app.request('/pets/adopt', {
      method: 'POST',
      body: JSON.stringify({
        walletAddress,
        name: 'Nova',
        species: PetSpecies.LunaCat,
        personality: PetPersonality.Curious,
      }),
      headers: { 'content-type': 'application/json' },
    });
    expect(adopt.status).toBe(201);
    const adopted = await adopt.json();
    expect(adopted.pet).toMatchObject({
      name: 'Nova',
      ownerWalletAddress: walletAddress,
      level: 1,
      xp: 0,
    });

    const found = await app.request(`/pets/${walletAddress}`);
    expect(found.status).toBe(200);
    expect((await found.json()).pet.id).toBe(adopted.pet.id);

    const care = await app.request(`/pets/${adopted.pet.id}/care`, {
      method: 'POST',
      body: JSON.stringify({ walletAddress, actionType: CareActionType.Feed }),
      headers: { 'content-type': 'application/json' },
    });
    expect(care.status).toBe(200);
    const cared = await care.json();
    expect(cared.pet.xp).toBe(10);
    expect(cared.pet.stats.hunger).toBeGreaterThan(adopted.pet.stats.hunger);
    expect(cared.pet.lastCareActionType).toBe(CareActionType.Feed);
    expect(cared.passportEvent).toMatchObject({ type: 'care_action' });

    const passport = await app.request(`/pets/${adopted.pet.id}/passport`);
    expect(passport.status).toBe(200);
    const timeline = await passport.json();
    expect(timeline.events).toHaveLength(2);
    expect(timeline.events.map((event: { type: string }) => event.type)).toEqual([
      'care_action',
      'adopted',
    ]);
  });

  it('drains vitals while a pet is left alone and care lands on current stats', async () => {
    let current = new Date('2026-06-14T00:00:00.000Z');
    const app = clockedApp(() => current);

    const adopt = await app.request('/pets/adopt', {
      method: 'POST',
      body: JSON.stringify({
        walletAddress,
        name: 'Nova',
        species: PetSpecies.LunaCat,
        personality: PetPersonality.Curious,
      }),
      headers: { 'content-type': 'application/json' },
    });
    const { pet } = await adopt.json();
    expect(pet.stats.hunger).toBe(72);

    // Twelve hours later the same pet has visibly drained (read is lazy/no-write).
    current = new Date('2026-06-14T12:00:00.000Z');
    const reread = await app.request(`/pets/${walletAddress}`);
    const drained = (await reread.json()).pet;
    expect(drained.stats.hunger).toBe(42); // 72 - 2.5*12
    expect(drained.stats.energy).toBe(54); // 72 - 1.5*12

    // Feeding lands on the decayed value (42 -> 65), not the original 72.
    const fed = await app.request(`/pets/${pet.id}/care`, {
      method: 'POST',
      body: JSON.stringify({ walletAddress, actionType: CareActionType.Feed }),
      headers: { 'content-type': 'application/json' },
    });
    const afterFeed = (await fed.json()).pet;
    expect(afterFeed.stats.hunger).toBe(65); // 42 + 23
    expect(afterFeed.statsUpdatedAt).toBe('2026-06-14T12:00:00.000Z');
  });

  it('rejects care from non-owner wallets and reports cooldowns clearly', async () => {
    const app = testApp();
    const adopt = await app.request('/pets/adopt', {
      method: 'POST',
      body: JSON.stringify({
        walletAddress,
        name: 'Nova',
        species: PetSpecies.LunaCat,
        personality: PetPersonality.Curious,
      }),
      headers: { 'content-type': 'application/json' },
    });
    const { pet } = await adopt.json();

    const forbidden = await app.request(`/pets/${pet.id}/care`, {
      method: 'POST',
      body: JSON.stringify({
        walletAddress: otherWalletAddress,
        actionType: CareActionType.Feed,
      }),
      headers: { 'content-type': 'application/json' },
    });
    expect(forbidden.status).toBe(403);

    const first = await app.request(`/pets/${pet.id}/care`, {
      method: 'POST',
      body: JSON.stringify({ walletAddress, actionType: CareActionType.Feed }),
      headers: { 'content-type': 'application/json' },
    });
    expect(first.status).toBe(200);

    const second = await app.request(`/pets/${pet.id}/care`, {
      method: 'POST',
      body: JSON.stringify({ walletAddress, actionType: CareActionType.Feed }),
      headers: { 'content-type': 'application/json' },
    });
    expect(second.status).toBe(409);
    expect(await second.json()).toMatchObject({
      error: { code: 'CARE_COOLDOWN_ACTIVE' },
    });
  });

  it('reports daily goals and rejects incomplete reward claims', async () => {
    const app = testApp();
    const { pet } = await adoptTestPet(app);

    const goals = await app.request(
      `/pets/${pet.id}/daily-goals?walletAddress=${encodeURIComponent(walletAddress)}`,
    );
    expect(goals.status).toBe(200);
    expect(await goals.json()).toMatchObject({
      walletAddress,
      petId: pet.id,
      completedGoals: 0,
      totalGoals: 4,
      allGoalsCompleted: false,
      currentStreakDays: 0,
    });

    const claim = await app.request(`/pets/${pet.id}/daily-goals/claim`, {
      method: 'POST',
      body: JSON.stringify({ walletAddress }),
      headers: { 'content-type': 'application/json' },
    });
    expect(claim.status).toBe(409);
    expect(await claim.json()).toMatchObject({
      error: { code: 'DAILY_GOALS_INCOMPLETE' },
    });
  });

  it('authorizes daily goals by pet owner and handles missing pets', async () => {
    const app = testApp();
    const { pet } = await adoptTestPet(app);

    const forbiddenGoals = await app.request(
      `/pets/${pet.id}/daily-goals?walletAddress=${encodeURIComponent(otherWalletAddress)}`,
    );
    expect(forbiddenGoals.status).toBe(403);

    const forbiddenClaim = await app.request(`/pets/${pet.id}/daily-goals/claim`, {
      method: 'POST',
      body: JSON.stringify({ walletAddress: otherWalletAddress }),
      headers: { 'content-type': 'application/json' },
    });
    expect(forbiddenClaim.status).toBe(403);

    const missingClaim = await app.request('/pets/missing_pet/daily-goals/claim', {
      method: 'POST',
      body: JSON.stringify({ walletAddress }),
      headers: { 'content-type': 'application/json' },
    });
    expect(missingClaim.status).toBe(404);
  });

  it('claims a completed daily reward once and writes a passport event', async () => {
    const app = testApp();
    const { pet } = await adoptTestPet(app);

    await care(app, pet.id, CareActionType.Feed);
    await care(app, pet.id, CareActionType.Play);
    await care(app, pet.id, CareActionType.Groom);
    await care(app, pet.id, CareActionType.Rest);

    const ready = await app.request(
      `/pets/${pet.id}/daily-goals?walletAddress=${encodeURIComponent(walletAddress)}`,
    );
    expect(ready.status).toBe(200);
    const readyGoals = await ready.json();
    expect(readyGoals).toMatchObject({
      completedGoals: 4,
      totalGoals: 4,
      allGoalsCompleted: true,
      currentStreakDays: 1,
      reward: { type: 'bonus_xp', xp: 25, claimed: false, claimedAt: null },
    });

    const claim = await app.request(`/pets/${pet.id}/daily-goals/claim`, {
      method: 'POST',
      body: JSON.stringify({ walletAddress }),
      headers: { 'content-type': 'application/json' },
    });
    expect(claim.status).toBe(200);
    const claimed = await claim.json();
    expect(claimed.pet.xp).toBe(65);
    expect(claimed.dailyGoals).toMatchObject({
      completedGoals: 4,
      allGoalsCompleted: true,
      reward: { type: 'bonus_xp', xp: 25, claimed: true },
    });
    expect(claimed.passportEvent).toMatchObject({
      type: 'daily_reward',
      metadata: { bonusXp: 25, completedGoals: 4, totalGoals: 4 },
    });

    const duplicate = await app.request(`/pets/${pet.id}/daily-goals/claim`, {
      method: 'POST',
      body: JSON.stringify({ walletAddress }),
      headers: { 'content-type': 'application/json' },
    });
    expect(duplicate.status).toBe(409);
    expect(await duplicate.json()).toMatchObject({
      error: { code: 'DAILY_REWARD_ALREADY_CLAIMED' },
    });

    const passport = await app.request(`/pets/${pet.id}/passport`);
    const timeline = await passport.json();
    expect(timeline.events.map((event: { type: string }) => event.type)).toEqual([
      'daily_reward',
      'care_action',
      'care_action',
      'care_action',
      'care_action',
      'adopted',
    ]);
  });
});

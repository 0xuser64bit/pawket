import { describe, expect, it } from 'vitest';
import { CareActionType, PetPersonality, PetSpecies } from '@pawket/shared';
import { createApp } from './app';
import { InMemoryPetRepository, PetService } from './services/pet.service';

const walletAddress = 'DevnetDemoWallet1111111111111111111111111111';

function testApp() {
  return createApp({ petService: new PetService(new InMemoryPetRepository()) });
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
        walletAddress: 'OtherDevnetDemoWallet111111111111111111111111',
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
});

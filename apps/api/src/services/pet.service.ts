import { applyCareAction, type AdoptPetInput, type CareActionInput } from '@pawket/shared';

export class PetService {
  async getPets(walletAddress: string) {
    return {
      walletAddress,
      pets: [] as unknown[],
      note: 'Database read not enabled until Prisma migration is applied.',
    };
  }
  async adoptPet(input: AdoptPetInput) {
    return {
      status: 'accepted',
      pet: { ...input, level: 1, xp: 0, hunger: 70, happiness: 70, energy: 70, hygiene: 70 },
      note: 'Persist via Prisma and Anchor transaction in Phase 1.',
    };
  }
  async careForPet(petId: string, input: CareActionInput) {
    const updated = applyCareAction(
      { hunger: 70, happiness: 70, energy: 70, hygiene: 70, xp: 0, level: 1 },
      input.action,
    );
    return {
      petId,
      walletAddress: input.walletAddress,
      updated,
      note: 'Authoritative cooldown and ownership checks live in Anchor + DB implementation.',
    };
  }
  async getPassport(petId: string) {
    return { petId, events: [], note: 'Passport timeline persists after DB migration.' };
  }
}

import { Prisma, PrismaClient } from '@prisma/client';
import {
  applyCareAction,
  calculateLevelFromXp,
  calculatePetMood,
  generateInitialPetState,
  validateCareCooldown,
  type AdoptPetInput,
  type CarePetInput,
  type CarePetResponse,
  type PassportResponse,
  type Pet,
  type PetPassportEvent,
  type PetResponse,
  type PetStats,
} from '@pawket/shared';
import { PassportEventType } from '@pawket/shared';
import { prisma } from '../db';

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly details?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

type DbPet = {
  id: string;
  ownerWalletAddress: string;
  name: string;
  species: Pet['species'];
  personality: Pet['personality'];
  hunger: number;
  happiness: number;
  energy: number;
  hygiene: number;
  xp: number;
  level: number;
  createdAt: Date;
  updatedAt: Date;
  lastCaredAt: Date | null;
  lastCareActionType: Pet['lastCareActionType'];
};

type CreatePetRecord = {
  ownerWalletAddress: string;
  name: string;
  species: Pet['species'];
  personality: Pet['personality'];
  stats: PetStats;
  xp: number;
  level: number;
};

type UpdateCareRecord = {
  stats: PetStats;
  xp: number;
  level: number;
  actionType: CarePetInput['actionType'];
  xpGained: number;
  passportEvent: Omit<PetPassportEvent, 'id' | 'createdAt'>;
};

export interface PetRepository {
  findActivePetByWallet(walletAddress: string): Promise<DbPet | null>;
  findPetById(petId: string): Promise<DbPet | null>;
  createPetWithAdoptionEvent(input: CreatePetRecord): Promise<DbPet>;
  updatePetAfterCare(
    petId: string,
    input: UpdateCareRecord,
  ): Promise<{
    pet: DbPet;
    passportEvent: PetPassportEvent;
  }>;
  listPassportEvents(petId: string): Promise<PetPassportEvent[]>;
  findLastCareActionAt(petId: string, actionType: CarePetInput['actionType']): Promise<Date | null>;
}

function iso(date: Date) {
  return date.toISOString();
}

function toPet(record: DbPet): Pet {
  const stats = {
    hunger: record.hunger,
    happiness: record.happiness,
    energy: record.energy,
    hygiene: record.hygiene,
  };

  return {
    id: record.id,
    ownerWalletAddress: record.ownerWalletAddress,
    name: record.name,
    species: record.species,
    personality: record.personality,
    stats,
    xp: record.xp,
    level: record.level,
    mood: calculatePetMood(stats),
    createdAt: iso(record.createdAt),
    updatedAt: iso(record.updatedAt),
    lastCaredAt: record.lastCaredAt ? iso(record.lastCaredAt) : null,
    lastCareActionType: record.lastCareActionType,
  };
}

function adoptionEventTitle(name: string) {
  return `${name} joined your Pawket`;
}

function careEventTitle(actionType: CarePetInput['actionType']) {
  const labels: Record<CarePetInput['actionType'], string> = {
    feed: 'Fed',
    play: 'Played with',
    groom: 'Groomed',
    rest: 'Rested',
  };
  return `${labels[actionType]} your Pawket`;
}

export class PetService {
  constructor(private readonly repository: PetRepository = new PrismaPetRepository()) {}

  async getPetByWallet(walletAddress: string): Promise<PetResponse> {
    const pet = await this.repository.findActivePetByWallet(walletAddress);
    return { pet: pet ? toPet(pet) : null };
  }

  async adoptPet(input: AdoptPetInput): Promise<{ pet: Pet }> {
    const existing = await this.repository.findActivePetByWallet(input.walletAddress);
    if (existing) {
      throw new ApiError(409, 'ACTIVE_PET_EXISTS', 'This wallet already has an active pet.');
    }

    const initial = generateInitialPetState(input);
    const created = await this.repository.createPetWithAdoptionEvent({
      ownerWalletAddress: initial.ownerWalletAddress,
      name: initial.name,
      species: initial.species,
      personality: initial.personality,
      stats: initial.stats,
      xp: initial.xp,
      level: initial.level,
    });

    return { pet: toPet(created) };
  }

  async careForPet(petId: string, input: CarePetInput): Promise<CarePetResponse> {
    const pet = await this.repository.findPetById(petId);
    if (!pet) throw new ApiError(404, 'PET_NOT_FOUND', 'Pet not found.');
    if (pet.ownerWalletAddress !== input.walletAddress) {
      throw new ApiError(403, 'NOT_PET_OWNER', 'That wallet does not own this pet.');
    }

    const lastActionAt = await this.repository.findLastCareActionAt(petId, input.actionType);
    const cooldown = validateCareCooldown(lastActionAt, input.actionType);
    if (!cooldown.allowed) {
      throw new ApiError(409, 'CARE_COOLDOWN_ACTIVE', cooldown.message, {
        remainingSeconds: cooldown.remainingSeconds,
      });
    }

    const currentStats = {
      hunger: pet.hunger,
      happiness: pet.happiness,
      energy: pet.energy,
      hygiene: pet.hygiene,
    };
    const { stats, xpGained } = applyCareAction(currentStats, input.actionType);
    const xp = pet.xp + xpGained;
    const level = calculateLevelFromXp(xp);
    const passportEvent = {
      petId,
      type: level > pet.level ? PassportEventType.LevelUp : PassportEventType.CareAction,
      title: level > pet.level ? `Reached level ${level}` : careEventTitle(input.actionType),
      description:
        level > pet.level
          ? `Your Pawket grew after a ${input.actionType} care action.`
          : `+${xpGained} XP from ${input.actionType}.`,
      metadata: { actionType: input.actionType, xpGained, level },
    };

    const updated = await this.repository.updatePetAfterCare(petId, {
      stats,
      xp,
      level,
      actionType: input.actionType,
      xpGained,
      passportEvent,
    });

    return { pet: toPet(updated.pet), passportEvent: updated.passportEvent };
  }

  async getPassport(petId: string): Promise<PassportResponse> {
    const pet = await this.repository.findPetById(petId);
    if (!pet) throw new ApiError(404, 'PET_NOT_FOUND', 'Pet not found.');
    return { petId, events: await this.repository.listPassportEvents(petId) };
  }

  // Backwards-compatible name from the foundation scaffold.
  async getPets(walletAddress: string) {
    return this.getPetByWallet(walletAddress);
  }
}

export class PrismaPetRepository implements PetRepository {
  constructor(private readonly client: PrismaClient = prisma) {}

  private mapPet(row: {
    id: string;
    name: string;
    species: string;
    personality: string;
    hunger: number;
    happiness: number;
    energy: number;
    hygiene: number;
    xp: number;
    level: number;
    createdAt: Date;
    updatedAt: Date;
    lastCaredAt: Date | null;
    lastCareActionType: string | null;
    owner: { walletAddress: string };
  }): DbPet {
    return {
      id: row.id,
      ownerWalletAddress: row.owner.walletAddress,
      name: row.name,
      species: row.species as Pet['species'],
      personality: row.personality as Pet['personality'],
      hunger: row.hunger,
      happiness: row.happiness,
      energy: row.energy,
      hygiene: row.hygiene,
      xp: row.xp,
      level: row.level,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      lastCaredAt: row.lastCaredAt,
      lastCareActionType: row.lastCareActionType as Pet['lastCareActionType'],
    };
  }

  async findActivePetByWallet(walletAddress: string) {
    const row = await this.client.pet.findFirst({
      where: { owner: { walletAddress }, active: true },
      include: { owner: true },
      orderBy: { createdAt: 'desc' },
    });
    return row ? this.mapPet(row) : null;
  }

  async findPetById(petId: string) {
    const row = await this.client.pet.findUnique({
      where: { id: petId },
      include: { owner: true },
    });
    return row ? this.mapPet(row) : null;
  }

  async createPetWithAdoptionEvent(input: CreatePetRecord) {
    return this.client.$transaction(async (tx) => {
      const user = await tx.user.upsert({
        where: { walletAddress: input.ownerWalletAddress },
        update: {},
        create: { walletAddress: input.ownerWalletAddress },
      });
      const pet = await tx.pet.create({
        data: {
          ownerId: user.id,
          name: input.name,
          species: input.species,
          personality: input.personality,
          hunger: input.stats.hunger,
          happiness: input.stats.happiness,
          energy: input.stats.energy,
          hygiene: input.stats.hygiene,
          xp: input.xp,
          level: input.level,
          passportEvents: {
            create: {
              type: PassportEventType.Adopted,
              title: adoptionEventTitle(input.name),
              description: `${input.name} was adopted.`,
              metadata: { species: input.species, personality: input.personality },
            },
          },
        },
        include: { owner: true },
      });
      return this.mapPet(pet);
    });
  }

  async updatePetAfterCare(petId: string, input: UpdateCareRecord) {
    return this.client.$transaction(async (tx) => {
      await tx.petCareAction.create({
        data: { petId, action: input.actionType, xpGained: input.xpGained },
      });
      const event = await tx.petPassportEvent.create({
        data: {
          petId,
          type: input.passportEvent.type,
          title: input.passportEvent.title,
          description: input.passportEvent.description,
          ...(input.passportEvent.metadata
            ? { metadata: input.passportEvent.metadata as Prisma.InputJsonObject }
            : {}),
        },
      });
      const pet = await tx.pet.update({
        where: { id: petId },
        data: {
          hunger: input.stats.hunger,
          happiness: input.stats.happiness,
          energy: input.stats.energy,
          hygiene: input.stats.hygiene,
          xp: input.xp,
          level: input.level,
          lastCaredAt: event.createdAt,
          lastCareActionType: input.actionType,
        },
        include: { owner: true },
      });
      return { pet: this.mapPet(pet), passportEvent: this.mapPassportEvent(event) };
    });
  }

  async listPassportEvents(petId: string) {
    const rows = await this.client.petPassportEvent.findMany({
      where: { petId },
      orderBy: { createdAt: 'desc' },
    });
    return rows.map((row) => this.mapPassportEvent(row));
  }

  async findLastCareActionAt(petId: string, actionType: CarePetInput['actionType']) {
    const row = await this.client.petCareAction.findFirst({
      where: { petId, action: actionType },
      orderBy: { createdAt: 'desc' },
    });
    return row?.createdAt ?? null;
  }

  private mapPassportEvent(row: {
    id: string;
    petId: string;
    type: string;
    title: string;
    description: string | null;
    metadata: unknown;
    createdAt: Date;
  }): PetPassportEvent {
    return {
      id: row.id,
      petId: row.petId,
      type: row.type as PassportEventType,
      title: row.title,
      description: row.description,
      metadata:
        row.metadata && typeof row.metadata === 'object' && !Array.isArray(row.metadata)
          ? (row.metadata as Record<string, unknown>)
          : null,
      createdAt: iso(row.createdAt),
    };
  }
}

let idCounter = 0;
function nextId(prefix: string) {
  idCounter += 1;
  return `${prefix}_${idCounter}`;
}

export class InMemoryPetRepository implements PetRepository {
  private readonly pets = new Map<string, DbPet>();
  private readonly careActions: {
    petId: string;
    action: CarePetInput['actionType'];
    createdAt: Date;
  }[] = [];
  private readonly events: PetPassportEvent[] = [];

  async findActivePetByWallet(walletAddress: string) {
    return [...this.pets.values()].find((pet) => pet.ownerWalletAddress === walletAddress) ?? null;
  }

  async findPetById(petId: string) {
    return this.pets.get(petId) ?? null;
  }

  async createPetWithAdoptionEvent(input: CreatePetRecord) {
    const now = new Date();
    const pet: DbPet = {
      id: nextId('pet'),
      ownerWalletAddress: input.ownerWalletAddress,
      name: input.name,
      species: input.species,
      personality: input.personality,
      hunger: input.stats.hunger,
      happiness: input.stats.happiness,
      energy: input.stats.energy,
      hygiene: input.stats.hygiene,
      xp: input.xp,
      level: input.level,
      createdAt: now,
      updatedAt: now,
      lastCaredAt: null,
      lastCareActionType: null,
    };
    this.pets.set(pet.id, pet);
    this.events.push({
      id: nextId('evt'),
      petId: pet.id,
      type: PassportEventType.Adopted,
      title: adoptionEventTitle(input.name),
      description: `${input.name} was adopted.`,
      metadata: { species: input.species, personality: input.personality },
      createdAt: iso(now),
    });
    return pet;
  }

  async updatePetAfterCare(petId: string, input: UpdateCareRecord) {
    const pet = this.pets.get(petId);
    if (!pet) throw new ApiError(404, 'PET_NOT_FOUND', 'Pet not found.');
    const now = new Date();
    this.careActions.push({ petId, action: input.actionType, createdAt: now });
    const event: PetPassportEvent = {
      ...input.passportEvent,
      id: nextId('evt'),
      createdAt: iso(now),
    };
    this.events.push(event);
    const updated: DbPet = {
      ...pet,
      hunger: input.stats.hunger,
      happiness: input.stats.happiness,
      energy: input.stats.energy,
      hygiene: input.stats.hygiene,
      xp: input.xp,
      level: input.level,
      updatedAt: now,
      lastCaredAt: now,
      lastCareActionType: input.actionType,
    };
    this.pets.set(petId, updated);
    return { pet: updated, passportEvent: event };
  }

  async listPassportEvents(petId: string) {
    return this.events
      .filter((event) => event.petId === petId)
      .sort((left, right) => Date.parse(right.createdAt) - Date.parse(left.createdAt));
  }

  async findLastCareActionAt(petId: string, actionType: CarePetInput['actionType']) {
    return (
      this.careActions
        .filter((action) => action.petId === petId && action.action === actionType)
        .sort((left, right) => right.createdAt.getTime() - left.createdAt.getTime())[0]
        ?.createdAt ?? null
    );
  }
}
